-- Migration 0026: Add Chained Cascading Offers and VIP Club Pass
-- Implements progressive FOMO (+1,000% and +3,000% tiers) and VIP Pass

INSERT INTO products (sku, name, price_satang, energy, diamonds, position, active, is_offer) VALUES
  ('offer_cascade_99', 'สิทธิ์ลับเฉพาะคนพิเศษ (+1,000% Value)', 9900, 650, 80, 6, 1, 1),
  ('offer_cascade_299', 'บัตรผ่านห้องลับ Super VIP (+3,000% Value)', 29900, 2400, 300, 7, 1, 1),
  ('pass_vip_199', 'Instagoon VIP Club (30 วัน)', 19900, 1050, 150, 5, 1, 1);

-- Table for tracking VIP Club Passes (30-day non-auto-renewing pass)
CREATE TABLE IF NOT EXISTS vip_passes (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id),
  starts_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_claimed_day TEXT
);
