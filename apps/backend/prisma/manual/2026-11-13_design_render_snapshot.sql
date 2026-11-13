-- Immutable render snapshots for designs produced by the versioned-template
-- pipeline (@jasper/post-renderer).
--
-- A design is reproducible only if we record what made it: which template at
-- which version, which revision of the verified profile, the resolved copy and
-- the asset ids. Templates get edited and profiles get corrected, so without
-- this a published flyer cannot be regenerated or audited afterwards.
--
-- Stored JSON-encoded in a text column, matching the convention used elsewhere
-- in this schema (see mediaUrls, hashtags, scopes).

ALTER TABLE "designs" ADD COLUMN IF NOT EXISTS "render_snapshot" TEXT;
ALTER TABLE "designs" ADD COLUMN IF NOT EXISTS "snapshot_id" TEXT;

-- Looking a design up by snapshot is how "has this exact brief already been
-- rendered?" is answered, so it is worth an index.
CREATE INDEX IF NOT EXISTS "designs_snapshot_id_idx" ON "designs" ("snapshot_id");
