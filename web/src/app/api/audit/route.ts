import { NextRequest, NextResponse } from 'next/server'
import { requireRole, isNextResponse } from '@/lib/auth'
import { listAudit } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = requireRole(req, 'admin')
  if (isNextResponse(session)) return session

  const url = new URL(req.url)
  const limit = Number(url.searchParams.get('limit') ?? '100')
  const events = await listAudit({ limit: Number.isFinite(limit) ? limit : 100 })
  return NextResponse.json({ events })
}
