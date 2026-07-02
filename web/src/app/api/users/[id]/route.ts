import { NextRequest, NextResponse } from 'next/server'
import { requireRole, isNextResponse } from '@/lib/auth'
import {
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser,
} from '@/lib/users'
import { logAudit } from '@/lib/audit'
import type { UserRole } from '@/types'

const VALID_ROLES: UserRole[] = ['field_user', 'data_viewer', 'data_manager', 'analyst', 'admin']

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = requireRole(req, 'admin')
  if (isNextResponse(session)) return session
  const user = await getUserById(params.id)
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ user })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = requireRole(req, 'admin')
  if (isNextResponse(session)) return session

  const body = await req.json().catch(() => ({}))
  const { role, status } = body ?? {}

  const before = await getUserById(params.id)
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let updated = before

  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
    }
    // Prevent an admin from demoting themselves and locking the org out.
    if (session.sub === params.id && role !== 'admin') {
      return NextResponse.json(
        { error: 'You cannot change your own role.' },
        { status: 400 },
      )
    }
    const res = await updateUserRole(params.id, role)
    if (!res) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    updated = res
    await logAudit({
      action: 'user.role_change',
      actorId: session.sub,
      actorEmail: session.email,
      targetType: 'user',
      targetId: params.id,
      meta: { from: before.role, to: role },
    })
  }

  if (status !== undefined) {
    if (status !== 'active' && status !== 'disabled') {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
    }
    if (session.sub === params.id && status === 'disabled') {
      return NextResponse.json(
        { error: 'You cannot disable your own account.' },
        { status: 400 },
      )
    }
    const res = await updateUserStatus(params.id, status)
    if (!res) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    updated = res
    await logAudit({
      action: 'user.status_change',
      actorId: session.sub,
      actorEmail: session.email,
      targetType: 'user',
      targetId: params.id,
      meta: { from: before.status, to: status },
    })
  }

  return NextResponse.json({ user: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = requireRole(req, 'admin')
  if (isNextResponse(session)) return session

  if (session.sub === params.id) {
    return NextResponse.json(
      { error: 'You cannot delete your own account.' },
      { status: 400 },
    )
  }

  const before = await getUserById(params.id)
  if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await deleteUser(params.id)
  await logAudit({
    action: 'user.delete',
    actorId: session.sub,
    actorEmail: session.email,
    targetType: 'user',
    targetId: params.id,
    meta: { email: before.email },
  })
  return NextResponse.json({ ok: true })
}
