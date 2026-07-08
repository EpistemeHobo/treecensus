import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { User, AuthSession, UserRole } from '@/types'

const JWT_SECRET = process.env.JWT_SECRET! // REPLACE_WITH_STRONG_RANDOM_SECRET
const SESSION_TTL_HOURS = 12

// ─── Token ───────────────────────────────────────────────────────────────────

export function signToken(user: User): string {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_SECRET, {
    expiresIn: `${SESSION_TTL_HOURS}h`,
  })
}

export function verifyToken(token: string): { sub: string; role: UserRole; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string; role: UserRole; email: string }
  } catch {
    return null
  }
}

// ─── Session helpers ─────────────────────────────────────────────────────────

export function buildSession(user: User, token: string): AuthSession {
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString()
  return { user, token, expiresAt }
}

// ─── Role permission matrix ───────────────────────────────────────────────────

const ROLE_RANK: Record<UserRole, number> = {
  field_user: 0,
  data_viewer: 1,
  data_manager: 2,
  analyst: 3,
  admin: 4,
}

export function hasRole(userRole: UserRole, required: UserRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[required]
}

export const PORTAL_ROUTES: Record<string, UserRole> = {
  '/dashboard': 'data_viewer',
  '/data': 'data_viewer',
  '/query': 'analyst',
  '/maps': 'data_viewer',
  '/reports': 'data_manager',
  '/guide': 'data_viewer',
  '/admin': 'admin',
  '/settings': 'field_user',
}

// ─── Cookie name ─────────────────────────────────────────────────────────────
export const SESSION_COOKIE = 'tc_session'

// ─── Request helpers ─────────────────────────────────────────────────────────

export interface SessionPayload {
  sub: string
  role: UserRole
  email: string
}

export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

/**
 * Guard for API routes. Returns the session payload on success, or a
 * NextResponse (401/403) that the caller should return directly.
 */
export function requireRole(
  req: NextRequest,
  required: UserRole,
): SessionPayload | NextResponse {
  const session = getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }
  if (!hasRole(session.role, required)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return session
}

export function isNextResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse
}
