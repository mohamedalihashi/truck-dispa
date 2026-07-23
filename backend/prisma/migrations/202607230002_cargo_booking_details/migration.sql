ALTER TABLE "cargo_requests"
  ADD COLUMN IF NOT EXISTS "customer_role" TEXT,
  ADD COLUMN IF NOT EXISTS "sender_name" TEXT,
  ADD COLUMN IF NOT EXISTS "sender_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "receiver_name" TEXT,
  ADD COLUMN IF NOT EXISTS "receiver_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "from_region" TEXT,
  ADD COLUMN IF NOT EXISTS "from_district" TEXT,
  ADD COLUMN IF NOT EXISTS "from_neighborhood" TEXT,
  ADD COLUMN IF NOT EXISTS "to_region" TEXT,
  ADD COLUMN IF NOT EXISTS "to_district" TEXT,
  ADD COLUMN IF NOT EXISTS "to_neighborhood" TEXT,
  ADD COLUMN IF NOT EXISTS "submission_key" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "cargo_requests_submission_key_key"
  ON "cargo_requests"("submission_key");

-- The columns stay nullable so existing cargo requests remain valid.
-- Legacy pickup/destination values are preserved and continue to power trips/tracking.
