import { defineConfig } from 'astro/config';

// Cloudflare Pages は静的サイトとして配信。
// MicroCMS Webhook → Cloudflare Deploy Hook でビルドをトリガーし、
// 常に最新のコンテンツを静的生成する構成。
export default defineConfig({
  site: 'https://kushodo.club',
  output: 'static',
  trailingSlash: 'ignore',
  prefetch: true,
  build: {
    inlineStylesheets: 'auto',
  },
});
