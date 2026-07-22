ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "driver_license" TEXT,
  ADD COLUMN IF NOT EXISTS "driver_image_url" TEXT;

ALTER TABLE "trucks"
  ADD COLUMN IF NOT EXISTS "document_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "verification_codes"
  ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "max_attempts" INTEGER NOT NULL DEFAULT 5;

CREATE TABLE IF NOT EXISTS "dispatcher_profiles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "dispatcher_code" TEXT NOT NULL UNIQUE,
  "national_id_number" TEXT NOT NULL UNIQUE,
  "national_id_front_url" TEXT NOT NULL,
  "national_id_back_url" TEXT NOT NULL,
  "profile_photo_url" TEXT NOT NULL,
  "date_of_birth" DATE NOT NULL,
  "gender" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "cv_url" TEXT NOT NULL,
  "years_of_experience" INTEGER NOT NULL,
  "assigned_region" TEXT NOT NULL,
  "work_shift" TEXT NOT NULL,
  "emergency_contact_name" TEXT NOT NULL,
  "emergency_contact_phone" TEXT NOT NULL,
  "commission_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "verification_status" TEXT NOT NULL DEFAULT 'Pending',
  "verified_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "verified_at" TIMESTAMPTZ,
  "account_status" TEXT NOT NULL DEFAULT 'Active',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "dispatcher_profiles_assigned_region_account_status_idx" ON "dispatcher_profiles"("assigned_region", "account_status");
CREATE INDEX IF NOT EXISTS "dispatcher_profiles_verification_status_idx" ON "dispatcher_profiles"("verification_status");
