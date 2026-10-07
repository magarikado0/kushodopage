/**
 * microCMS の日付は JST 0時を UTC で表した値（例: 2025-06-27T15:00:00.000Z）なので、
 * ビルド環境のタイムゾーン（Cloudflare は UTC）に関係なく日本時間で読む。
 */
const jstParts = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function toJst(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return null;
  const parts = Object.fromEntries(jstParts.formatToParts(d).map((p) => [p.type, p.value]));
  return {
    y: Number(parts.year),
    m: Number(parts.month),
    d: Number(parts.day),
    dow: parts.weekday,
    time: `${parts.hour}:${parts.minute}`,
  };
}

/** 日付を「2024.11.02」形式に整形 */
export function formatDate(iso: string | Date): string {
  const t = toJst(iso);
  if (!t) return '';
  return `${t.y}.${String(t.m).padStart(2, '0')}.${String(t.d).padStart(2, '0')}`;
}

/** 日付を「2024年12月13日（金）」形式に整形 */
export function formatDateJP(iso: string | Date): string {
  const t = toJst(iso);
  return t ? `${t.y}年${t.m}月${t.d}日（${t.dow}）` : '';
}

/** 日付を「12月13日（金）」形式に整形 */
export function formatDateJPWithoutYear(iso: string | Date): string {
  const t = toJst(iso);
  return t ? `${t.m}月${t.d}日（${t.dow}）` : '';
}

/** 開始日〜終了日 を表示用文字列に。0時ちょうどでなければ時刻も出す */
export function formatDateRange(startIso: string, endIso: string): string {
  const s = toJst(startIso);
  const e = toJst(endIso);
  if (!s || !e) return '';
  const sameDay = s.y === e.y && s.m === e.m && s.d === e.d;
  const hasTime = s.time !== '00:00' || e.time !== '00:00';

  if (hasTime) {
    if (sameDay) return `${formatDateJP(startIso)} ${s.time}〜${e.time}`;
    return `${formatDateJP(startIso)} ${s.time}〜${formatDateJP(endIso)} ${e.time}`;
  }
  if (sameDay) return formatDateJP(startIso);
  return `${formatDateJP(startIso)}〜${formatDateJPWithoutYear(endIso)}`;
}

/** 開催年（日本時間） */
export function yearOf(iso: string): number | null {
  return toJst(iso)?.y ?? null;
}

/** HTML本文をプレーンテキストに（お知らせ一覧の抜粋用） */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function excerpt(text: string, length = 80): string {
  const plain = stripHtml(text);
  return plain.length > length ? `${plain.slice(0, length)}…` : plain;
}
