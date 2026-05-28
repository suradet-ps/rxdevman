# Visitor Tracking Feature

## Project Overview

Add a visitor tracking system to **rxdevman.com** (Astro framework) that counts page views for:

- The **Home page** (`/`) — display total unique visitors
- **Blog post pages** (`.mdx` files under `/posts/*`) — display per-article view counts

Data is stored in **Supabase**. Counting is IP-based with daily hashing for privacy. Refreshing the page counts as a new view; the goal is honest unique-visitor tracking, not bot/spam resistance.

---

## Tech Stack

| Layer        | Technology                                                                   |
| ------------ | ---------------------------------------------------------------------------- |
| Framework    | Astro (SSR mode or hybrid)                                                   |
| Blog content | `.mdx` files                                                                 |
| Backend API  | Astro API Routes (`src/pages/api/`)                                          |
| Database     | Supabase (PostgreSQL)                                                        |
| Auth         | Supabase anon key (public, read-only) + service role key (server-side write) |

---

## Database Schema

Create the following tables in Supabase. All table names use the `rxdevman_` prefix.

### `rxdevman_page_views`

Stores every individual hit. IP is never stored raw — always hashed.

```sql
CREATE TABLE rxdevman_page_views (
  id          BIGSERIAL PRIMARY KEY,
  page_slug   TEXT        NOT NULL,  -- e.g. '/' or '/posts/my-article'
  ip_hash     TEXT        NOT NULL,  -- SHA-256(ip + date + HASH_SALT)
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  country     TEXT,                  -- optional, from CF-IPCountry header
  user_agent  TEXT                   -- optional, raw user-agent string
);

CREATE INDEX idx_rxdevman_pv_slug ON rxdevman_page_views (page_slug);
CREATE INDEX idx_rxdevman_pv_hash ON rxdevman_page_views (ip_hash);
CREATE INDEX idx_rxdevman_pv_date ON rxdevman_page_views (viewed_at);
```

### `rxdevman_view_counts`

Pre-aggregated counts for fast UI reads. Updated atomically via RPC on every hit.

```sql
CREATE TABLE rxdevman_view_counts (
  page_slug       TEXT PRIMARY KEY,
  total_views     BIGINT NOT NULL DEFAULT 0,   -- every hit, including repeat IPs
  unique_visitors BIGINT NOT NULL DEFAULT 0,   -- distinct ip_hash count
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### RPC Function — `increment_view_count`

Must be created in Supabase SQL editor. Called server-side after every INSERT.

```sql
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
```

---

## Environment Variables

Add to `.env` (never commit to git):

```env
HASH_SALT=<random-32-char-string>
PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

- **`HASH_SALT`** — secret salt mixed into the IP hash. Generate once with `openssl rand -hex 16`.
- **`PUBLIC_SUPABASE_URL`** and **`PUBLIC_SUPABASE_ANON_KEY`** — safe to expose client-side (read-only usage).
- **`SUPABASE_SERVICE_ROLE_KEY`** — server-side only. Never expose to the browser.

---

## Files to Create / Modify

### 1. `src/lib/supabase.ts`

Initialize two Supabase clients: one for server (write), one for client (read).

```typescript
import { createClient } from '@supabase/supabase-js';

// Server-side client — has write access via service role key
export const supabaseServer = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

// Client-side client — anon key, read-only usage
export const supabasePublic = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);
```

### 2. `src/lib/hash.ts`

SHA-256 helper using the Web Crypto API (works in both Node and edge runtimes).

```typescript
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### 3. `src/pages/api/track.ts`

API route that receives POST requests and writes to Supabase.

```typescript
import type { APIRoute } from 'astro';
import { sha256 } from '../../lib/hash';
import { supabaseServer } from '../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { slug } = await request.json() as { slug: string };

    if (!slug || typeof slug !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid slug' }), { status: 400 });
    }

    // Extract real IP (works behind Cloudflare / Vercel / Netlify)
    const ip
      = request.headers.get('cf-connecting-ip')
        ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? request.headers.get('x-real-ip')
        ?? 'unknown';

    // Daily salt prevents permanent tracking across days
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const ipHash = await sha256(`${ip}:${today}:${import.meta.env.HASH_SALT}`);

    // Insert raw hit
    const { error: insertError } = await supabaseServer
      .from('rxdevman_page_views')
      .insert({
        page_slug: slug,
        ip_hash: ipHash,
        country: request.headers.get('cf-ipcountry') ?? null,
        user_agent: request.headers.get('user-agent') ?? null,
      });

    if (insertError)
      throw insertError;

    // Update aggregate counts atomically
    const { error: rpcError } = await supabaseServer
      .rpc('increment_view_count', { p_slug: slug });

    if (rpcError)
      throw rpcError;

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  catch (err) {
    console.error('[track] error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
};
```

### 4. `src/components/ViewCounter.astro`

Reusable component. Renders the count from Supabase and fires the tracking call on mount.

```astro
---
// Props
// Server-side: fetch current count for SSR display
import { supabaseServer } from '../lib/supabase';

interface Props {
  slug: string; // page slug to track, e.g. '/' or '/posts/my-article'
  label?: string; // display label, default: 'visitors'
}

const { slug, label = 'visitors' } = Astro.props;
const { data } = await supabaseServer
  .from('rxdevman_view_counts')
  .select('unique_visitors')
  .eq('page_slug', slug)
  .single();

const count = data?.unique_visitors ?? 0;
---

<span class="view-counter" data-slug={slug}>
  {count.toLocaleString()} {label}
</span>

<script>
// Fire tracking call after page load — client-side only
document.addEventListener('DOMContentLoaded', async () => {
  const el = document.querySelector<HTMLElement>('.view-counter');
  if (!el)
    return;

  const slug = el.dataset.slug!;

  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });
  }
  catch {
    // Silently fail — tracking should never break the page
  }
});
</script>
```

### 5. Usage in pages

**Home page** (`src/pages/index.astro`):

```astro
---
import ViewCounter from '../components/ViewCounter.astro';
---

