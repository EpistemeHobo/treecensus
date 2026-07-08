import { NextRequest, NextResponse } from 'next/server'
import { requireRole, isNextResponse } from '@/lib/auth'
import { readCollection, writeCollection } from '@/lib/local-store'
import { logAudit } from '@/lib/audit'
import { UI_DICTIONARY } from '@/lib/ui-dictionary'

/**
 * Admin-editable overrides for the UI Mini Guides in ui-dictionary.ts.
 * The authored defaults live in code; this collection stores only the ids an
 * admin has edited. The guide page merges: override text wins when present.
 */

interface GuideOverride {
  id: string
  guide_en: string
  guide_th: string
  updatedAt: string
  updatedBy: string
}

const COLLECTION = 'ui-guide-overrides'

const VALID_IDS = new Set(
  Object.values(UI_DICTIONARY).flatMap(cat => cat.ui_elements.map(el => el.id as string)),
)

// Any signed-in portal user needs the overrides to render the guide.
export async function GET(req: NextRequest) {
  const session = requireRole(req, 'data_viewer')
  if (isNextResponse(session)) return session
  const overrides = await readCollection<GuideOverride>(COLLECTION)
  return NextResponse.json({ overrides })
}

// Only admins may edit a mini guide.
export async function PUT(req: NextRequest) {
  const session = requireRole(req, 'admin')
  if (isNextResponse(session)) return session

  const body = await req.json().catch(() => ({}))
  const { id, guide_en, guide_th } = body ?? {}

  if (!id || typeof guide_en !== 'string' || typeof guide_th !== 'string') {
    return NextResponse.json(
      { error: 'id, guide_en, and guide_th are required.' },
      { status: 400 },
    )
  }
  if (!VALID_IDS.has(id)) {
    return NextResponse.json({ error: 'Unknown UI element id.' }, { status: 400 })
  }

  const overrides = await readCollection<GuideOverride>(COLLECTION)
  const next: GuideOverride = {
    id,
    guide_en: guide_en.trim(),
    guide_th: guide_th.trim(),
    updatedAt: new Date().toISOString(),
    updatedBy: session.email,
  }
  const idx = overrides.findIndex(o => o.id === id)
  if (idx >= 0) overrides[idx] = next
  else overrides.push(next)
  await writeCollection(COLLECTION, overrides)

  await logAudit({
    action: 'guide.edit',
    actorId: session.sub,
    actorEmail: session.email,
    targetType: 'ui-guide',
    targetId: id,
    meta: { guide_en: next.guide_en, guide_th: next.guide_th },
  })

  return NextResponse.json({ override: next })
}
