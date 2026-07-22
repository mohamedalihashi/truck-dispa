ALTER TABLE "trips"
  ADD COLUMN IF NOT EXISTS "delivery_confirmed_at" TIMESTAMPTZ;
