-- Migration 0023: Update shop catalog with v2 tiers, diamond bonuses, and special offer flag.
-- Instagoon Monetization Architecture v2 (Executive Blueprint)

ALTER TABLE products ADD COLUMN diamonds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN is_offer INTEGER NOT NULL DEFAULT 0 CHECK(is_offer IN (0,1));
ALTER TABLE orders ADD COLUMN diamonds INTEGER NOT NULL DEFAULT 0;

-- Backfill legacy products: 1:1 diamonds
UPDATE products SET diamonds = energy;

-- Deactivate legacy test tiers
UPDATE products SET active = 0 WHERE sku IN ('energy_29', 'energy_59');

-- Update energy_99 to v2 specs (Basic Pack 99: 9900 satang, 350 energy, 35 diamonds)
UPDATE products SET name = 'Basic Pack 99', price_satang = 9900, energy = 350, diamonds = 35, position = 2, active = 1, is_offer = 0 WHERE sku = 'energy_99';

-- Insert new v2 tiers
INSERT INTO products (sku, name, price_satang, energy, diamonds, position, active, is_offer) VALUES
  ('energy_39', 'Starter Pack 39', 3900, 120, 10, 1, 1, 0),
  ('energy_249', 'Pro Romance 249', 24900, 950, 120, 3, 1, 0),
  ('energy_590', 'Whale Pack 590', 59000, 2500, 350, 4, 1, 0),
  ('offer_cliffhanger_49', 'Cliffhanger Special 49', 4900, 180, 20, 5, 1, 1);
