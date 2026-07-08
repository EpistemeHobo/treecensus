import { NextRequest, NextResponse } from 'next/server'
import { requireRole, getSessionFromRequest, isNextResponse } from '@/lib/auth'
import { listAudit, logAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = requireRole(req, 'admin')
  if (isNextResponse(session)) return session

  const url = new URL(req.url)
  const limit = Number(url.searchParams.get('limit') ?? '100')
  const events = await listAudit({ limit: Number.isFinite(limit) ? limit : 100 })
  return NextResponse.json({ events })
}

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action, targetType, targetId, meta } = body
    await logAudit({
      actorId: session.sub,
      actorEmail: session.email,
      action,
      targetType,
      targetId,
      meta,
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to log audit event' }, { status: 400 })
  }
}
