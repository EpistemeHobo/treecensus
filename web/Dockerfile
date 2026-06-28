# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Provide dummy values so Next.js build succeeds without real secrets.
# Actual values are injected at runtime via Fly secrets.
ENV NEXT_TELEMETRY_DISABLED=1
ENV JWT_SECRET=build-placeholder
ENV GCP_PROJECT_ID=build-placeholder
ENV BIGQUERY_DATASET=tree_census
ENV ZOHO_WEBHOOK_SECRET=build-placeholder
ENV ZOHO_FORM_API_URL=https://placeholder
ENV ZOHO_CLIENT_ID=build-placeholder
ENV ZOHO_CLIENT_SECRET=build-placeholder
ENV ZOHO_REFRESH_TOKEN=build-placeholder
ENV GCS_RAW_BUCKET=build-placeholder

RUN npm run build

# ── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Default port — overridden by Fly's PORT env var if needed
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

# Copy only the standalone output (much smaller than full node_modules)
COPY --from=builder /app/public                    ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
