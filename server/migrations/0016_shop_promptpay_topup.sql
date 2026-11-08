-- Migration: 0016_shop_promptpay_topup.sql
-- Energy top-up by PromptPay QR straight into the company KBank account (server/src/shop/).
-- Each order carries a unique satang tail (29.00 -> 29.37) so a bank statement row identifies it.
-- The slip QR credits at once (optimistic); the daily KBank statement confirms or revokes.
-- Money is stored in satang, never as a float.

CREATE TABLE products (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_satang INTEGER NOT NULL CHECK(price_satang > 0),
  energy INTEGER NOT NULL CHECK(energy > 0),
  position INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);

-- Test catalog: energy = price x 2.
INSERT INTO products(sku,name,price_satang,energy,position) VALUES
  ('energy_29','แพ็ก 29',2900,58,1),
  ('energy_59','แพ็ก 59',5900,118,2),
  ('energy_99','แพ็ก 99',9900,198,3);

-- user_id is SET NULL on account deletion so the accounting record survives without personal
-- data. price and energy are copied in so later catalog edits never change an existing order.
-- amount_satang = price_satang + a 1..99 satang tail unique among live orders.
--   pending  -> paid      slip QR accepted, energy credited, not yet seen on the statement
--   paid     -> reconciled_at set when the matching statement deposit is found
--   paid     -> revoked   no deposit on the statement: energy taken back, player blocked
--   paid     -> refunded  money returned by bank transfer
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  request_id TEXT NOT NULL,
  sku TEXT NOT NULL REFERENCES products(sku),
  price_satang INTEGER NOT NULL CHECK(price_satang > 0),
  amount_satang INTEGER NOT NULL CHECK(amount_satang > 0),
  energy INTEGER NOT NULL CHECK(energy > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','expired','refunded','revoked')),
  slip_attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  paid_at INTEGER,
  trans_ref TEXT UNIQUE,
  slip_bank TEXT,
  reconciled_at INTEGER,
  note TEXT,
  UNIQUE(user_id, request_id)
);
CREATE INDEX orders_user_created ON orders(user_id, created_at);
CREATE INDEX orders_status_created ON orders(status, created_at);
CREATE INDEX orders_amount ON orders(amount_satang, created_at);
-- Two concurrent order creations can never hand out the same amount.
CREATE UNIQUE INDEX orders_pending_amount ON orders(amount_satang) WHERE status = 'pending';

-- Deposits read from uploaded KBank statements. id is a hash of the statement row, so uploading
-- overlapping statements twice never double-counts; a deposit backs at most one order.
CREATE TABLE bank_deposits (
  id TEXT PRIMARY KEY,
  amount_satang INTEGER NOT NULL CHECK(amount_satang > 0),
  deposited_at INTEGER NOT NULL,
  order_id TEXT UNIQUE REFERENCES orders(id) ON DELETE SET NULL,
  imported_at INTEGER NOT NULL
);
CREATE INDEX bank_deposits_amount ON bank_deposits(amount_satang, deposited_at);

ALTER TABLE users ADD COLUMN purchase_age_confirmed_at INTEGER;
-- Set when an order is revoked for a payment that never arrived; the shop stays closed to them.
ALTER TABLE users ADD COLUMN shop_blocked_at INTEGER;

-- One credit per order: a replayed or concurrent slip submission cannot add energy twice.
ALTER TABLE token_ledger ADD COLUMN order_id TEXT;
CREATE UNIQUE INDEX token_ledger_order_reason ON token_ledger(order_id, reason) WHERE order_id IS NOT NULL;
