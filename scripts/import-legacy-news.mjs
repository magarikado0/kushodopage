import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { parse, serialize } from 'parse5';

const sourceOrigin = 'https://www.kushodo.club';
const outputFile = join(process.cwd(), 'src', 'content', 'legacy-news.json');
const assetRoot = join(process.cwd(), 'public', 'legacy', 'news-assets');
const imageCache = new Map();

const sources = [
  ['135_shoten', '2025-06-21', '書展'],
  ['133_shoten', '2024-05-24', '書展'],
  ['132_shoten', '2024-02-04', '書展'],
  ['131_shoten', '2023-05-26', '書展'],
  ['129_shoten', '2022-06-05', '書展'],
  ['OBten_6', '2021-11-09', '書展'],
  ['127_shoten', '2021-06-30', '書展'],
  ['126_shoten', '2020-12-30', '書展'],
  ['OBten_5', '2020-12-20', '書展'],
  ['125_shoten', '2020-04-27', '書展'],
  ['OBten_4', '2019-11-20', '書展'],
  ['NFmogiten2019', '2019-11-01', '活動'],
  ['NFshoten2019', '2019-11-01', '書展'],
  ['NF2019performance', '2019-11-01', '活動'],
  ['NF2019', '2019-11-01', '活動'],
  ['124_shoten', '2019-12-12', '書展'],
  ['OBten_3', '2019-06-09', '書展'],
  ['123_shoten', '2019-06-01', '書展'],
  ['NFmogiten2018', '2018-11-01', '活動'],
  ['NFshoten2018', '2018-11-01', '書展'],
  ['NF2018performance', '2018-11-01', '活動'],
  ['NF2018', '2018-11-01', '活動'],
  ['122_shoten', '2018-12-01', '書展'],
  ['121_shoten', '2018-06-19', '書展'],
];

const cleanText = (value) => value.replace(/\s+/g, ' ').trim();

function attr(node, name) {
  return node.attrs?.find((item) => item.name === name)?.value;
}

function setAttr(node, name, value) {
  node.attrs ??= [];
  const existing = node.attrs.find((item) => item.name === name);
  if (existing) existing.value = value;
  else node.attrs.push({ name, value });
}

function hasClass(node, className) {
  return (attr(node, 'class') ?? '').split(/\s+/).includes(className);
}

function walk(node, visit) {
  visit(node);
  for (const child of node.childNodes ?? []) walk(child, visit);
}

function find(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node.childNodes ?? []) {
    const match = find(child, predicate);
    if (match) return match;
  }
  return null;
}

function textContent(node) {
  let text = node.value ?? '';
  for (const child of node.childNodes ?? []) text += textContent(child);
  return text;
}

function removeNodes(node, predicate) {
  if (!node.childNodes) return;
  node.childNodes = node.childNodes.filter((child) => !predicate(child));
  for (const child of node.childNodes) removeNodes(child, predicate);
}

async function downloadImage(url) {
  const candidates = [
    url,
    url.replace('/img/news/%E6%9B%B8%E5%B1%95/', '/img/news/shoten/'),
    url.replace('/img/news/書展/', '/img/news/shoten/'),
  ];

  for (const candidate of [...new Set(candidates)]) {
    const response = await fetch(candidate);
    if (!response.ok) continue;
    return Buffer.from(await response.arrayBuffer());
  }

  console.warn(`画像を取得できないため本文から除外します: ${url}`);
  return null;
}

async function importPage(id, date, category) {
  const pageUrl = `${sourceOrigin}/news/${id}.html`;
  const response = await fetch(pageUrl);
  if (!response.ok) throw new Error(`ページ取得失敗: ${response.status} ${pageUrl}`);

  const document = parse(await response.text());
  const titleNode = find(document, (node) => node.tagName === 'title');
  const contentNode = find(
    document,
    (node) => node.tagName === 'div' && hasClass(node, 'border') && hasClass(node, 'col-md-8'),
  );

  if (!contentNode) throw new Error(`本文が見つかりません: ${pageUrl}`);

  const title = cleanText(textContent(titleNode).split('｜')[0]);

  removeNodes(
    contentNode,
    (node) =>
      node.tagName === 'script' ||
      node.tagName === 'style' ||
      hasClass(node, 'carousel-control-prev') ||
      hasClass(node, 'carousel-control-next') ||
      hasClass(node, 'carousel-indicators'),
  );

  const imageNodes = [];
  walk(contentNode, (node) => {
    if (node.tagName === 'img' && attr(node, 'src')) imageNodes.push(node);
  });

  for (const imageNode of imageNodes) {
    const imageUrl = new URL(attr(imageNode, 'src'), pageUrl).href;
    let localUrl = imageCache.get(imageUrl);

    if (!localUrl) {
      const image = await downloadImage(imageUrl);
      if (image) {
        const hash = createHash('sha256').update(image).digest('hex').slice(0, 20);
        const extension = extname(new URL(imageUrl).pathname).toLowerCase() || '.jpg';
        const fileName = `${hash}${extension}`;
        await writeFile(join(assetRoot, fileName), image);
        localUrl = `/legacy/news-assets/${fileName}`;
        imageCache.set(imageUrl, localUrl);
      }
    }

    if (!localUrl) {
      setAttr(imageNode, 'data-import-missing', 'true');
      continue;
    }
    setAttr(imageNode, 'src', localUrl);
    setAttr(imageNode, 'loading', 'lazy');
    if (!attr(imageNode, 'alt')) setAttr(imageNode, 'alt', title);
  }

  removeNodes(contentNode, (node) => attr(node, 'data-import-missing') === 'true');

  walk(contentNode, (node) => {
    if (node.tagName === 'a' && attr(node, 'href')) {
      const href = attr(node, 'href');
      if (href.startsWith('#')) return;
      const resolved = new URL(href, pageUrl);
      const legacyNewsMatch = resolved.pathname.match(/^\/news\/([^/]+)\.html$/);
      setAttr(node, 'href', legacyNewsMatch ? `/news/${legacyNewsMatch[1]}` : resolved.href);
    }

    if (!node.attrs) return;
    node.attrs = node.attrs.filter(
      ({ name }) =>
        !name.startsWith('data-') &&
        !['class', 'id', 'style', 'align', 'width', 'height', 'frame', 'rules', 'cellpadding'].includes(
          name,
        ),
    );
  });

  return {
    id,
    title,
    category,
    content: serialize(contentNode),
    publishedAt: `${date}T00:00:00.000+09:00`,
    legacyUrl: pageUrl,
  };
}

await mkdir(join(process.cwd(), 'src', 'content'), { recursive: true });
await mkdir(assetRoot, { recursive: true });

const imported = [];
for (const source of sources) {
  const item = await importPage(...source);
  imported.push(item);
  console.log(`${item.id}: ${item.title}`);
}

imported.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
await writeFile(outputFile, `${JSON.stringify(imported, null, 2)}\n`, 'utf8');

console.log(`\n${imported.length}件を ${outputFile} に保存しました。`);
