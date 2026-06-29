# 京都大学書道部 公式サイト

Astro + Cloudflare Pages + microCMS で構築された、京都大学書道部（kushodo.club）の公式サイトです。

## ページ構成

| パス | 内容 |
| --- | --- |
| `/` | トップページ |
| `/about` | 書道部について・入部案内 |
| `/exhibitions` | 書展一覧 |
| `/exhibitions/[id]` | 書展個別ページ |
| `/news` | お知らせ一覧 |
| `/news/[id]` | お知らせ個別ページ |

## 技術スタック

- **[Astro](https://astro.build/)** 5.x（静的サイト生成 / SSG）
- **[Cloudflare Pages](https://pages.cloudflare.com/)** でホスティング
- **[microCMS](https://microcms.jp/)** でコンテンツ管理
- **Webhook** で microCMS の更新 → Cloudflare 自動ビルド

## ローカル開発

```bash
npm install
npm run dev      # http://localhost:4321
```

microCMS 未接続でも、モックデータで全ページが表示されます（`src/libs/microcms.ts` の末尾にあるモックを編集すれば差し替え可能）。

## 本番ビルド

```bash
npm run build    # dist/ に静的ファイルを出力
npm run preview  # ビルド結果をローカル確認
```

---

## デプロイ手順（Cloudflare Pages）

### 1. Cloudflare Pages でプロジェクト作成

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. GitHub リポジトリを選択
3. ビルド設定:
   - **Framework preset**: `Astro`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variables**:
     - `MICROCMS_SERVICE_DOMAIN` … microCMS のサービスドメイン（`xxx` の部分。`xxx.microcms.jp` の xxx）
     - `MICROCMS_API_KEY` … microCMS の API キー（管理画面 > マイアカウント から取得）

### 2. カスタムドメイン (kushodo.club)

1. 作成した Pages プロジェクト → **Custom domains** → **Set up a custom domain**
2. `kushodo.club` と `www.kushodo.club` を追加
3. ドメインが Cloudflare 以外のレジストラの場合、表示される CNAME/A レコードを DNS に設定
   （Cloudflare でドメイン管理の場合は自動設定されます）

---

## microCMS セットアップ

microCMS 管理画面で以下 **2 つの API** を作成してください。
（API 名は下表の「エンドポイント」そのままにする必要があります。`src/libs/microcms.ts` で使用）

### API 1: `news`（お知らせ）

| フィールド ID | 種類 | 必須 | 内容 |
| --- | --- | --- | --- |
| `title` | テキストフィールド | ○ | お知らせのタイトル |
| `category` | セレクトボックス | ○ | 選択肢: `書展` `活動` `入部` `お知らせ` |
| `content` | リッチエディタ または マークダウン | ○ | 本文 |

> システムフィールド `publishedAt` / `revisedAt` は自動生成されます。

### API 2: `exhibitions`（書展情報）

| フィールド ID | 種類 | 必須 | 内容 |
| --- | --- | --- | --- |
| `title` | テキストフィールド | ○ | 例: `第136回 冬樟展` |
| `year` | 数値フィールド | ○ | 開催年。例: `2024` |
| `startDate` | 日付フィールド | ○ | 開始日 |
| `endDate` | 日付フィールド | ○ | 終了日 |
| `venue` | テキストフィールド | ○ | 会場名 |
| `address` | テキストフィールド | – | 住所 |
| `description` | テキストエリア | ○ | 書展の紹介文 |
| `heroImage` | 画像フィールド | – | メインビジュアル |
| `works` | 繰り返しフィールド（画像） | – | 展示風景の写真（※下記参照） |
| `featured` | 真偽値フィールド | – | `true` にするとトップ「次回の書展」に表示 |

※ `works` は「繰り返しフィールド」で作成し、その中に `image`（画像）と `alt`（テキスト）を含めてください。

### 画像の最適化設定（推奨）

microCMS の画像フィールドは、取得時にクエリでサイズ調整可能です。
表示サイズに合わせて、`src/libs/microcms.ts` で取得時にパラメータ付与も検討してください。

---

## 自動ビルド設定（microCMS Webhook → Cloudflare Pages）

コンテンツ更新時にサイトを自動で再ビルドする仕組みです。

### 1. Cloudflare Pages の Deploy Hook を作成

1. Cloudflare Dashboard → 対象 Pages プロジェクト → **Settings** → **Build & deployments**
2. **Deploy Hooks** → **Add deploy hook**
   - 名前: `microCMS`
   - Branch: 本番ブランチ（`main` / `master`）
3. 作成後、**Deploy Hook URL** が表示されるのでコピー

### 2. microCMS 側で Webhook を設定

1. microCMS 管理画面 → 対象 API（`news`, `exhibitions`）→ **API設定** → **Webhook**
2. 上記 Deploy Hook URL を登録
3. トリガー: コンテンツの **作成 / 更新 / 削除** 時
4. 各 API について同じ URL を設定

これで、microCMS で記事を公開・編集するたびに Cloudflare Pages が自動ビルドされ、数分以内にサイトへ反映されます。

---

## ディレクトリ構成

```
src/
├── components/      # Nav / Footer / Hero / NewsList / ExhibitionList 等の再利用コンポーネント
├── layouts/         # Base.astro（HTML の共通レイアウト）
├── libs/
│   ├── microcms.ts  # microCMS 取得ロジック（未接続時はモックにフォールバック）
│   ├── format.ts    # 日付・テキスト整形ユーティリティ
│   └── site.ts      # サイト名・ナビ定数
├── pages/           # ルーティング。`/about` は `pages/about.astro`
├── styles/global.css
└── types/content.ts # microCMS スキーマの型定義
```

## よくある操作

- **配色を変更**: `src/styles/global.css` の `:root` 内 CSS 変数（`--color-primary` が朱色）
- **ナビを編集**: `src/libs/site.ts` の `NAV_ITEMS`
- **お問い合わせ先を変更**: `src/pages/about.astro` の `.join-card` 内
- **モックデータを編集**（microCMS 接続前）: `src/libs/microcms.ts` の末尾