<!-- somewhere in your layout -->
<ViewCounter slug="/" label="visitors" />
```

**Blog post page** (layout wrapping `.mdx` files, e.g. `src/layouts/PostLayout.astro`):

```astro
---
import ViewCounter from '../components/ViewCounter.astro';

const { slug } = Astro.props; // slug passed from frontmatter or getStaticPaths
---

<ViewCounter slug={`/posts/${slug}`} label="views" />
```

---

## Astro Config Requirement

The API route requires **SSR mode** (or hybrid rendering). Ensure `astro.config.mjs` has:

```js
export default defineConfig({
  output: 'server', // or 'hybrid'
  // ...
});
```

If using `hybrid`, add `export const prerender = false` at the top of `src/pages/api/track.ts`.

---

## Implementation Checklist

- [ ] Create `rxdevman_page_views` table in Supabase
- [ ] Create `rxdevman_view_counts` table in Supabase
- [ ] Create `increment_view_count` RPC function in Supabase SQL editor
- [ ] Set Row Level Security (RLS): allow INSERT from service role only; allow SELECT for anon
- [ ] Add all env vars to `.env` and hosting provider secrets
- [ ] Create `src/lib/supabase.ts`
- [ ] Create `src/lib/hash.ts`
- [ ] Create `src/pages/api/track.ts`
- [ ] Create `src/components/ViewCounter.astro`
- [ ] Add `<ViewCounter slug="/" />` to Home page
- [ ] Add `<ViewCounter slug={...} />` to blog post layout
- [ ] Verify Astro output mode is `server` or `hybrid`
- [ ] Test locally with `astro dev`
- [ ] Deploy and confirm hits appear in Supabase dashboard

---

## RLS Policy (Supabase)

Run in SQL editor to lock down table access. Both tables must have RLS enabled before going to production.

```sql
-- ─────────────────────────────────────────────
-- rxdevman_page_views
-- ─────────────────────────────────────────────
ALTER TABLE rxdevman_page_views ENABLE ROW LEVEL SECURITY;

-- No SELECT policy for anon — ip_hash must never be publicly readable
-- No INSERT policy for anon — all writes go through the service role key (API route)
-- The increment_view_count RPC is defined with SECURITY DEFINER so it runs as
-- the table owner and bypasses RLS on behalf of the service role.

-- ─────────────────────────────────────────────
-- rxdevman_view_counts
-- ─────────────────────────────────────────────
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
```

### RLS Summary Table

| Table                  | anon SELECT | anon INSERT | anon UPDATE | service_role   |
| ---------------------- | ----------- | ----------- | ----------- | -------------- |
| `rxdevman_page_views`  | ❌ blocked  | ❌ blocked  | ❌ blocked  | ✅ full access |
| `rxdevman_view_counts` | ✅ allowed  | ❌ blocked  | ❌ blocked  | ✅ full access |

---

## Notes for the Agent

- **Do not store raw IP addresses** anywhere. Always hash with `sha256(ip + date + HASH_SALT)`.
- **Do not block the page render** on the tracking call. The `fetch('/api/track')` must be fire-and-forget inside a try/catch.
- **The displayed count is SSR-rendered** (from `rxdevman_view_counts`), so it shows the count at request time. The +1 from the current visitor is added client-side after load — a slight lag is acceptable and expected.
- **One `ViewCounter` component per page.** Do not mount multiple instances on the same page.
- **Slug format**: always use the pathname starting with `/`. Home is `"/"`, posts are `"/posts/<slug>"`.
- If the `rxdevman_view_counts` row does not exist yet for a slug, the component displays `0` gracefully — no error handling needed beyond the null coalesce.
