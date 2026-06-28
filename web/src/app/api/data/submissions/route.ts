import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, hasRole, SESSION_COOKIE } from '@/lib/auth'
import { getSubmissions } from '@/lib/bigquery'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  const payload = token ? verifyToken(token) : null
  if (!payload) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (!hasRole(payload.role, 'data_manager')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') ?? undefined
  const limit = Number(searchParams.get('limit') ?? 50)
  const offset = Number(searchParams.get('offset') ?? 0)

  try {
    const result = await getSubmissions({ status, limit, offset })
    return NextResponse.json({ data: result.rows, meta: { total: result.total, limit, offset } })
  } catch (err) {
    console.error('[/api/data/submissions]', err)
    return NextResponse.json({ error: 'Failed to fetch submissions.' }, { status: 500 })
  }
}
