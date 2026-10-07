import { createClient, type MicroCMSQueries } from 'microcms-js-sdk';
import type { Exhibition, NewsItem, Performance } from '~/types/content';

/**
 * MicroCMS クライアント。
 * 環境変数未設定時は null を返し、各関数は空のデータを返す。
 * これにより、CI・初回ビルド時にもサイトが生成できる。
 */
function getClient() {
  const domain = import.meta.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = import.meta.env.MICROCMS_API_KEY;
  if (!domain || !apiKey) return null;
  return createClient({ serviceDomain: domain, apiKey });
}

const client = getClient();

async function fetchList<T>(endpoint: string, queries?: MicroCMSQueries): Promise<T[]> {
  if (!client) return [];
  const res = await client.getList<T>({ endpoint, queries });
  return res.contents;
}

/** 件数上限（100件）を超えても全件取得する */
async function fetchAll<T>(endpoint: string, queries?: MicroCMSQueries): Promise<T[]> {
  if (!client) return [];
  return client.getAllContents<T>({ endpoint, queries });
}

async function fetchOne<T>(endpoint: string, id: string): Promise<T | null> {
  if (!client) return null;
  try {
    return await client.get<T>({ endpoint, contentId: id });
  } catch {
    return null;
  }
}

/** お知らせ一覧（新着順） */
export async function getNews(limit = 12): Promise<NewsItem[]> {
  return fetchList<NewsItem>('news', { limit, orders: '-publishedAt' });
}

/** お知らせ全件（新着順） */
export async function getAllNews(): Promise<NewsItem[]> {
  return fetchAll<NewsItem>('news', { orders: '-publishedAt' });
}

/** お知らせ詳細 */
export async function getNewsById(id: string): Promise<NewsItem | null> {
  return fetchOne<NewsItem>('news', id);
}

/** タイトルの「第◯回」 */
const editionOf = (e: Exhibition) => Number(e.title.match(/第(\d+)回/)?.[1] ?? 0);

/** 会期が分かる回を新しい順に並べ、そのあとに会期不明の回を回数の新しい順に並べる */
function sortExhibitions(list: Exhibition[]): Exhibition[] {
  return [...list].sort((a, b) => {
    if (a.startDate && b.startDate) return b.startDate.localeCompare(a.startDate);
    if (a.startDate || b.startDate) return a.startDate ? -1 : 1;
    return editionOf(b) - editionOf(a);
  });
}

/** 書展全件（開催日が新しい順） */
export async function getAllExhibitions(): Promise<Exhibition[]> {
  return sortExhibitions(await fetchAll<Exhibition>('exhibitions'));
}

/** 会期が分かる書展（開催日が新しい順） */
export async function getExhibitions(limit = 20): Promise<Exhibition[]> {
  return fetchList<Exhibition>('exhibitions', {
    limit,
    orders: '-startDate',
    filters: 'startDate[exists]',
  });
}

/**
 * トップに出す書展。
 * featured=true のものを優先し、なければ会期が終わっていない直近の書展、
 * それもなければ最後に開催した書展を返す。
 */
export async function getHeroExhibition(): Promise<{
  exhibition: Exhibition;
  upcoming: boolean;
} | null> {
  const list = await getExhibitions(10);
  const now = Date.now();
  const isUpcoming = (e: Exhibition) =>
    !!e.endDate && new Date(e.endDate).getTime() + 86_400_000 > now;

  const featured = list.find((e) => e.featured);
  if (featured) return { exhibition: featured, upcoming: isUpcoming(featured) };

  const next = list.filter(isUpcoming).at(-1);
  if (next) return { exhibition: next, upcoming: true };

  return list[0] ? { exhibition: list[0], upcoming: false } : null;
}

/** 書展詳細 */
export async function getExhibitionById(id: string): Promise<Exhibition | null> {
  return fetchOne<Exhibition>('exhibitions', id);
}

/** 書道パフォーマンスの記録（年度が新しい順） */
export async function getPerformances(): Promise<Performance[]> {
  try {
    const performances = await fetchAll<Performance>('performances', { orders: '-year' });
    const typeOrder = (item: Performance) => {
      const types = Array.isArray(item.type) ? item.type : [item.type];
      return types.includes('NF書道パフォーマンス') ? 0 : 1;
    };
    return performances.sort((a, b) => b.year - a.year || typeOrder(a) - typeOrder(b));
  } catch {
    return [];
  }
}
