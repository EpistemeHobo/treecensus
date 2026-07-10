import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'
import { getFocusAreaStems, type FocusAreaLevel } from '@/lib/bigquery'

const LEVELS: FocusAreaLevel[] = ['province', 'plot', 'subplot']

// Stems inside one selected focus area, for the Maps page "Focus Area" map.
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const level = body.level as FocusAreaLevel
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    if (!LEVELS.includes(level)) {
      return NextResponse.json({ error: 'Invalid area level.' }, { status: 400 })
    }
    if (!code) {
      return NextResponse.json({ error: 'Missing area code.' }, { status: 400 })
    }

    const result = await getFocusAreaStems(level, code)
    return NextResponse.json({ data: result })
  } catch (err) {
    console.error('[/api/data/focus-area]', err)
    return NextResponse.json({ error: 'Failed to fetch focus-area stems.' }, { status: 500 })
  }
}
