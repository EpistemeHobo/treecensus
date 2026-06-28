// GCP credentials helper for Fly.io deployment.
//
// On Fly, you can't mount a JSON key file, so store the entire service account
// JSON as a single secret string:
//
//   fly secrets set GOOGLE_APPLICATION_CREDENTIALS_JSON="$(cat service-account.json)"
//
// Then call initCredentials() once at app startup (e.g. in bigquery.ts).

export function getGcpCredentials() {
  // Local dev: GOOGLE_APPLICATION_CREDENTIALS points to a key file path
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return {}

  // Fly.io (and any container env): JSON string in env var
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (!raw) {
    console.warn('[gcp] No credentials found — BigQuery calls will fail.')
    return {}
  }

  try {
    return { credentials: JSON.parse(raw) }
  } catch {
    throw new Error('[gcp] GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON')
  }
}
