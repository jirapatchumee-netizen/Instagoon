-- Migration: 0018_shop_member_diamonds.sql
-- Member diamond point system:
-- When topping up, diamonds = energy topped up.
-- 10 diamonds = 1 energy.

ALTER TABLE energy ADD COLUMN diamonds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE token_ledger ADD COLUMN delta_diamonds INTEGER NOT NULL DEFAULT 0;
