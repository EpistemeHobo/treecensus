import { NextRequest, NextResponse } from 'next/server'
import { requireRole, getSessionFromRequest, isNextResponse } from '@/lib/auth'
import { createFlag, listFlags } from '@/lib/flags'

export async function GET(req: NextRequest) {
  const session = requireRole(req, 'admin')
  if (isNextResponse(session)) return session

  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status') ?? undefined
    const flags = await listFlags({ status })
    return NextResponse.json({ flags })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch flags'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { mapRecordId, field, oldValue, newValue, reason } = body

    if (!mapRecordId || !field) {
      return NextResponse.json({ error: 'Missing mapRecordId or field' }, { status: 400 })
    }

    const flag = await createFlag({
      mapRecordId,
      field,
      oldValue: oldValue !== undefined ? String(oldValue) : null,
      newValue: newValue !== undefined ? String(newValue) : null,
      reason: reason ? String(reason) : null,
      flaggedBy: session.email,
    })

    return NextResponse.json({ success: true, flag })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create flag'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
