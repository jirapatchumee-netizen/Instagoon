-- Migration: 0017_shop_daily_reports.sql
-- The daily summary file for accounting (docs/ACCOUNTING_DAILY_CLOSE.md), written by the cron
-- after midnight Bangkok from that day's payments. One file per day, written once.

CREATE TABLE shop_daily_reports (
  day TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  total_satang INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
