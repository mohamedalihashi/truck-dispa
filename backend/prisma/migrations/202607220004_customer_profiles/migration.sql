CREATE TABLE IF NOT EXISTS "customer_profiles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "customer_type" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "company_name" TEXT,
  "company_phone" TEXT,
  "company_address" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "customer_profiles_customer_type_city_idx"
  ON "customer_profiles"("customer_type", "city");
