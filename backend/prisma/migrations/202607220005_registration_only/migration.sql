ALTER TYPE "truck_status" ADD VALUE IF NOT EXISTS 'Pending Verification';
ALTER TYPE "truck_status" ADD VALUE IF NOT EXISTS 'Unavailable';

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "avatar_public_id" TEXT,
  ADD COLUMN IF NOT EXISTS "national_id_number" TEXT,
  ADD COLUMN IF NOT EXISTS "driver_license_public_id" TEXT,
  ADD COLUMN IF NOT EXISTS "driver_image_public_id" TEXT;

ALTER TABLE "customer_profiles"
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "profile_photo_url" TEXT,
  ADD COLUMN IF NOT EXISTS "profile_photo_public_id" TEXT,
  ADD COLUMN IF NOT EXISTS "business_registration_number" TEXT;

ALTER TABLE "trucks"
  ADD COLUMN IF NOT EXISTS "photo_public_id_1" TEXT,
  ADD COLUMN IF NOT EXISTS "photo_public_id_2" TEXT,
  ADD COLUMN IF NOT EXISTS "registration_document_url" TEXT,
  ADD COLUMN IF NOT EXISTS "registration_document_public_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_key" ON "users"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "users_national_id_number_key" ON "users"("national_id_number");
