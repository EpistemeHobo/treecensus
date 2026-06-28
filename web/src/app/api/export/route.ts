import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'
import { getTrees } from '@/lib/bigquery'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const format = searchParams.get('format') ?? 'csv'
  const siteId = searchParams.get('siteId') ?? undefined
  const species = searchParams.get('species') ?? undefined

  const { rows } = await getTrees({ siteId, species, limit: 100_000 })

  if (format === 'csv') {
    if (rows.length === 0) {
      return new NextResponse('No data', { status: 204 })
    }
    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(h => {
          const v = String((row as unknown as Record<string, unknown>)[h] ?? '')
          return v.includes(',') ? `"${v}"` : v
        }).join(',')
      ),
    ].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="treecensus_export.csv"',
      },
    })
  }

  // Excel: TODO — install xlsx and implement workbook generation
  return NextResponse.json({ error: 'Excel export not yet implemented.' }, { status: 501 })
}
