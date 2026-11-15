# 京都大学書道部 公式サイト

京都大学書道部（kushodo.club）の公式サイトです。
**この README はサイトの仕組みを変える人（開発担当）向け**です。お知らせや書展を更新するだけなら [docs/運用マニュアル.md](docs/運用マニュアル.md) を読んでください。

- サイトの本体: [Astro](https://astro.build/)（静的サイト）
- 公開: [Cloudflare Pages](https://pages.cloudflare.com/)（GitHub の `master` に push すると自動で公開）
- 文章・画像の管理: [microCMS](https://microcms.jp/)（管理画面で公開すると自動でサイトを作り直す）
- パンフレット PDF: Google Drive

---

## 全体の流れ

```
microCMS で公開 ──Webhook──▶ Cloudflare Pages がビルド ──▶ サイトに反映（数分）
GitHub に push ─────────────▶ Cloudflare Pages がビルド ──▶ サイトに反映
```

ビルドのときに microCMS からすべてのデータを取ってきて、HTML を作り切ります。表示するたびに microCMS へ問い合わせることはありません。
そのため **microCMS を更新しても、ビルドが終わるまではサイトに出ません。**

---

## アカウント一覧

| サービス | 何に使うか | 持ち主・入り方 | 備考 |
| --- | --- | --- | --- |
| GitHub `publickushodo-art/kushodopage` | コード | 京大書道部のアカウント（publickushodo-art）。開発担当を Collaborator に追加する | 旧リポジトリ `magarikado0/kushodopage` は使わない |
| microCMS（サービス `kushodo`） | 文章・画像 | 京大書道部の Google アカウントでも入れる | 無料プラン（API は5個まで。4個使用中） |
| Cloudflare Pages（`kushodopage`） | 公開 | **個人アカウント（要移行）** | 下の「Cloudflare を部のアカウントに移す」 |
| Google Drive | パンフレット PDF | 京都大学書道部広報係（public.kushodo@gmail.com） | 「パンフレット」フォルダ。「リンクを知っている全員」で共有 |
| ドメイン `kushodo.club` | URL | **要確認**（登録先・更新時期） | 期限切れに注意 |
| さくらのレンタルサーバー `kshodobu.sakura.ne.jp` | 旧サイト・部員用ページ | **要確認** | |

> 引き継ぐときは、この表の「要確認」を埋めて、次の担当者が入れることを必ず確かめてください。

---

## 手元で動かす

```bash
npm install
cp .env.example .env   # 中身を書く（下の「環境変数」）
npm run dev            # http://localhost:4321
```

Node.js は `.nvmrc` のバージョン（22）を使います。

### 環境変数

| 名前 | 内容 |
| --- | --- |
| `MICROCMS_SERVICE_DOMAIN` | `kushodo`（`kushodo.microcms.io` の `kushodo` の部分） |
| `MICROCMS_API_KEY` | microCMS の API キー（管理画面 → 権限管理 → API キー） |

API キーには、各 API の取得（GET）の権限に加えて、**マネジメント API で API 情報を取得する権限**を付けてください。パフォーマンスの種類の並び順を読むのに使います（なくても動きますが、並び順が登録順になります）。

`.env` は秘密情報なので GitHub に上げてはいけません（`.gitignore` 済み）。

### ビルドの確認

```bash
npm run build     # 型チェック（astro check）と dist/ への出力
npm run preview   # できたものを確認
```

---

## microCMS の API

| API | 形式 | 使う場所 |
| --- | --- | --- |
| `news` お知らせ | リスト | トップ、お知らせ一覧・記事 |
| `exhibitions` 書展 | リスト | トップの「前回／次回の書展」、作品紹介、書展ページ、パンフレット |
| `performances` パフォーマンス | リスト | 作品紹介 |
| `settings` サイト設定 | オブジェクト | トップの写真（複数なら5秒ごとに切り替え）と紹介文、書道部について（練習日・部室・入部案内・連絡先）、ヘッダーの SNS |

型は `src/types/content.ts`（`settings` だけ `src/libs/settings.ts`）にあります。

### 決まりごと

- **書展**: 開始日がない回は「会期不明の回」として、作品紹介の「そのほかの回」にまとめて出ます。トップには出ません。
- **トップの書展**: 「次回の書展」（`featured`）にチェックが付いた回があればそれを出します。なければ会期が終わっていない直近の回、それもなければ最後に開いた回を「前回の書展」として出します（`getHeroExhibition`）。
- **パフォーマンスの種類・お知らせのカテゴリ**: 見出しや選択肢はコードに書いていません。管理画面でセレクトの選択肢を増やせば、そのまま使えます。パフォーマンスの見出しの順番は、管理画面の選択肢の並び順です。
- **サイト設定**: 項目が空なら `src/libs/settings.ts` の `DEFAULTS` を使います。消してしまってもページは空になりません。トップの写真の初期値は、旧サイトのトップで切り替えていた4枚（`public/hero/`）です。
- **日付**: microCMS の日付は日本時間で読みます（Cloudflare のビルドは UTC で動くため。`src/libs/format.ts`）。
- **コンテンツ ID**: microCMS の ID は小文字・数字・`-`・`_` だけ使えます。お知らせの ID はそのまま URL（`/news/〇〇`）になります。

---

## パンフレット（PDF ビューアー）

書展の「パンフレットURL」に入っているリンクで表示方法が変わります（`src/libs/pamphlet.ts`）。

| リンク | 表示 |
| --- | --- |
| Google Drive の共有リンク | サイト内の横めくりビューアー（`/exhibitions/〇〇/pamphlet`） |
| `.pdf` で終わる URL | 同じくビューアー |
| それ以外（旧サイトの BiB/i など） | そのリンクを開く |

Drive の PDF はブラウザから直接読めないので、`functions/pamphlet/[id].js`（Cloudflare Pages Functions）が中継します。

- 中継するのは、ビルド時に作る `/pamphlets.json`（書展 ID → Drive のファイル ID）に載っているファイルだけです。他人のファイルの中継には使えません。
- 取得した PDF は Cloudflare に 7 日間キャッシュします。キャッシュは Drive のファイル ID ごとなので、新しいファイルのリンクに貼り替えればすぐ反映されます。Drive 上で同じファイルを上書きした場合は、最大 7 日間古いものが出ます。
- Drive の共有設定が「リンクを知っている全員」でないと、ビューアーに「読み込めませんでした」と出ます。

パンフレットは、部の Google アカウント（京都大学書道部広報係）の Drive の「パンフレット」フォルダにあります。第98〜133回は旧サイトの BiB/i（EPUB）をページ画像のまま PDF にして Web 用に縮小したもの、第134・135回は原本の PDF です。

---

## 公開（Cloudflare Pages）

| 設定 | 値 |
| --- | --- |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| 環境変数 | `MICROCMS_SERVICE_DOMAIN`、`MICROCMS_API_KEY`（**Production と Preview の両方**に入れる） |

- `master` 以外のブランチを push すると、`ブランチ名.kushodopage.pages.dev` にプレビューができます。Preview に環境変数がないと、プレビューでは microCMS の中身が空になります。
- 旧サイトの URL（`about.html` など）からの転送は `public/_redirects` に書いてあります。旧サイトのパンフレットのリンク（`/bib/i/?book=123`）は、URL の `?` 以降を `_redirects` で扱えないので、`functions/bib/[[path]].js` でその回のビューアーへ転送しています。

### microCMS の更新で自動ビルドする

1. Cloudflare → Pages プロジェクト → Settings → Builds で **Deploy hook** を作る（ブランチは `master`）
2. microCMS → 各 API（`news`・`exhibitions`・`performances`・`settings`）→ API 設定 → **Webhook** に、上の URL を登録する

**新しい API を作ったら、Webhook の設定も忘れずに。** 忘れると、その API を更新してもサイトが変わりません。

### Cloudflare を部のアカウントに移す

Cloudflare はメンバーを追加するとアカウント内の全プロジェクトが見えてしまうので、**部の Google アカウントで Cloudflare アカウントを新しく作り、そこでプロジェクトを作り直す**のが確実です（プロジェクトを別のアカウントへ移す機能はありません）。

1. 部の Google アカウントで Cloudflare に登録する
2. Workers & Pages → Create → Pages → Connect to Git で、GitHub の `kushodopage` を選ぶ（上の表のとおり設定する）
3. Production と Preview に環境変数を入れる
4. Custom domains に `kushodo.club` を追加し、ドメインの DNS を新しいプロジェクトに向ける
5. 新しいプロジェクトで Deploy hook を作り、microCMS の Webhook の URL を差し替える
6. 動作を確かめてから、古いプロジェクトを削除する

---

## コードの場所

```
src/
├── components/        Nav（ヘッダー）, Footer, Hero（トップの最初の画面）, NewsList, ExhibitionList, PerformanceList など
├── layouts/Base.astro HTML の共通部分
├── libs/
│   ├── microcms.ts    microCMS からの取得（お知らせ・書展・パフォーマンス）
│   ├── settings.ts    サイト設定の取得と初期値
│   ├── pamphlet.ts    パンフレットの表示方法の判定
│   ├── format.ts      日付の整形（日本時間）
│   └── site.ts        サイト名・メニュー
├── pages/             URL ごとのページ（about.astro → /about）
├── styles/global.css  色・書体などの共通設定
└── types/content.ts   microCMS のデータの型
functions/              Cloudflare Pages Functions（pamphlet/: パンフレット PDF の中継、bib/: 旧パンフレット URL の転送）
scripts/               旧サイトからの移行スクリプト
public/                画像・_redirects など、そのまま公開するファイル
docs/                  運用マニュアル（編集担当向け）
```

### よくある変更

| やりたいこと | 場所 |
| --- | --- |
| 色を変える | `src/styles/global.css` の `:root`（`--color-primary` がリンクやボタンの朱、`--color-rule` が区切り線の朱） |
| 書体を変える | 同じく `--font-display`（見出し）、`--font-sans`（本文） |
| メニューを変える | `src/libs/site.ts` の `NAV_ITEMS` |
| 練習日・連絡先・トップの写真 | **コードではなく** microCMS の「サイト設定」 |
| 書道部についての長い文章 | `src/pages/about.astro` |

### デザインの決まりごと

以前の版が「AI が作ったっぽい」と言われたので、次のことを避けています。変えるときも気をつけてください。

- 意味もなく小さい字（最小 14px）や、グレーの字（補足の文字も本文と同じ墨色）
- 英字の飾りラベル、番号付きの見出し（01, 02…）、矢印（→）の多用
- 小さなカードをたくさん並べること（カードはトップの「前回の書展」だけ）
- 朱色の使いすぎ（リンク・ボタン・区切り線・フッターなど要所だけ）

---

## 移行スクリプト

旧サイト（kushodo.club）から microCMS へのデータ移行に使ったものです。普段は使いません。

```bash
node --env-file=.env scripts/migrate-to-microcms.mjs [news|exhibitions|performances|settings]
```

- 何度実行しても同じ結果になります（ID を固定して上書き）。
- **管理画面で直した内容も、実行するとスクリプトの内容で上書きされます。** 移行が終わった今は、基本的に実行しないでください。
- 画像は microCMS のメディアに上げ、`scripts/microcms-media-map.json` に記録します（二重に上げないため）。

---

## Claude Code などの AI に頼むとき

コードを書いたことがなくても、AI のコーディングツールを使えばかなりの変更ができます。頼むときは次を伝えるとうまくいきます。

- 「この README を読んでから作業して」
- 変えたい場所（URL やスクリーンショット）と、どう変えたいか
- 「`npm run build` が通ることを確かめて」
- 「push する前に確認させて」

頼み方の例:

- 「作品紹介ページに、合宿の写真を載せるセクションを足して。写真は microCMS で管理できるようにして」
- 「書道部についてページの『年間行事』を microCMS で編集できるようにして」
