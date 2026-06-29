import { createClient, type MicroCMSQueries } from 'microcms-js-sdk';
import type { Exhibition, NewsItem } from '~/types/content';

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
  if (!configured) return mockNews.slice(0, limit);
  return fetchList<NewsItem>('news', {
    limit,
    orders: '-publishedAt',
  });
}

/** お知らせ詳細 */
export async function getNewsById(id: string): Promise<NewsItem | null> {
  if (!configured) return mockNews.find((n) => n.id === id) ?? null;
  return fetchOne<NewsItem>('news', id);
}

/** 書展一覧（開催日が新しい順） */
export async function getExhibitions(limit = 20): Promise<Exhibition[]> {
  if (!configured) return mockExhibitions.slice(0, limit);
  return fetchList<Exhibition>('exhibitions', {
    limit,
    orders: '-startDate',
  });
}

/** 次回/注目の書展（featured=true を優先、なければ最新） */
export async function getFeaturedExhibition(): Promise<Exhibition | null> {
  const list = await getExhibitions(10);
  return list.find((e) => e.featured) ?? list[0] ?? null;
}

/** 書展詳細 */
export async function getExhibitionById(id: string): Promise<Exhibition | null> {
  if (!configured) return mockExhibitions.find((e) => e.id === id) ?? null;
  return fetchOne<Exhibition>('exhibitions', id);
}

/** 全 news id（静的ルート生成用） */
export async function getAllNewsIds(): Promise<string[]> {
  const list = await getNews(100);
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

const mockNews: NewsItem[] = [
  {
    id: 'fuyusho-136',
    title: '第136回 冬樟展のお知らせ',
    category: '書展',
    content:
      '2024年12月13日（金）〜15日（日）の3日間、建仁寺 両足院にて第136回 冬樟展を開催いたします。部員による漢字・かな・篆刻の作品約80点を展示いたします。入場無料・事前予約不要です。皆様のお越しを心よりお待ちしております。',
    publishedAt: '2024-11-02T00:00:00.000Z',
  },
  {
    id: 'kyoto-2024',
    title: '響都展 2024 出品報告',
    category: '活動',
    content:
      '京都の学生書道団体が集う「響都展 2024」に当部から5名が出品いたしました。当日の様子をレポートします。',
    publishedAt: '2024-10-15T00:00:00.000Z',
  },
  {
    id: 'recruit-always',
    title: '随時入部受付中です。お気軽にご連絡ください。',
    category: '入部',
    content:
      '京都大学書道部では随時入部を受け付けています。経験の有無は問いません。見学だけでも大歓迎です。お問い合わせフォームまたは X（旧 Twitter）の DM からご連絡ください。',
    publishedAt: '2024-09-01T00:00:00.000Z',
  },
  {
    id: 'kamona-135',
    title: '第135回 鴨夏展 ご来場ありがとうございました',
    category: '書展',
    content:
      '2024年6月に開催した第135回 鴨夏展には多くの方にご来場いただき、誠にありがとうございました。',
    publishedAt: '2024-06-20T00:00:00.000Z',
  },
];

const mockExhibitions: Exhibition[] = [
  {
    id: 'fuyusho-136',
    title: '第136回 冬樟展',
    year: 2024,
    startDate: '2024-12-13T00:00:00.000Z',
    endDate: '2024-12-15T00:00:00.000Z',
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
    year: 2024,
    startDate: '2024-06-14T00:00:00.000Z',
    endDate: '2024-06-16T00:00:00.000Z',
    venue: '建仁寺 両足院',
    address: '京都市東山区',
    description: '初夏に開催した書展。新入部員の初作品も含め、約60点を展示しました。',
    publishedAt: '2024-06-20T00:00:00.000Z',
  },
];
