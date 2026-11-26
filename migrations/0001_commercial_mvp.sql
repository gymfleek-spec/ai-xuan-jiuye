PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS readings (
  id TEXT PRIMARY KEY,
  public_token TEXT UNIQUE NOT NULL CHECK(length(public_token) = 32),
  nickname TEXT,
  topic TEXT NOT NULL CHECK(topic IN ('career','love','family','wealth','direction')),
  birth_payload TEXT NOT NULL,
  chart_json TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  reading_id TEXT UNIQUE NOT NULL REFERENCES readings(id),
  sku TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'HKD' CHECK(currency = 'HKD'),
  stripe_session_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','PAID','FAILED')),
  report_status TEXT NOT NULL DEFAULT 'LOCKED' CHECK(report_status IN ('LOCKED','GENERATING','READY')),
  generation_lease_until_ms INTEGER NOT NULL DEFAULT 0,
  email_first_attempt_ms INTEGER,
  email_lease_until_ms INTEGER NOT NULL DEFAULT 0,
  email_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK((sku = 'xuan_single_v1' AND amount_cents = 8800) OR (sku = 'xuan_full_3yr_v1' AND amount_cents = 14800))
);

CREATE TABLE IF NOT EXISTS report_sections (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  section_key TEXT NOT NULL CHECK(section_key IN ('ch1','ch2','ch3','ch4')),
  content_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(order_id, section_key)
);

CREATE TABLE IF NOT EXISTS rate_buckets (
  bucket TEXT PRIMARY KEY,
  expires INTEGER NOT NULL,
  hits INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_buckets_expiry ON rate_buckets(expires);
