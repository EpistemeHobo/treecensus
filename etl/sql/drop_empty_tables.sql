-- ═══════════════════════════════════════════════════════════════════════════
-- Drop every EMPTY (0-row) base table in seea-2026.tree_census.
--
-- Uses INFORMATION_SCHEMA.TABLE_STORAGE.total_rows, so it never scans the
-- tables (no query cost for the row counts). VIEWs have no storage and never
-- appear here, so looker_map_points is safe.
--
-- ⚠ WARNINGS
--  • A newly-created table you haven't loaded yet counts as empty — e.g. run
--    this BEFORE loading the CSV and it will delete `observations`. The EXCEPT
--    list below protects it; add any other keep-tables there.
--  • total_rows can lag for rows still in the streaming buffer (recent webhook
--    inserts). A table that only has buffered rows may look empty briefly.
--  • Dropping is irreversible. Run STEP 1 (preview) first.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── STEP 1. Preview — what WOULD be dropped ───────────────────────────────
SELECT table_name, total_rows
FROM `seea-2026.tree_census.INFORMATION_SCHEMA.TABLE_STORAGE`
WHERE total_rows = 0
  AND table_name NOT IN ('observations')      -- keep-list
ORDER BY table_name;

-- ─── STEP 2. Drop them ─────────────────────────────────────────────────────
FOR rec IN (
  SELECT table_name
  FROM `seea-2026.tree_census.INFORMATION_SCHEMA.TABLE_STORAGE`
  WHERE total_rows = 0
    AND table_name NOT IN ('observations')    -- must match the keep-list above
)
DO
  EXECUTE IMMEDIATE
    FORMAT("DROP TABLE IF EXISTS `seea-2026.tree_census.%s`", rec.table_name);
END FOR;
