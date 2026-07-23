ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "is_super_admin" BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE "users"
SET "is_super_admin" = TRUE
WHERE "id" = (
  SELECT "id"
  FROM "users"
  WHERE "role" = 'admin'
  ORDER BY "created_at" ASC, "id" ASC
  LIMIT 1
);
