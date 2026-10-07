/**
 * 書展の brochureUrl（パンフレット）をどう表示するか決める。
 *
 * - Google Drive の共有リンク → サイト内ビューアーで横めくり表示（Drive からは Pages Functions で中継）
 * - .pdf で終わる URL       → そのままビューアーで表示
 * - それ以外（旧 BiB/i など）  → 外部リンクとして開く
 */
export type Pamphlet =
  | { kind: 'viewer'; pdfUrl: string; driveFileId?: string }
  | { kind: 'external'; url: string };

/** Drive の共有リンクからファイルIDを取り出す */
export function driveFileId(url: string): string | null {
  const match =
    url.match(/drive\.google\.com\/file\/d\/([\w-]+)/) ??
    url.match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([\w-]+)/) ??
    url.match(/drive\.usercontent\.google\.com\/download\?(?:.*&)?id=([\w-]+)/);
  return match?.[1] ?? null;
}

export function resolvePamphlet(exhibitionId: string, brochureUrl?: string): Pamphlet | null {
  const url = brochureUrl?.trim();
  if (!url) return null;

  const fileId = driveFileId(url);
  if (fileId) return { kind: 'viewer', pdfUrl: `/pamphlet/${exhibitionId}`, driveFileId: fileId };

  if (/\.pdf(?:$|[?#])/i.test(url)) return { kind: 'viewer', pdfUrl: url };

  return { kind: 'external', url };
}

/** サイト内で開くときのリンク先 */
export function pamphletHref(exhibitionId: string, pamphlet: Pamphlet): string {
  return pamphlet.kind === 'viewer' ? `/exhibitions/${exhibitionId}/pamphlet` : pamphlet.url;
}
