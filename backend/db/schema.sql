CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'dispatcher', 'customer', 'driver');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE truck_status AS ENUM ('Available', 'Busy', 'Maintenance');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM (
    'Pending', 'Assigned', 'Accepted', 'Arrived Pickup', 'Loaded',
    'In Transit', 'Delivered', 'Cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE trip_status AS ENUM (
    'Pending', 'Assigned', 'Accepted', 'Arrived Pickup', 'Loaded',
    'In Transit', 'Delivered', 'Cancelled', 'Delayed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('Pending', 'Partial', 'Paid', 'Failed', 'Refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS truck_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_number TEXT NOT NULL,
  plate_number TEXT NOT NULL UNIQUE,
  capacity TEXT NOT NULL,
  truck_type TEXT NOT NULL,
  driver_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status truck_status NOT NULL DEFAULT 'Available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cargo_requests (
  id TEXT PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES users(id),
  pickup TEXT NOT NULL,
  destination TEXT NOT NULL,
  truck_type TEXT NOT NULL,
  weight TEXT NOT NULL,
  description TEXT NOT NULL,
  receiver TEXT,
  sender TEXT,
  special_instructions TEXT,
  status request_status NOT NULL DEFAULT 'Pending',
  driver_id UUID REFERENCES users(id),
  truck_id UUID REFERENCES trucks(id),
  dispatcher_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  cargo_request_id TEXT REFERENCES cargo_requests(id),
  customer_id UUID NOT NULL REFERENCES users(id),
  driver_id UUID REFERENCES users(id),
  dispatcher_id UUID REFERENCES users(id),
  truck_id UUID REFERENCES trucks(id),
  pickup TEXT NOT NULL,
  destination TEXT NOT NULL,
  distance TEXT,
  estimated_time TEXT,
  status trip_status NOT NULL DEFAULT 'Pending',
  fare NUMERIC(12, 2) NOT NULL DEFAULT 0,
  delivery_proof_url TEXT,
  signature_url TEXT,
  last_lat DOUBLE PRECISION,
  last_lng DOUBLE PRECISION,
  last_location_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT REFERENCES trips(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES users(id),
  amount NUMERIC(12, 2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'Pending',
  method TEXT DEFAULT 'waafipay',
  currency TEXT DEFAULT 'USD',
  reference_id TEXT UNIQUE,
  description TEXT,
  provider TEXT DEFAULT 'waafipay',
  provider_transaction_id TEXT,
  provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL,
  payload JSONB,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_cargo_requests_status ON cargo_requests(status);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_trucks_status ON trucks(status);
CREATE INDEX IF NOT EXISTS idx_verification_codes_lookup ON verification_codes(email, purpose, expires_at);
