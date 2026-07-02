import { NextRequest, NextResponse } from 'next/server'
import { requireRole, isNextResponse } from '@/lib/auth'
import { getUserById, updateUserPassword } from '@/lib/users'
import { logAudit } from '@/lib/audit'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = requireRole(req, 'admin')
  if (isNextResponse(session)) return session

  const { newPassword } = await req.json().catch(() => ({}))
  if (!newPassword) {
    return NextResponse.json({ error: 'newPassword is required.' }, { status: 400 })
  }
  if (String(newPassword).length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400 },
    )
  }

  const target = await getUserById(params.id)
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await updateUserPassword(params.id, String(newPassword))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update password.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  await logAudit({
    action: 'user.password_reset',
    actorId: session.sub,
    actorEmail: session.email,
    targetType: 'user',
    targetId: params.id,
    meta: { targetEmail: target.email },
  })

  return NextResponse.json({ ok: true })
}
