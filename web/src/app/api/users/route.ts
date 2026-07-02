import { NextRequest, NextResponse } from 'next/server'
import { requireRole, isNextResponse } from '@/lib/auth'
import { listUsers, createUser } from '@/lib/users'
import { logAudit } from '@/lib/audit'
import type { UserRole } from '@/types'

const VALID_ROLES: UserRole[] = ['field_user', 'data_viewer', 'data_manager', 'analyst', 'admin']

export async function GET(req: NextRequest) {
  const session = requireRole(req, 'admin')
  if (isNextResponse(session)) return session
  const users = await listUsers()
  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const session = requireRole(req, 'admin')
  if (isNextResponse(session)) return session

  const body = await req.json().catch(() => ({}))
  const { email, name, password, role } = body ?? {}

  if (!email || !name || !password || !role) {
    return NextResponse.json(
      { error: 'name, email, password, and role are required.' },
      { status: 400 },
    )
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
  }

  try {
    const user = await createUser({
      email: String(email),
      name: String(name),
      role,
      password: String(password),
    })
    await logAudit({
      action: 'user.create',
      actorId: session.sub,
      actorEmail: session.email,
      targetType: 'user',
      targetId: user.id,
      meta: { email: user.email, role: user.role },
    })
    return NextResponse.json({ user }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create user.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
