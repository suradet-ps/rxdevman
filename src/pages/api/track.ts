import type { APIRoute } from 'astro';

import { sha256 } from '@/lib/hash';
import { getSupabaseServer } from '@/lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { slug } = await request.json() as { slug: string };

    if (!slug || typeof slug !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid slug' }), { status: 400 });
    }

    const ip
      = request.headers.get('cf-connecting-ip')
        ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? request.headers.get('x-real-ip')
        ?? 'unknown';

    const ipHash = await sha256(`${ip}:${import.meta.env.HASH_SALT}`);

    const { error: insertError } = await getSupabaseServer()
      .from('rxdevman_page_views')
      .insert({
        page_slug: slug,
        ip_hash: ipHash,
        country: request.headers.get('cf-ipcountry') ?? null,
        user_agent: request.headers.get('user-agent') ?? null,
      });

    if (insertError)
      throw insertError;

    const { error: rpcError } = await getSupabaseServer()
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
