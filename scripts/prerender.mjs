/**
 * Build step that runs after `vite build` (see the "build" script in package.json).
 *
 * A React single-page app ships ONE empty HTML file, so crawlers and link-preview bots would see the
 * same title and no content for every URL. This script fixes that without a server:
 *
 *   dist/index.html                 home page, with its own title / description / JSON-LD
 *   dist/shop/index.html            one file per indexable page (products, shop, policies)
 *   dist/product/<slug>/index.html  ...
 *   dist/app-shell.html             neutral "noindex" shell for every other URL (cart, checkout, 404 ...)
 *   dist/sitemap.xml, dist/robots.txt
 *
 * React still takes over in the browser exactly as before; the static HTML is what Google, Bing,
 * WhatsApp, Facebook and X read first. All page data comes from src/shared/seo/pages.ts, so there is
 * one place to edit it.
 */
import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

/** Escape text for use inside an HTML attribute or element. */
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** JSON for a <script> block: `<` is escaped so "</script>" inside data can never end the block. */
const jsonForScript = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

// 1. Load the TypeScript SEO module by bundling it with esbuild (same aliases/env as the app).
const viteEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('VITE_')));
const bundled = await build({
  entryPoints: [path.join(root, 'src/shared/seo/pages.ts')],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  alias: { '@': path.join(root, 'src') },
  define: { 'import.meta.env': JSON.stringify(viteEnv) },
  logLevel: 'error',
});
const seo = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const { listIndexablePages, absoluteUrl } = seo;

// 2. Read the built shell Vite produced.
const template = await readFile(path.join(dist, 'index.html'), 'utf8');
const SEO_BLOCK = /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/;
if (!SEO_BLOCK.test(template)) throw new Error('index.html is missing the <!-- seo:start --> ... <!-- seo:end --> block.');

function headFor(page) {
  const title = esc(page.title);
  const description = esc(page.description);
  const robots = page.noindex ? 'noindex, nofollow' : 'index, follow';
  const url = esc(absoluteUrl(page.path));
  const image = esc(absoluteUrl(page.image ?? '/images/products/silver-frame-01.webp'));
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:site_name" content="Silveram" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta property="og:type" content="${page.path.startsWith('/product/') ? 'product' : 'website'}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    ...page.jsonLd.map((entry) => `<script type="application/ld+json" data-prerendered>${jsonForScript(entry)}</script>`),
  ].join('\n    ');
}

function render(page) {
  let html = template.replace(SEO_BLOCK, () => `<!-- seo -->\n    ${headFor(page)}`);
  if (page.fallbackHtml) {
    html = html.replace(/<noscript>[\s\S]*?<\/noscript>/, () => `<noscript>${page.fallbackHtml}</noscript>`);
  }
  return html;
}

async function writePage(urlPath, html) {
  const file = urlPath === '/' ? path.join(dist, 'index.html') : path.join(dist, urlPath, 'index.html');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html);
}

// 3. Neutral shell for every non-indexable URL. It must be written BEFORE index.html is overwritten.
const shell = template.replace(SEO_BLOCK, () => `<!-- seo -->\n    ${[
  '<title>Silveram</title>',
  '<meta name="robots" content="noindex, nofollow" />',
].join('\n    ')}`);
await writeFile(path.join(dist, 'app-shell.html'), shell);

// 4. One static file per page.
const pages = listIndexablePages();
for (const page of pages) await writePage(page.path, render(page));

// 5. sitemap.xml (only indexable pages) and robots.txt.
const today = new Date().toISOString().slice(0, 10);
const urls = pages
  .filter((page) => !page.noindex)
  .map((page) => {
    const images = page.path.startsWith('/product/') && page.image
      ? `\n    <image:image><image:loc>${esc(absoluteUrl(page.image))}</image:loc></image:image>`
      : '';
    const priority = page.path === '/' ? '1.0' : page.path === '/shop' ? '0.9' : '0.8';
    return `  <url>\n    <loc>${esc(absoluteUrl(page.path))}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${priority}</priority>${images}\n  </url>`;
  })
  .join('\n');
await writeFile(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>\n`,
);
// Private pages are kept out of search with an X-Robots-Tag header (vercel.json), NOT with Disallow:
// a crawler that is blocked by robots.txt can never see the noindex instruction.
await writeFile(
  path.join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`,
);

console.log(`prerender: ${pages.length} pages, ${pages.filter((p) => !p.noindex).length} in sitemap.xml into dist/`);
