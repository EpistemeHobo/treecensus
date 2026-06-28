import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'
import { getTrees } from '@/lib/bigquery'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const siteId = searchParams.get('siteId') ?? undefined
  const species = searchParams.get('species') ?? undefined
  const limit = Number(searchParams.get('limit') ?? 50)
  const offset = Number(searchParams.get('offset') ?? 0)

  try {
    const result = await getTrees({ siteId, species, limit, offset })
    return NextResponse.json({ data: result.rows, meta: { total: result.total, limit, offset } })
  } catch (err) {
    console.error('[/api/data/trees]', err)
    return NextResponse.json({ error: 'Failed to fetch tree records.' }, { status: 500 })
  }
}
