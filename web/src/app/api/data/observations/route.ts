import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'
import { filterObservations } from '@/lib/bigquery'

// Structured filter + keyword search over the observations table, for the Data page.
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const limit = Math.min(Number(body.limit ?? 50), 1000)
    const offset = Math.max(Number(body.offset ?? 0), 0)
    const result = await filterObservations({
      search: typeof body.search === 'string' ? body.search : undefined,
      filters: Array.isArray(body.filters) ? body.filters : [],
      limit,
      offset,
    })
    return NextResponse.json({ data: result.rows, meta: { total: result.total, limit, offset } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Query failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
