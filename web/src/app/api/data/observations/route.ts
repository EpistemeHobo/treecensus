import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, SESSION_COOKIE, getSessionFromRequest } from '@/lib/auth'
import { filterObservations } from '@/lib/bigquery'
import { logAudit } from '@/lib/audit'

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
      dateFrom: typeof body.dateFrom === 'string' && body.dateFrom ? body.dateFrom : undefined,
      dateTo: typeof body.dateTo === 'string' && body.dateTo ? body.dateTo : undefined,
      limit,
      offset,
    })

    // Log query audit only if there's keyword search or filter conditions.
    const search = typeof body.search === 'string' ? body.search.trim() : ''
    const filters = Array.isArray(body.filters) ? body.filters.filter((f: any) => f.field) : []
    const hasSearch = !!search
    const hasFilters = filters.length > 0 || !!body.dateFrom || !!body.dateTo
    if (hasSearch || hasFilters) {
      const session = getSessionFromRequest(req)
      void logAudit({
        actorId: session?.sub,
        actorEmail: session?.email,
        action: 'data.query',
        meta: {
          search,
          filtersCount: filters.length,
          hasDateRange: !!body.dateFrom || !!body.dateTo,
        },
      }).catch(err => console.error('[audit] query logging failed:', err))
    }

    return NextResponse.json({ data: result.rows, meta: { total: result.total, limit, offset } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Query failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
