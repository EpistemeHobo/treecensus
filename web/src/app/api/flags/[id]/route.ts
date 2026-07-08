import { NextRequest, NextResponse } from 'next/server'
import { requireRole, isNextResponse } from '@/lib/auth'
import { reviewFlag } from '@/lib/flags'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = requireRole(req, 'admin')
  if (isNextResponse(session)) return session

  try {
    const { id } = params
    const body = await req.json()
    const { status, reviewNotes } = body

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: 'Status must be approved or rejected' }, { status: 400 })
    }

    const flag = await reviewFlag(id, session.email, status, reviewNotes)
    if (!flag) {
      return NextResponse.json({ error: 'Flag not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, flag })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to review flag'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
