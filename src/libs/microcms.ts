import { createClient, type MicroCMSQueries } from 'microcms-js-sdk';
import type { Exhibition, NewsItem, Performance } from '~/types/content';
import legacyNews from '~/content/legacy-news.json';

/**
 * MicroCMS クライアント。
 * 環境変数未設定時は null を返し、呼び出し側でモックデータにフォールバックする。
 * これにより、CI・初回ビルド時にもサイトが生成できる。
 */
function getClient() {
  const domain = import.meta.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = import.meta.env.MICROCMS_API_KEY;
  if (!domain || !apiKey) return null;
  return createClient({ serviceDomain: domain, apiKey });
}

const client = getClient();
const configured = client !== null;
const localNews = legacyNews as NewsItem[];

async function fetchList<T>(endpoint: string, queries?: MicroCMSQueries): Promise<T[]> {
  if (!client) return [];
  const res = await client.getList<T>({ endpoint, queries });
  return res.contents;
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
  if (!configured) return localNews.slice(0, limit);
  try {
    const cmsNews = await fetchList<NewsItem>('news', {
      limit: Math.min(limit, 100),
      orders: '-publishedAt',
    });
    const cmsIds = new Set(cmsNews.map((item) => item.id));
    return [...cmsNews, ...localNews.filter((item) => !cmsIds.has(item.id))]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, limit);
  } catch {
    return localNews.slice(0, limit);
  }
}

/** お知らせ詳細 */
export async function getNewsById(id: string): Promise<NewsItem | null> {
  const localItem = localNews.find((item) => item.id === id) ?? null;
  if (!configured) return localItem;
  return (await fetchOne<NewsItem>('news', id)) ?? localItem;
}

/** 書展一覧（開催日が新しい順） */
export async function getExhibitions(limit = 20): Promise<Exhibition[]> {
  if (!configured) return mockExhibitions.slice(0, limit);
  try {
    const cmsExhibitions = await fetchList<Exhibition>('exhibitions', {
      limit: Math.min(limit, 100),
      orders: '-startDate',
    });
    const cmsIds = new Set(cmsExhibitions.map((item) => item.id));
    return [...cmsExhibitions, ...mockExhibitions.filter((item) => !cmsIds.has(item.id))]
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
      .slice(0, limit);
  } catch {
    return mockExhibitions.slice(0, limit);
  }
}

/** 次回/注目の書展（featured=true を優先、なければ最新） */
export async function getFeaturedExhibition(): Promise<Exhibition | null> {
  const list = await getExhibitions(10);
  return list.find((e) => e.featured) ?? list[0] ?? null;
}

/** 書展詳細 */
export async function getExhibitionById(id: string): Promise<Exhibition | null> {
  const localItem = mockExhibitions.find((item) => item.id === id) ?? null;
  if (!configured) return localItem;
  return (await fetchOne<Exhibition>('exhibitions', id)) ?? localItem;
}

/** 書道パフォーマンスの記録（年度が新しい順） */
export async function getPerformances(limit = 20): Promise<Performance[]> {
  if (!client) return [];
  try {
    const performances = await fetchList<Performance>('performances', {
      limit: Math.min(limit, 100),
      orders: '-year',
    });
    const typeOrder = (item: Performance) => {
      const types = Array.isArray(item.type) ? item.type : [item.type];
      return types.includes('NF書道パフォーマンス') ? 0 : 1;
    };
    return performances.sort((a, b) => b.year - a.year || typeOrder(a) - typeOrder(b));
  } catch {
    return [];
  }
}

/** 全 news id（静的ルート生成用） */
export async function getAllNewsIds(): Promise<string[]> {
  const list = await getNews(200);
  return list.map((n) => n.id);
}

/** 全 exhibition id（静的ルート生成用） */
export async function getAllExhibitionIds(): Promise<string[]> {
  const list = await getExhibitions(100);
  return list.map((e) => e.id);
}

export const isCmsConfigured = configured;

/* ------------------------------------------------------------------ */
/* モックデータ（MicroCMS 未接続時のみ使用。本番では無視される）          */
/* ------------------------------------------------------------------ */

const mockExhibitions: Exhibition[] = [
  {
    id: 'fuyusho-136',
    title: '第136回 冬樟展',
    startDate: '2024-12-13',
    endDate: '2024-12-15',
    venue: '建仁寺 両足院',
    address: '京都市東山区',
    description:
      '毎年冬に開く当部の代表作展会場。漢字・かな・篆刻まで、部員が1年かけて取り組んだ作品を一堂に公開します。',
    featured: true,
    publishedAt: '2024-11-02T00:00:00.000Z',
  },
  {
    id: 'kamona-135',
    title: '第135回 鴨夏展',
    startDate: '2024-06-14',
    endDate: '2024-06-16',
    venue: '建仁寺 両足院',
    address: '京都市東山区',
    description: '初夏に開催した書展。新入部員の初作品も含め、約60点を展示しました。',
    publishedAt: '2024-06-20T00:00:00.000Z',
  },
];
