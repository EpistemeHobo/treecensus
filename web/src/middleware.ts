import { NextRequest, NextResponse } from 'next/server'

// Edge-compatible JWT decode (no signature verification here —
// API routes use jsonwebtoken for full verification on Node.js runtime).
// Middleware only needs the payload to enforce role-based routing.
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    return JSON.parse(json)
  } catch {
    return null
  }
}

const SESSION_COOKIE = 'tc_session'

type UserRole = 'field_user' | 'data_viewer' | 'data_manager' | 'analyst' | 'admin'

const ROLE_RANK: Record<UserRole, number> = {
  field_user: 0, data_viewer: 1, data_manager: 2, analyst: 3, admin: 4,
}

const PORTAL_ROUTES: Record<string, UserRole> = {
  '/dashboard': 'data_viewer',
  '/data':      'data_viewer',
  '/query':     'analyst',
  '/maps':      'data_viewer',
  '/reports':   'data_manager',
  '/guide':     'data_viewer',
  '/admin':     'admin',
  '/settings':  'field_user',
}

function hasRole(userRole: UserRole, required: UserRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[required]
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/zoho/webhook')
  ) {
    return NextResponse.next()
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value
  const payload = token ? decodeJwtPayload(token) : null

  // Check token expiry
  const expired = payload?.exp && (payload.exp as number) * 1000 < Date.now()

  if (!payload || expired) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const role = (payload.role ?? 'data_viewer') as UserRole

  // Role-based route guard
  for (const [route, minRole] of Object.entries(PORTAL_ROUTES)) {
    if (pathname.startsWith(route) && !hasRole(role, minRole)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
