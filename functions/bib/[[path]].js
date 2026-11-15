/**
 * Cloudflare Pages Function: /bib/*
 *
 * 旧サイトのパンフレット（BiB/i）のリンク（例: /bib/i/?book=123、/bib/i/?book=134.epub）を、
 * その回のパンフレットのビューアーへ転送する。
 * 回数が分からない・その回のパンフレットがないときは作品紹介へ転送する。
 *
 * URL の ? 以降は public/_redirects では見られないので、ここで処理している。
 */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const book = url.searchParams.get('book') ?? '';
  const number = Number.parseInt(book, 10);

  let destination = '/activities';
  if (Number.isFinite(number)) {
    const id = `shoten-${number}`;
    const mapRes = await env.ASSETS.fetch(new URL('/pamphlets.json', url));
    const map = mapRes.ok ? await mapRes.json() : {};
    if (map[id]) destination = `/exhibitions/${id}/pamphlet`;
  }

  return Response.redirect(new URL(destination, url).toString(), 301);
}
