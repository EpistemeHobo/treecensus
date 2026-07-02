import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, getSessionFromRequest } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (session) {
    await logAudit({
      action: 'auth.logout',
      actorId: session.sub,
      actorEmail: session.email,
    })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
