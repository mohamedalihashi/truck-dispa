-- Hybrid pricing: admin rates + quote adjustment fields
CREATE TYPE "price_adjustment_type" AS ENUM ('Increase', 'Discount', 'Fixed');

CREATE TABLE "pricing_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "base_fee" DECIMAL(12,2) NOT NULL DEFAULT 20,
    "price_per_km" DECIMAL(12,2) NOT NULL DEFAULT 10,
    "price_per_ton" DECIMAL(12,2) NOT NULL DEFAULT 5,
    "minimum_charge" DECIMAL(12,2) NOT NULL DEFAULT 50,
    "maximum_charge" DECIMAL(12,2),
    "automatic_pricing" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pricing_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "pricing_settings" ("id") VALUES ('default') ON CONFLICT DO NOTHING;

ALTER TABLE "cargo_requests"
  ADD COLUMN IF NOT EXISTS "distance_km" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "calculated_price" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "adjustment_type" "price_adjustment_type",
  ADD COLUMN IF NOT EXISTS "adjustment_amount" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "adjustment_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "final_price" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "approved_by_dispatcher" UUID,
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ;
