import type { APIRoute } from 'astro';

/**
 * 朱の地に重ねる、毛氈（フェルト）のようなごく細かいざらつき。
 * ノイズで濃淡の粒を作り、黒をうっすら乗せるだけ。遠目には無地に見える程度にする。
 * stitchTiles でタイルの継ぎ目が出ないようにしている。
 */
const SIZE = 240;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
<filter id="felt" x="0" y="0" width="100%" height="100%">
<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>
<feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 0.62"/>
</filter>
<rect width="100%" height="100%" filter="url(#felt)" opacity="0.32"/>
</svg>`;

export const GET: APIRoute = () =>
  new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
