ALTER TABLE "users" ADD COLUMN "username" TEXT;

WITH username_candidates AS (
  SELECT
    "id",
    CASE
      WHEN length(regexp_replace(lower(split_part("email", '@', 1)), '[^a-z0-9._-]', '', 'g')) >= 3
        THEN regexp_replace(lower(split_part("email", '@', 1)), '[^a-z0-9._-]', '', 'g')
      ELSE 'user_' || left(replace("id"::text, '-', ''), 8)
    END AS base_username,
    row_number() OVER (
      PARTITION BY regexp_replace(lower(split_part("email", '@', 1)), '[^a-z0-9._-]', '', 'g')
      ORDER BY "created_at", "id"
    ) AS duplicate_number
  FROM "users"
)
UPDATE "users" AS users
SET "username" = candidates.base_username ||
  CASE WHEN candidates.duplicate_number = 1 THEN '' ELSE '_' || candidates.duplicate_number::text END
FROM username_candidates AS candidates
WHERE users."id" = candidates."id";

ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
