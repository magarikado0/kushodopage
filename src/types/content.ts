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
  category: NewsCategory;
  /** 本文: リッチエディタ または マークダウン */
  content: string;
  /** MicroCMS のシステムフィールド */
  publishedAt: string;
  revisedAt?: string;
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
  /** 取材対象年（例: 2024）。一覧表示用 */
  year: number;
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
  /** 今回の書展で展示された作品（任意。works API と重複登録しても OK） */
  works?: WorkImage[];
  /** 次回の書展としてトップに表示するか */
  featured?: boolean;
  publishedAt: string;
  revisedAt?: string;
}
