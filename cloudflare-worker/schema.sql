-- AI Tracker D1 Schema
-- Shared by openclaw-ai-tracker + client-ai-tracker Workers

CREATE TABLE IF NOT EXISTS ai_visit_counts (
  site_slug TEXT NOT NULL DEFAULT '',
  visit_date TEXT NOT NULL,
  bot_pattern TEXT NOT NULL,
  count_today INTEGER DEFAULT 0,
  count_total INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(site_slug, visit_date, bot_pattern)
);
CREATE INDEX IF NOT EXISTS idx_counts_date ON ai_visit_counts(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_counts_site ON ai_visit_counts(site_slug, visit_date DESC);

CREATE TABLE IF NOT EXISTS ai_visit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_slug TEXT NOT NULL DEFAULT '',
  visit_date TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  bot_pattern TEXT NOT NULL,
  bot_name TEXT NOT NULL,
  ua TEXT,
  page_path TEXT,
  referer TEXT,
  source TEXT DEFAULT 'proxy',
  bot_owner TEXT,
  bot_region TEXT
);
CREATE INDEX IF NOT EXISTS idx_logs_site_date ON ai_visit_logs(site_slug, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_logs_date ON ai_visit_logs(visit_date DESC);
