import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'
import { getUserById } from '@/lib/users'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const payload = verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

  const user = await getUserById(payload.sub)
  if (!user || user.status === 'disabled') {
    return NextResponse.json({ error: 'Account not available' }, { status: 401 })
  }

  return NextResponse.json({ user })
}
