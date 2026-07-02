import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { updateUserPassword, verifyUserPassword } from '@/lib/users'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json().catch(() => ({}))
  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: 'currentPassword and newPassword are required.' },
      { status: 400 },
    )
  }
  if (String(newPassword).length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters.' },
      { status: 400 },
    )
  }

  const ok = await verifyUserPassword(session.sub, String(currentPassword))
  if (!ok) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 })
  }

  try {
    await updateUserPassword(session.sub, String(newPassword))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update password.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  await logAudit({
    action: 'user.password_change',
    actorId: session.sub,
    actorEmail: session.email,
    targetType: 'user',
    targetId: session.sub,
  })

  return NextResponse.json({ ok: true })
}
