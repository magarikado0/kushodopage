/**
 * MicroCMS のスキーマ定義
 * 管理画面 (microcms.jp) で同名の API を作成し、各フィールドを定義してください。
 * 詳細は README.md の「MicroCMS セットアップ」を参照。
 */

/** お知らせ (news) */
export type NewsCategory = '書展' | '活動' | '入部' | 'お知らせ';

export interface NewsItem {
  id: string;
  title: string;
  category: NewsCategory | NewsCategory[];
  /** トップページなど一覧表示用の短い広報文 */
  description?: string;
  /** 本文: リッチエディタ または マークダウン */
  content: string;
  /** MicroCMS のシステムフィールド */
  publishedAt: string;
  revisedAt?: string;
  /** 旧サイトから移行した記事の出典URL */
  legacyUrl?: string;
}

export interface WorkImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

/** 書展 (exhibitions) */
export interface Exhibition {
  id: string;
  /** 例: 第136回 冬樟展 */
  title: string;
  /** 開催日（ISO 文字列） */
  startDate: string;
  /** 終了日（ISO 文字列） */
  endDate: string;
  /** 会場名 */
  venue: string;
  /** 住所（任意） */
  address?: string;
  /** 書展の紹介文 */
  description: string;
  /** メインビジュアル（任意） */
  heroImage?: WorkImage;
  /** 書展パンフレットへのリンク */
  brochureUrl?: string;
  /** Artoir 上の作品アーカイブへのリンク */
  artoirUrl?: string;
  /** 次回の書展としてトップに表示するか */
  featured?: boolean;
  publishedAt: string;
  revisedAt?: string;
}

export type PerformanceType = 'NF書道パフォーマンス' | '新歓書道パフォーマンス';

/** 書道パフォーマンスの記録 (performances) */
export interface Performance {
  id: string;
  year: number;
  type: PerformanceType | PerformanceType[];
  url: string;
  description?: string;
  publishedAt: string;
  revisedAt?: string;
}
