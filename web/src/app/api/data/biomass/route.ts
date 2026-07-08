import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'
import { getObservationBiomass } from '@/lib/bigquery'

// Query-scoped biomass estimation over the same search + filters the Data page
// row browser is showing, powering the "Biomass" tab of the Data Insight modal.
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const biomass = await getObservationBiomass({
      search: typeof body.search === 'string' ? body.search : undefined,
      filters: Array.isArray(body.filters) ? body.filters : [],
      dateFrom: typeof body.dateFrom === 'string' && body.dateFrom ? body.dateFrom : undefined,
      dateTo: typeof body.dateTo === 'string' && body.dateTo ? body.dateTo : undefined,
    })
    return NextResponse.json({ data: biomass })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Biomass query failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
