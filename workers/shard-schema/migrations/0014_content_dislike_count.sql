PRAGMA foreign_keys = ON;

-- D1-Fabric Schema V2.2: add dislike_count counter to platform_content.
-- EXPAND-only: additive column with default 0.

ALTER TABLE platform_content ADD COLUMN dislike_count INTEGER NOT NULL DEFAULT 0;

INSERT OR REPLACE INTO platform_schema_meta(meta_key, meta_value, updated_at)
VALUES ('content_counters_schema_version', '2', CURRENT_TIMESTAMP);
