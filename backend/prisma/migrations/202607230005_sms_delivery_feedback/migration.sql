ALTER TABLE "trip_feedback"
  ADD COLUMN IF NOT EXISTS "driver_behaviour_rating" INTEGER,
  ADD COLUMN IF NOT EXISTS "delivery_speed_rating" INTEGER,
  ADD COLUMN IF NOT EXISTS "cargo_condition_rating" INTEGER,
  ADD COLUMN IF NOT EXISTS "cargo_received_safely" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "report_problem" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "complaint_status" TEXT NOT NULL DEFAULT 'None',
  ADD COLUMN IF NOT EXISTS "sender_name" TEXT,
  ADD COLUMN IF NOT EXISTS "sender_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "receiver_name" TEXT,
  ADD COLUMN IF NOT EXISTS "receiver_phone" TEXT;

CREATE TABLE IF NOT EXISTS "delivery_feedback_tokens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "trip_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "used_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_feedback_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "delivery_feedback_tokens_trip_id_key" UNIQUE ("trip_id"),
  CONSTRAINT "delivery_feedback_tokens_token_hash_key" UNIQUE ("token_hash"),
  CONSTRAINT "delivery_feedback_tokens_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_delivery_feedback_tokens_validity"
  ON "delivery_feedback_tokens" ("expires_at", "used_at");

CREATE TABLE IF NOT EXISTS "sms_notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "recipient_name" TEXT,
  "recipient_phone" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Pending',
  "provider_message_id" TEXT,
  "failure_reason" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_retry_at" TIMESTAMPTZ,
  "sent_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sms_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_sms_event_recipient_entity"
  ON "sms_notifications" ("event", "recipient_phone", "entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "idx_sms_retry_queue"
  ON "sms_notifications" ("status", "next_retry_at");
