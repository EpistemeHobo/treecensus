import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const payload = verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  // TODO: fetch full user record from BigQuery using payload.sub
  return NextResponse.json({
    user: { id: payload.sub, email: payload.email, role: payload.role },
  })
}
