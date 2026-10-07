import type { APIRoute } from 'astro';
import { getAllExhibitions } from '~/libs/microcms';
import { resolvePamphlet } from '~/libs/pamphlet';

/**
 * 書展ID → Google Drive のファイルID の対応表。
 * functions/pamphlet/[id].js がこれを見て、載っているファイルだけを中継する。
 */
export const GET: APIRoute = async () => {
  const exhibitions = await getAllExhibitions();
  const map: Record<string, string> = {};
  for (const exhibition of exhibitions) {
    const pamphlet = resolvePamphlet(exhibition.id, exhibition.brochureUrl);
    if (pamphlet?.kind === 'viewer' && pamphlet.driveFileId) {
      map[exhibition.id] = pamphlet.driveFileId;
    }
  }
  return new Response(JSON.stringify(map), {
    headers: { 'Content-Type': 'application/json' },
  });
};
