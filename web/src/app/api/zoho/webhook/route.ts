import { NextRequest, NextResponse } from 'next/server'
import { verifyZohoWebhookSignature, parseZohoSubmission, type ZohoSubmissionPayload } from '@/lib/zoho'

// Zoho Forms sends a POST to this endpoint when a form is submitted.
// This route validates the signature, parses the payload, stores the raw
// submission to GCS (TODO), and triggers the transformation pipeline (TODO).

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-zoho-webhook-signature') ?? ''

  if (!verifyZohoWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: ZohoSubmissionPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const parsed = parseZohoSubmission(payload)

  // TODO: write rawBody to GCS bucket (process.env.GCS_RAW_BUCKET)
  //       Path: raw_submissions/{year}/{month}/{day}/{submissionId}.json
  console.log('[zoho/webhook] Received submission', payload.submissionId)
  console.log('[zoho/webhook] Parsed tree record', parsed)

  // TODO: trigger Cloud Function transformation pipeline

  return NextResponse.json({ ok: true, submissionId: payload.submissionId })
}
