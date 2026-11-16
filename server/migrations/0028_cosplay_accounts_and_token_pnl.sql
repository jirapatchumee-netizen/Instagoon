-- Migration 0028: 1:1 Cosplay Creator Accounts, Exact AI Token Ledger & Creator Financial Ledger (DeepSeek-Flash PnL)

-- 1. 1:1 Cosplay Account to Character Binding (Enforces 1 Account = 1 Character at DB constraint level)
CREATE TABLE IF NOT EXISTS cosplay_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL UNIQUE REFERENCES creators(id) ON DELETE CASCADE,
  account_status TEXT NOT NULL DEFAULT 'active' CHECK(account_status IN ('active', 'pending_kyc', 'suspended')),
  rev_share_bps INTEGER NOT NULL DEFAULT 3000, -- 30.00% default creator commission (rev share)
  kyc_verified_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cosplay_accounts_user ON cosplay_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_cosplay_accounts_creator ON cosplay_accounts(creator_id);

-- 2. AI Model Pricing Table (Holds base rates per 1M tokens)
CREATE TABLE IF NOT EXISTS ai_model_pricing (
  model_id TEXT PRIMARY KEY,
  input_usd_per_m REAL NOT NULL,
  cached_input_usd_per_m REAL NOT NULL,
  output_usd_per_m REAL NOT NULL,
  effective_from INTEGER NOT NULL
);

-- Seed initial pricing for DeepSeek-Flash & Gemini
INSERT OR REPLACE INTO ai_model_pricing (model_id, input_usd_per_m, cached_input_usd_per_m, output_usd_per_m, effective_from)
VALUES 
  ('deepseek-flash', 0.14, 0.014, 0.28, 1700000000000),
  ('gemini-2.5-flash', 0.075, 0.01875, 0.30, 1700000000000);

-- 3. Exact AI Token Usage Ledger (Captures tokens & costs in satang & micro-USD for every AI call)
CREATE TABLE IF NOT EXISTS ai_token_usage_ledger (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL REFERENCES creators(id),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  call_type TEXT NOT NULL CHECK(call_type IN ('dm_turn', 'dm_rewrite', 'thread_summary', 'scene_directive', 'sandbox_test')),
  model TEXT NOT NULL DEFAULT 'deepseek-flash',
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  cached_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_satang INTEGER NOT NULL DEFAULT 0,
  cost_usd_micros INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_token_ledger_creator_time ON ai_token_usage_ledger(creator_id, created_at);
CREATE INDEX IF NOT EXISTS idx_token_ledger_time ON ai_token_usage_ledger(created_at);

-- 4. Creator Financial Ledger (Double-Entry Monetization & 14-day Escrow)
CREATE TABLE IF NOT EXISTS creator_financial_ledger (
  id TEXT PRIMARY KEY,
  receiver_creator_id TEXT NOT NULL REFERENCES creators(id),
  sender_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK(source_type IN ('gift', 'episode_unlock', 'chat_topup', 'membership')),
  paid_amount_satang INTEGER NOT NULL,
  creator_earning_satang INTEGER NOT NULL,
  platform_fee_satang INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_escrow' CHECK(status IN ('pending_escrow', 'settled', 'refunded', 'clawback')),
  escrow_release_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_creator_fin_ledger_creator ON creator_financial_ledger(receiver_creator_id, status);
CREATE INDEX IF NOT EXISTS idx_creator_fin_ledger_time ON creator_financial_ledger(created_at);
