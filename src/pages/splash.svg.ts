import type { APIRoute } from 'astro';
import { splashSvg } from '~/libs/splash';

/** サイト全体の背景に敷く飛沫のタイル画像（global.css の body から参照） */
export const GET: APIRoute = () =>
  new Response(splashSvg({ color: '#bf3624', blots: 22 }), {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
