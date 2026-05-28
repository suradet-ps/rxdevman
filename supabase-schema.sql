-- ============================================================
-- rxdevman — Visitor Tracking Schema
-- Run this entire script in the Supabase SQL Editor.
-- All tables use the `rxdevman_` prefix.
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. rxdevman_page_views
-- Stores every individual hit. IP is never stored raw — always hashed.
-- ─────────────────────────────────────────────
CREATE TABLE rxdevman_page_views (
  id          BIGSERIAL PRIMARY KEY,
  page_slug   TEXT        NOT NULL,  -- e.g. '/' or '/posts/my-article'
  ip_hash     TEXT        NOT NULL,  -- SHA-256(ip + HASH_SALT)
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  country     TEXT,                  -- optional, from CF-IPCountry header
  user_agent  TEXT                   -- optional, raw user-agent string
);

CREATE INDEX idx_rxdevman_pv_slug ON rxdevman_page_views (page_slug);
CREATE INDEX idx_rxdevman_pv_hash ON rxdevman_page_views (ip_hash);
CREATE INDEX idx_rxdevman_pv_date ON rxdevman_page_views (viewed_at);

-- ─────────────────────────────────────────────
-- 2. rxdevman_view_counts
-- Pre-aggregated counts for fast UI reads. Updated atomically via RPC.
-- ─────────────────────────────────────────────
CREATE TABLE rxdevman_view_counts (
  page_slug       TEXT PRIMARY KEY,
  total_views     BIGINT NOT NULL DEFAULT 0,   -- every hit, including repeat IPs
  unique_visitors BIGINT NOT NULL DEFAULT 0,   -- distinct ip_hash count
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 3. RPC Function — increment_view_count
-- Called server-side after every INSERT into rxdevman_page_views.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_view_count(p_slug TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO rxdevman_view_counts (page_slug, total_views, unique_visitors, updated_at)
  VALUES (p_slug, 1, 1, now())
  ON CONFLICT (page_slug) DO UPDATE SET
    total_views     = rxdevman_view_counts.total_views + 1,
    unique_visitors = (
      SELECT COUNT(DISTINCT ip_hash)
      FROM rxdevman_page_views
      WHERE page_slug = p_slug
    ),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- 4. Row Level Security (RLS)
-- ─────────────────────────────────────────────

-- rxdevman_page_views
ALTER TABLE rxdevman_page_views ENABLE ROW LEVEL SECURITY;

-- No SELECT policy for anon — ip_hash must never be publicly readable
-- No INSERT policy for anon — all writes go through the service role key (API route)
-- The increment_view_count RPC is defined with SECURITY DEFINER so it runs as
-- the table owner and bypasses RLS on behalf of the service role.

-- rxdevman_view_counts
ALTER TABLE rxdevman_view_counts ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) can read aggregate counts — this powers the public view counter UI
CREATE POLICY "rxdevman_view_counts: public select"
  ON rxdevman_view_counts
  FOR SELECT
  TO anon
  USING (true);

-- Only the service role can insert new rows (first hit on a new slug)
CREATE POLICY "rxdevman_view_counts: service role insert"
  ON rxdevman_view_counts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only the service role can update existing counts
CREATE POLICY "rxdevman_view_counts: service role update"
  ON rxdevman_view_counts
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────
-- RLS Summary
-- ─────────────────────────────────────────────
-- Table                    | anon SELECT | anon INSERT | anon UPDATE | service_role
-- rxdevman_page_views      | ❌ blocked  | ❌ blocked  | ❌ blocked  | ✅ full access
-- rxdevman_view_counts     | ✅ allowed  | ❌ blocked  | ❌ blocked  | ✅ full access

-- ─────────────────────────────────────────────
-- 5. Auto-cleanup — ลบข้อมูลเก่า > 90 วัน
-- ─────────────────────────────────────────────

-- เปิดใช้งาน pg_cron (รันครั้งเดียว ถ้ายังไม่ได้เปิด)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ฟังก์ชันสำหรับลบ record ที่เก่ากว่า 90 วัน
CREATE OR REPLACE FUNCTION cleanup_old_page_views()
RETURNS void AS $$
BEGIN
  DELETE FROM rxdevman_page_views
  WHERE viewed_at < now() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- สั่งให้รัน cleanup ทุกวันเวลา 03:00 น.
SELECT cron.schedule(
  'cleanup-old-page-views',   -- job name
  '0 3 * * *',                -- cron expression (ทุกวัน 03:00)
  'SELECT cleanup_old_page_views();'
);
