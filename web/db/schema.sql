-- ─── Tree Census — auth & admin tables ──────────────────────────────────────
-- Run these once against your BigQuery dataset. Safe to re-run: CREATE IF NOT EXISTS.

-- Users table. Passwords are stored as bcrypt hashes only.
CREATE TABLE IF NOT EXISTS `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.users` (
  id           STRING    NOT NULL,
  email        STRING    NOT NULL,
  name         STRING    NOT NULL,
  role         STRING    NOT NULL, -- field_user | data_viewer | data_manager | analyst | admin
  passwordHash STRING    NOT NULL,
  status       STRING    NOT NULL, -- active | disabled
  createdAt    TIMESTAMP NOT NULL,
  updatedAt    TIMESTAMP NOT NULL,
  lastLogin    TIMESTAMP
);

-- Audit log — one row per mutating action, admin visible.
CREATE TABLE IF NOT EXISTS `${GCP_PROJECT_ID}.${BIGQUERY_DATASET}.audit_log` (
  id          STRING    NOT NULL,
  actorId     STRING,
  actorEmail  STRING,
  action      STRING    NOT NULL, -- e.g. auth.login, user.create, user.role_change
  targetType  STRING,              -- e.g. user, tree, submission
  targetId    STRING,
  meta        STRING,              -- JSON blob (small)
  createdAt   TIMESTAMP NOT NULL
);
