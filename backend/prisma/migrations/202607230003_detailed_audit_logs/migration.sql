ALTER TABLE "audit_logs"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "old_values" JSONB,
  ADD COLUMN IF NOT EXISTS "new_values" JSONB,
  ADD COLUMN IF NOT EXISTS "ip_address" TEXT,
  ADD COLUMN IF NOT EXISTS "user_agent" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'Success';

CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_created"
  ON "audit_logs" ("actor_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_action_created"
  ON "audit_logs" ("action", "created_at");

CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity"
  ON "audit_logs" ("entity", "entity_id");
