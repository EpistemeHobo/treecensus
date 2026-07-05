import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signToken, SESSION_COOKIE } from '@/lib/auth'
import { findUserByEmail, touchLastLogin } from '@/lib/users'
import { logAudit } from '@/lib/audit'

// Non-critical side effects (audit log, last-login stamp) must never break the
// login response — e.g. BigQuery blocks UPDATE on rows still in the streaming
// buffer for ~30 min after a user is seeded.
function safe(p: Promise<unknown>): Promise<void> {
  return Promise.resolve(p).then(() => undefined).catch(err => {
    console.error('[login] non-critical side effect failed:', err)
  })
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}))

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  const record = await findUserByEmail(String(email))
  if (!record || record.status === 'disabled') {
    await safe(logAudit({ action: 'auth.login_failed', actorEmail: String(email) }))
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
  }

  const valid = await bcrypt.compare(String(password), record.passwordHash)
  if (!valid) {
    await safe(logAudit({
      action: 'auth.login_failed',
      actorId: record.id,
      actorEmail: record.email,
    }))
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
  }

  const { passwordHash: _drop, ...user } = record
  void _drop

  await safe(touchLastLogin(user.id))
  await safe(logAudit({
    action: 'auth.login',
    actorId: user.id,
    actorEmail: user.email,
  }))

  const token = signToken(user)
  const res = NextResponse.json({ user })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 12 * 3600,
  })
  return res
}
