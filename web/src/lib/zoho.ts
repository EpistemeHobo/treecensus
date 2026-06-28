import type { TreeRecord } from '@/types'

// ─── Config (all values come from .env.local) ─────────────────────────────────

const ZOHO_FORM_API_URL = process.env.ZOHO_FORM_API_URL!        // REPLACE_WITH_ZOHO_FORM_API_URL
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID!              // REPLACE_WITH_ZOHO_CLIENT_ID
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET!      // REPLACE_WITH_ZOHO_CLIENT_SECRET
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN!      // REPLACE_WITH_ZOHO_REFRESH_TOKEN
const ZOHO_WEBHOOK_SECRET = process.env.ZOHO_WEBHOOK_SECRET!    // REPLACE_WITH_ZOHO_WEBHOOK_SECRET

// ─── Access Token (refreshed on demand) ──────────────────────────────────────

let cachedToken: string | null = null
let tokenExpiresAt = 0

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken

  // TODO: implement once Zoho OAuth app is configured
  const res = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      refresh_token: ZOHO_REFRESH_TOKEN,
    }),
  })

  if (!res.ok) throw new Error(`Zoho token refresh failed: ${res.status}`)

  const data = await res.json() as { access_token: string; expires_in: number }
  cachedToken = data.access_token
  tokenExpiresAt = Date.now() + data.expires_in * 1000

  return cachedToken
}

// ─── Webhook Signature Verification ──────────────────────────────────────────

export function verifyZohoWebhookSignature(
  rawBody: string,
  signatureHeader: string
): boolean {
  // TODO: implement HMAC verification once Zoho webhook secret is confirmed
  // Zoho sends a signature header; compare against HMAC-SHA256(ZOHO_WEBHOOK_SECRET, rawBody)
  if (!ZOHO_WEBHOOK_SECRET || ZOHO_WEBHOOK_SECRET === 'REPLACE_WITH_ZOHO_WEBHOOK_SECRET') {
    console.warn('[zoho] Webhook secret not configured — skipping signature check')
    return true
  }
  // placeholder — always passes until implemented
  void signatureHeader
  return true
}

// ─── Raw Submission Payload Parser ───────────────────────────────────────────
// Maps a Zoho Forms submission payload to the internal TreeRecord shape.
// Field names below match the Zoho form field labels; update them when the
// actual form is built in Milestone 1.

export interface ZohoSubmissionPayload {
  formId: string
  submissionId: string
  submittedAt: string
  fields: Record<string, string | number | null>
}

export function parseZohoSubmission(payload: ZohoSubmissionPayload): Omit<TreeRecord, 'id' | 'processedAt'> {
  const f = payload.fields

  return {
    submissionId: payload.submissionId,
    plotId: String(f['Plot ID'] ?? ''),
    siteId: String(f['Site ID'] ?? ''),
    species: String(f['Species Common Name'] ?? ''),
    speciesCode: String(f['Species Code'] ?? ''),
    dbh: Number(f['DBH (cm)'] ?? 0),
    height: f['Height (m)'] != null ? Number(f['Height (m)']) : undefined,
    condition: (f['Condition'] as TreeRecord['condition']) ?? 'fair',
    lat: Number(f['Latitude'] ?? 0),
    lng: Number(f['Longitude'] ?? 0),
    collectedBy: String(f['Collector Name'] ?? ''),
    collectedAt: String(f['Collection Date'] ?? payload.submittedAt),
    notes: f['Notes'] != null ? String(f['Notes']) : undefined,
  }
}

// ─── Pull Entries from Zoho Forms API (optional — for backfill) ───────────────

export async function fetchZohoEntries(opts?: { limit?: number; page?: number }) {
  const token = await getAccessToken()
  const limit = opts?.limit ?? 100
  const page = opts?.page ?? 1

  // TODO: confirm exact Zoho Forms API endpoint and pagination params
  const url = new URL(ZOHO_FORM_API_URL)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('page', String(page))

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  })

  if (!res.ok) throw new Error(`Zoho Forms API error: ${res.status}`)

  return res.json()
}
