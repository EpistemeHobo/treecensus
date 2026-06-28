import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'
import { getDashboardStats } from '@/lib/bigquery'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const stats = await getDashboardStats()
    return NextResponse.json({ data: stats })
  } catch (err) {
    console.error('[/api/data/stats]', err)
    return NextResponse.json({ error: 'Failed to fetch stats.' }, { status: 500 })
  }
}
