/**
 * Cloudflare Pages Function: /pamphlet/:id
 *
 * Google Drive に置いたパンフレット PDF を、サイトと同じドメインから返す。
 * （Drive は他サイトからの直接読み込みを許可していないため、ここで中継する）
 *
 * - 中継するのは /pamphlets.json（ビルド時に microCMS から生成）に載っているファイルだけ
 * - 取得した PDF は Cloudflare のキャッシュに保存し、Drive へのアクセスを減らす
 */
const CACHE_SECONDS = 60 * 60 * 24 * 7;

export async function onRequestGet({ params, request, env, waitUntil }) {
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const mapRes = await env.ASSETS.fetch(new URL('/pamphlets.json', request.url));
  const map = mapRes.ok ? await mapRes.json() : {};
  const fileId = map[params.id];
  if (!fileId) return new Response('Not found', { status: 404 });

  const upstream = await fetch(
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`,
  );
  // Drive は PDF を application/octet-stream で返す。
  // 共有設定が「リンクを知っている全員」になっていないと HTML のログイン画面が返ってくる
  const type = upstream.headers.get('Content-Type') ?? '';
  if (!upstream.ok || type.includes('text/html')) {
    return new Response('Pamphlet is not available', { status: 502 });
  }

  const response = new Response(upstream.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
    },
  });
  waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
