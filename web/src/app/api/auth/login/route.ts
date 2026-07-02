import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signToken, SESSION_COOKIE } from '@/lib/auth'
import { findUserByEmail, touchLastLogin } from '@/lib/users'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}))

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  const record = await findUserByEmail(String(email))
  if (!record || record.status === 'disabled') {
    await logAudit({ action: 'auth.login_failed', actorEmail: String(email) })
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
  }

  const valid = await bcrypt.compare(String(password), record.passwordHash)
  if (!valid) {
    await logAudit({
      action: 'auth.login_failed',
      actorId: record.id,
      actorEmail: record.email,
    })
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
  }

  const { passwordHash: _drop, ...user } = record
  void _drop

  await touchLastLogin(user.id)
  await logAudit({
    action: 'auth.login',
    actorId: user.id,
    actorEmail: user.email,
  })

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
