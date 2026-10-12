/**
 * 旧サイト（kushodo.club）から移行したデータを microCMS に登録する。
 *
 *   node --env-file=.env scripts/migrate-to-microcms.mjs
 *
 * - 何度実行しても同じ結果になる（コンテンツIDを固定して PUT する）
 * - 画像は microCMS のメディアにアップロードし、URL を scripts/microcms-media-map.json に記録する
 */
import { readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

const domain = process.env.MICROCMS_SERVICE_DOMAIN;
const apiKey = process.env.MICROCMS_API_KEY;
if (!domain || !apiKey) throw new Error('MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY が未設定です');

const contentApi = `https://${domain}.microcms.io/api/v1`;
const managementApi = `https://${domain}.microcms-management.io/api/v1`;
const headers = { 'X-MICROCMS-API-KEY': apiKey };
const root = process.cwd();
const mediaMapFile = join(root, 'scripts', 'microcms-media-map.json');

const only = process.argv[2]; // news | exhibitions | performances（省略時は全部）

/* ---------------------------------------------------------------- */
/* HTTP                                                               */
/* ---------------------------------------------------------------- */

async function request(url, init = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { ...init, headers: { ...headers, ...init.headers } });
    if (res.status === 429 && attempt < 5) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    const text = await res.text();
    if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${url} -> ${res.status} ${text}`);
    return text ? JSON.parse(text) : null;
  }
}

/** ID を指定して作成し、既にあれば上書き更新する */
async function putContent(endpoint, id, body) {
  const init = {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  };
  try {
    return await request(`${contentApi}/${endpoint}/${id}`, { ...init, method: 'PUT' });
  } catch (error) {
    if (!String(error.message).includes('already exists')) throw error;
    return request(`${contentApi}/${endpoint}/${id}`, { ...init, method: 'PATCH' });
  }
}

/* ---------------------------------------------------------------- */
/* メディア                                                           */
/* ---------------------------------------------------------------- */

let mediaMap = {};
try {
  mediaMap = JSON.parse(await readFile(mediaMapFile, 'utf8'));
} catch {}

/** public/ 配下の画像をアップロードして microCMS の URL を返す（記録済みなら再利用） */
async function uploadImage(publicPath) {
  if (mediaMap[publicPath]) return mediaMap[publicPath];
  const file = await readFile(join(root, 'public', publicPath));
  const form = new FormData();
  const ext = extname(publicPath).slice(1).toLowerCase();
  const type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  form.append('file', new Blob([file], { type }), basename(publicPath));
  const { url } = await request(`${managementApi}/media`, { method: 'POST', body: form });
  mediaMap[publicPath] = url;
  await writeFile(mediaMapFile, `${JSON.stringify(mediaMap, null, 2)}\n`);
  return url;
}

/* ---------------------------------------------------------------- */
/* お知らせ                                                           */
/* ---------------------------------------------------------------- */

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** リッチエディタが受け付けない要素を置き換え、画像を microCMS に移す */
async function convertContent(html) {
  let out = html;

  // iframe（YouTube・Google マップ）はリッチエディタで消えるのでリンクにする
  out = out.replace(/<iframe\b[^>]*\bsrc="([^"]+)"[^>]*>\s*<\/iframe>/g, (_, src) => {
    const url = src.startsWith('//') ? `https:${src}` : src;
    const youtube = url.match(/youtube\.com\/embed\/([\w-]+)/);
    if (youtube) {
      const watch = `https://www.youtube.com/watch?v=${youtube[1]}`;
      return `<p><a href="${watch}">動画を YouTube で見る</a></p>`;
    }
    if (url.includes('google.com/maps')) {
      return `<p><a href="${escapeHtml(url.replace('/embed?', '?output=embed&'))}">地図を開く（Google マップ）</a></p>`;
    }
    return `<p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`;
  });

  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');

  // 画像を包むリンクはリッチエディタで消えるので、画像の下にテキストリンクを置く
  out = out.replace(/<a\b[^>]*\bhref="([^"]+)"[^>]*>\s*(<img\b[^>]*>)\s*<\/a>/g, (_, href, img) => {
    const alt = img.match(/\balt="([^"]*)"/)?.[1] || '詳しく見る';
    return `${img}</p><p><a href="${href}">${alt}</a>`;
  });

  // 記事同士のリンクも小文字IDに合わせる
  out = out.replace(/href="\/news\/([^"]+)"/g, (_, id) => `href="/news/${id.toLowerCase()}"`);

  // ローカル画像 → microCMS メディア
  const srcs = [...new Set([...out.matchAll(/src="(\/legacy\/[^"]+)"/g)].map((m) => m[1]))];
  for (const src of srcs) {
    const url = await uploadImage(src);
    out = out.split(`src="${src}"`).join(`src="${url}"`);
  }
  return out;
}

async function migrateNews() {
  const legacy = JSON.parse(await readFile(join(root, 'src/content/legacy-news.json'), 'utf8'));
  for (const item of legacy) {
    const content = await convertContent(item.content);
    const category = Array.isArray(item.category) ? item.category : [item.category];
    // publishedAt を渡すと旧サイトの掲載日がそのまま公開日時になる
    // microCMS のコンテンツIDは小文字のみ（旧URLは _redirects で転送）
    await putContent('news', item.id.toLowerCase(), {
      title: item.title,
      content,
      category,
      publishedAt: item.publishedAt,
    });
    console.log(`news  ${item.id.toLowerCase()}`);
  }
}

/* ---------------------------------------------------------------- */
/* 書展（旧サイトのお知らせ記事に会期・会場が載っているもの）           */
/* ---------------------------------------------------------------- */

const bib = (book) => `https://www.kushodo.club/bib/i/?book=${book}`;
const kenninjiAccess =
  'アクセス：阪急「河原町」駅から徒歩12分、京阪「祇園四条」駅から徒歩8分、市バス「東山安井」から徒歩5分。';
const horikawaAccess =
  'アクセス：地下鉄「二条城前」駅2番出口から徒歩2分、市バス「堀川御池」から徒歩1〜3分。';

const exhibitions = [
  {
    id: 'shoten-135',
    title: '第135回 鴨夏展',
    startDate: '2025-06-28',
    endDate: '2025-06-29',
    venue: '堀川御池ギャラリー',
    address: '京都市中京区',
    description: `この回から夏の書展の名称を「初夏書展」から「鴨夏展（おうかてん）」に改めました。時間は28日11:00〜18:30、29日11:00〜17:00（各日30分前に受付終了）。入場無料。${horikawaAccess}`,
    heroImage: '/legacy/news-assets/332aab3f9246004c523d.jpg',
    brochureUrl: 'https://drive.google.com/file/d/1qvBPyG-Y3k85wi_kos-VHQuIO3ZSssZO/view',
  },
  {
    id: 'shoten-134',
    title: '第134回 冬樟展',
    startDate: '2025-02-15',
    endDate: '2025-02-16',
    venue: '京都市京セラ美術館 1階北西展示室',
    address: '京都市左京区',
    description: '時間は15日10:00〜17:30、16日10:00〜16:00（各日30分前に入場終了）。入場無料。',
    heroImage: '/legacy/news-assets/shoten-134-cover.jpg',
    brochureUrl: 'https://drive.google.com/file/d/1U5E1kq8DhVeZkdoIGgB7FwNtWXCRkn-a/view',
  },
  {
    id: 'shoten-133',
    title: '第133回 初夏書展',
    startDate: '2024-06-08',
    endDate: '2024-06-09',
    venue: '堀川御池ギャラリー',
    address: '京都市中京区',
    description: `時間は8日11:00〜18:30、9日11:00〜17:00（各日30分前に受付終了）。入場無料。${horikawaAccess}`,
    heroImage: '/legacy/news-assets/3a1f40f4a1a7c49ad984.jpg',
    brochureUrl: bib('133'),
  },
  {
    id: 'shoten-132',
    title: '第132回 冬樟展',
    startDate: '2024-02-10',
    endDate: '2024-02-11',
    venue: '京都文化博物館 6階',
    address: '京都市中京区',
    description:
      '時間は10日10:00〜17:00、11日10:00〜16:00（各日30分前に受付終了）。入場無料。アクセス：地下鉄「烏丸御池」駅から徒歩3分、阪急「烏丸」駅から徒歩7分、市バス「堺町御池」から徒歩2分。',
    heroImage: '/legacy/news-assets/456d775258be8e11c01e.jpg',
    brochureUrl: bib('132'),
  },
  {
    id: 'shoten-131',
    title: '第131回 初夏書展',
    startDate: '2023-06-10',
    endDate: '2023-06-11',
    venue: '建仁寺 西来院・禅居庵',
    address: '京都市東山区',
    description: `時間は10日10:00〜17:00、11日10:00〜16:00（15:30受付終了）。入場無料。${kenninjiAccess}`,
    brochureUrl: bib('131'),
  },
  {
    id: 'shoten-129',
    title: '第129回 初夏書展',
    startDate: '2022-06-11',
    endDate: '2022-06-12',
    venue: '建仁寺 西来院',
    address: '京都市東山区',
    description:
      '新型コロナウイルスの影響で続いたオンライン開催を経て、久しぶりの対面開催となりました。時間は10:00〜17:00（12日は受付16:00まで）。入場無料。',
    brochureUrl: bib('129'),
  },
  {
    id: 'shoten-124',
    title: '第124回 冬樟展',
    startDate: '2019-12-14',
    endDate: '2019-12-15',
    venue: '建仁寺 西来院・禅居庵',
    address: '京都市東山区',
    description: `時間は10:00〜17:00（15日は受付16:00まで）。入場無料。${kenninjiAccess}`,
    brochureUrl: bib('124'),
  },
  {
    id: 'shoten-123',
    title: '第123回 初夏書展',
    startDate: '2019-06-15',
    endDate: '2019-06-16',
    venue: '建仁寺 西来院・禅居庵',
    address: '京都市東山区',
    description: `時間は10:00〜17:00（16日は受付16:00まで）。入場無料。${kenninjiAccess}`,
    brochureUrl: bib('123'),
  },
  {
    id: 'shoten-122',
    title: '第122回 冬樟展',
    startDate: '2018-12-15',
    endDate: '2018-12-16',
    venue: '建仁寺 西来院・禅居庵',
    address: '京都市東山区',
    description: `時間は10:00〜17:00（16日は受付16:00まで）。入場無料。${kenninjiAccess}`,
    heroImage: '/legacy/news-assets/aa829f26a2d9359cedd3.jpg',
    brochureUrl: bib('122'),
  },
  {
    id: 'shoten-121',
    title: '第121回 初夏書展',
    startDate: '2018-06-16',
    endDate: '2018-06-17',
    venue: '建仁寺 西来院・禅居庵',
    address: '京都市東山区',
    description: `時間は10:00〜17:00（17日は受付16:00まで）。${kenninjiAccess}`,
    brochureUrl: bib('121'),
  },
];

// 会期・会場が分からない回（パンフレットのみ旧サイトに残っていたもの）
const bibBook = (n) => String(n).padStart(3, '0');
exhibitions.push(
  {
    id: 'shoten-127',
    title: '第127回 初夏書展',
    venue: 'オンライン開催',
    description: '前回の冬樟展に続き、新型コロナウイルスの影響でオンラインで開催しました。',
    brochureUrl: bib('127'),
  },
  {
    id: 'shoten-126',
    title: '第126回 冬樟展',
    venue: 'オンライン開催',
    description: '新型コロナウイルスの影響で、オンラインで開催しました。',
    brochureUrl: bib('126'),
  },
  {
    id: 'shoten-125',
    title: '第125回 初夏書展（中止）',
    startDate: '2020-06-13',
    endDate: '2020-06-14',
    description: '新型コロナウイルス感染症の拡大を受けて、開催を中止しました。',
  },
  ...[130, 128, ...Array.from({ length: 23 }, (_, i) => 120 - i)].map((n) => ({
    id: `shoten-${n}`,
    title: `第${n}回 書展`,
    description: '会期・会場の記録が残っていないため、パンフレットのみ掲載しています。',
    brochureUrl: bib(bibBook(n)),
  })),
);

/** 日付を microCMS の日付フィールド形式（JST 0時）にする */
const jstMidnight = (date) => new Date(`${date}T00:00:00+09:00`).toISOString();

async function migrateExhibitions() {
  for (const { id, heroImage, startDate, endDate, ...rest } of exhibitions) {
    const body = { ...rest, featured: false };
    if (startDate) {
      body.startDate = jstMidnight(startDate);
      body.endDate = jstMidnight(endDate);
      body.publishedAt = jstMidnight(startDate);
    }
    if (heroImage) body.heroImage = await uploadImage(heroImage);
    await putContent('exhibitions', id, body);
    console.log(`exhibition  ${id}`);
  }
}

/* ---------------------------------------------------------------- */
/* 書道パフォーマンス（旧サイト works.html より）                       */
/* ---------------------------------------------------------------- */

const NF = 'NF書道パフォーマンス';
const SHINKAN = '新歓書道パフォーマンス';

const performances = [
  // NF 2023・2024 は登録済み
  [NF, 2022, 'https://photos.app.goo.gl/iW3NRfshowsp5YDt5'],
  [NF, 2021, 'https://photos.app.goo.gl/joVVUtuKTLNhcmnh7'],
  [NF, 2020, 'https://photos.app.goo.gl/ug7mHnLGRHG2Lta49'],
  [NF, 2019, 'https://photos.app.goo.gl/KJ8tGsWJs6k2p98s5'],
  [NF, 2018, 'https://photos.app.goo.gl/N8Y66Aik4RnVWBqB7'],
  [NF, 2017, 'https://photos.app.goo.gl/CuqHyS5EQ6wjUdIW2'],
  [NF, 2016, 'https://vimeo.com/album/4981881'],
  [NF, 2015, 'https://www.facebook.com/kyodaishodobu/videos', '動画は書道部の Facebook に掲載しています。'],
  [NF, 2014, 'https://www.facebook.com/kyodaishodobu/videos', '動画は書道部の Facebook に掲載しています。'],
  [NF, 2013, 'https://vimeo.com/81314759'],
  [NF, 2012, 'https://vimeo.com/album/4982115'],
  [NF, 2011, 'https://vimeo.com/254093407'],
  [SHINKAN, 2025, 'https://photos.app.goo.gl/iPtoQ4L6SHRRJDX98'],
  // 旧サイトでは 2023年と2024年が同じリンクだったため、2024年のみ登録
  [SHINKAN, 2024, 'https://photos.app.goo.gl/sGVtrmQ9QUUG9WdC7'],
  [SHINKAN, 2021, 'https://photos.app.goo.gl/kWhu2Z8yTfcbTNnm7'],
  [SHINKAN, 2019, 'https://photos.app.goo.gl/yHBzJBxPPz4yw9McA'],
  [SHINKAN, 2018, 'https://photos.app.goo.gl/mskfNKIeTXWVkFIi2'],
  [SHINKAN, 2017, 'https://www.youtube.com/playlist?list=PLKLGmqffP5DqAaMeIgdTFjGwYu0L4pHxg'],
];

async function migratePerformances() {
  for (const [type, year, url, description] of performances) {
    const id = `${type === NF ? 'nf' : 'shinkan'}-${year}`;
    const body = { type: [type], year, url };
    if (description) body.description = description;
    await putContent('performances', id, body);
    console.log(`performance  ${id}`);
  }
}

if (!only || only === 'news') await migrateNews();
if (!only || only === 'exhibitions') await migrateExhibitions();
if (!only || only === 'performances') await migratePerformances();
console.log('done');
