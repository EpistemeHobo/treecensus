import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'
import { getObservationSchema, OBSERVATIONS_FQN } from '@/lib/bigquery'

// Field-name pool for the query page's auto-suggestions. Read live from
// INFORMATION_SCHEMA so it always matches the real `observations` table.
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const columns = await getObservationSchema()
    return NextResponse.json({ data: { table: OBSERVATIONS_FQN, columns } })
  } catch (err) {
    console.error('[/api/data/schema]', err)
    return NextResponse.json({ error: 'Failed to fetch schema.' }, { status: 500 })
  }
}
