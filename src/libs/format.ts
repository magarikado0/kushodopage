/** 日付を「2024.11.02」形式に整形 */
export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

/** 日付を「2024年12月13日（金）」形式に整形 */
export function formatDateJP(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${dow}）`;
}

/** 日付を「12月13日（金）」形式に整形 */
export function formatDateJPWithoutYear(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日（${dow}）`;
}

/** 開始日〜終了日 を表示用文字列に */
export function formatDateRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '';
  const sameDay = s.toDateString() === e.toDateString();

  // microCMSの「日時」で登録された場合は開催時刻も表示する。
  // 日付だけの既存データは従来どおり日付のみ表示する。
  if (startIso.includes('T') || endIso.includes('T')) {
    const timeFormatter = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const startTime = timeFormatter.format(s);
    const endTime = timeFormatter.format(e);
    if (sameDay) return `${formatDateJP(startIso)} ${startTime}〜${endTime}`;
    return `${formatDateJP(startIso)} ${startTime}〜${formatDateJP(endIso)} ${endTime}`;
  }

  if (sameDay) return formatDateJP(startIso);
  return `${formatDateJP(startIso)}〜${formatDateJPWithoutYear(endIso)}`;
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
