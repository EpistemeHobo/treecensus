import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, hasRole, SESSION_COOKIE } from '@/lib/auth'
import { runUserQuery } from '@/lib/bigquery'

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  const payload = token ? verifyToken(token) : null
  if (!payload) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (!hasRole(payload.role, 'analyst')) {
    return NextResponse.json({ error: 'Forbidden: analyst role required.' }, { status: 403 })
  }

  const { sql } = await req.json()
  if (!sql?.trim()) {
    return NextResponse.json({ error: 'No SQL provided.' }, { status: 400 })
  }

  try {
    const result = await runUserQuery(sql)
    return NextResponse.json({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Query failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
