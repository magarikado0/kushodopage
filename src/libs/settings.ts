import { createClient } from 'microcms-js-sdk';
import type { WorkImage } from '~/types/content';

/**
 * microCMS の「サイト設定」（settings・オブジェクト形式）。
 * 毎年変わりそうな事実（練習日・部室・連絡先・トップの写真など）をここから読む。
 * 項目が空のとき・取得できないときは、下の DEFAULTS を使うのでページが空になることはない。
 */
export interface SiteSettings {
  heroImage?: WorkImage;
  heroLead: string;
  practiceDays: string;
  lecturer: string;
  clubRoom: string;
  clubRoomNote: string;
  practicePlace: string;
  practicePlaceNote: string;
  joinText: string;
  joinPoints: string;
  xAccount: string;
  instagramAccount: string;
  email: string;
}

const DEFAULTS: SiteSettings = {
  heroLead: '漢字・かな・篆刻、古典の臨書から創作まで。\n水曜と土曜に西部課外活動棟で練習しています。',
  practiceDays: '毎週水曜日・土曜日（参加自由）',
  lecturer: '月1回、水曜日に講師の先生',
  clubRoom: '西部課外活動棟 E201',
  clubRoomNote: '紙や墨、書道に関する本、冷蔵庫まであります。部員は24時間いつでも使えます。',
  practicePlace: '西部課外活動棟 E305（共用室）',
  practicePlaceNote:
    '部室の上の階にある広い和室です。一斉練習日はここで練習します。見学に来る方はこちらへどうぞ。',
  joinText:
    '随時入部を受け付けています。まずは見学にお越しください。例会の日程や場所、疑問点など、X（旧 Twitter）の DM または下記連絡先までお気軽にどうぞ。',
  joinPoints: [
    '経験は一切問いません。大学から書道を始めた部員もいます。',
    '道具の選び方や購入方法も先輩がサポートします。',
    '見学だけでも歓迎しています。事前にご連絡ください。',
  ].join('\n'),
  xAccount: 'kucc_E201',
  instagramAccount: 'ku_shodobu',
  email: 'kshodobu.sakura@gmail.com',
};

async function fetchSettings(): Promise<SiteSettings> {
  const domain = import.meta.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = import.meta.env.MICROCMS_API_KEY;
  if (!domain || !apiKey) return DEFAULTS;
  try {
    const client = createClient({ serviceDomain: domain, apiKey });
    const cms = await client.getObject<Partial<SiteSettings>>({ endpoint: 'settings' });
    const merged = { ...DEFAULTS };
    for (const [key, value] of Object.entries(cms)) {
      // 空欄は初期値のまま（消してしまってもページが空にならないように）
      if (key in DEFAULTS || key === 'heroImage') {
        if (typeof value === 'string' ? value.trim() : value) {
          (merged as Record<string, unknown>)[key] = typeof value === 'string' ? value.trim() : value;
        }
      }
    }
    return merged;
  } catch {
    return DEFAULTS;
  }
}

// 全ページのヘッダーなどから呼ばれるので、ビルド中は1回だけ取得する
let cached: Promise<SiteSettings> | undefined;
export function getSettings(): Promise<SiteSettings> {
  cached ??= fetchSettings();
  return cached;
}

/** 改行区切りの文字列を行の配列にする（空行は除く） */
export function lines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export const socialLinks = (s: SiteSettings) => ({
  x: { handle: s.xAccount.replace(/^@/, ''), url: `https://x.com/${s.xAccount.replace(/^@/, '')}` },
  instagram: {
    handle: s.instagramAccount.replace(/^@/, ''),
    url: `https://www.instagram.com/${s.instagramAccount.replace(/^@/, '')}/`,
  },
});
