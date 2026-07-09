import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { listMessages } from '@/lib/messages'

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  try {
    const messages = await listMessages(session.email)
    return NextResponse.json({ messages })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch messages'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
