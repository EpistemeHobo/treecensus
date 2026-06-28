import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signToken, buildSession, SESSION_COOKIE } from '@/lib/auth'
import type { User } from '@/types'

// TODO: replace this stub with a real BigQuery users table lookup
async function findUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
  // Placeholder — seed real users in the BigQuery users table
  const STUB_USERS: Array<User & { passwordHash: string }> = [
    {
      id: 'user-001',
      email: 'admin@treecensus.local',
      name: 'Admin User',
      role: 'admin',
      createdAt: '2026-01-01T00:00:00Z',
      // bcrypt hash of "changeme" — replace in production
      passwordHash: '$2a$10$a.Wut0yaN0kqHcWTDDsi0.k8Xr74jlpSCG5abEp1/pTeKcAmoEooC',
    },
  ]
  return STUB_USERS.find(u => u.email === email) ?? null
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  const record = await findUserByEmail(email)
  if (!record) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, record.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 })
  }

  const { passwordHash: _, ...user } = record
  const token = signToken(user)
  const session = buildSession(user, token)

  const res = NextResponse.json({ user })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 12 * 3600,
  })
  return res
}
