import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'
import { getObservationInsights } from '@/lib/bigquery'

// Aggregate statistics over the same search + filters the Data page row browser
// is showing, powering the "View Data Insight" charts modal.
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const insights = await getObservationInsights({
      search: typeof body.search === 'string' ? body.search : undefined,
      filters: Array.isArray(body.filters) ? body.filters : [],
    })
    return NextResponse.json({ data: insights })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Insights query failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
