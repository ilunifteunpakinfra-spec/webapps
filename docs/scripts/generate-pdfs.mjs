// ============================================
// ILUNI FT ELEKTRO UNPAK — User Manual
// generate-pdfs.mjs
//
// Membaca hasil build VitePress (docs/.vitepress/dist),
// merender setiap halaman dengan Chromium headless, lalu
// menghasilkan:
//   1. Satu PDF per halaman  -> docs/public/pdfs/<slug>.pdf
//   2. Satu PDF gabungan     -> docs/public/pdfs/manual-latest.pdf
//
// Salinan PDF terbaru juga disalin ke dist/pdfs agar ikut
// ter-publish di situs (URL: /webapps/pdfs/*.pdf).
//
// Jalankan setelah `vitepress build docs`:
//   node scripts/generate-pdfs.mjs
// ============================================

import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { spawn } from 'node:child_process';
import { mkdir, readdir, readFile, copyFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// --- Lokasi --------------------------------------------------------------
const DOCS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = path.join(DOCS_ROOT, '.vitepress', 'dist');
const PUBLIC_PDFS_DIR = path.join(DOCS_ROOT, 'public', 'pdfs');
const DIST_PDFS_DIR = path.join(DIST_DIR, 'pdfs');
const VITEPRESS_BIN = path.join(DOCS_ROOT, 'node_modules', 'vitepress', 'bin', 'vitepress.js');
const PREVIEW_PORT = 4173;
const BASE_PATH = '/webapps/';

// Urutan halaman pada PDF gabungan (mengikuti struktur sidebar).
const PAGE_ORDER = [
  'latest/index',
  'latest/mulai',
  'latest/profil',
  'latest/direktori',
  'latest/lowongan',
  'latest/mentoring',
  'latest/referral',
  'latest/grup',
  'latest/pengumuman',
  'latest/polling',
  'latest/galeri',
  'latest/peringkat',
  'latest/moderasi',
  'latest/admin/index',
  'latest/admin/pengguna',
  'latest/admin/alumni',
  'latest/admin/moderasi',
  'latest/admin/impor-ekspor',
  'latest/troubleshooting',
];

function log(message) {
  console.log(`[pdf] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // server belum siap, coba lagi
    }
    await sleep(500);
  }
  throw new Error(`Server preview tidak merespons: ${url}`);
}

/** Menjalankan `vitepress preview` dan menunggu hingga siap. */
async function startPreviewServer() {
  log(`Memulai server preview: vitepress preview (port ${PREVIEW_PORT})`);
  const child = spawn(process.execPath, [VITEPRESS_BIN, 'preview', '.', '--port', String(PREVIEW_PORT), '--host', '127.0.0.1'], {
    cwd: DOCS_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => log(`preview: ${String(chunk).trim()}`));
  child.stderr.on('data', (chunk) => {
    const text = String(chunk).trim();
    if (text && !text.includes('ExperimentalWarning')) log(`preview: ${text}`);
  });

  const readyUrl = `http://127.0.0.1:${PREVIEW_PORT}${BASE_PATH}latest/`;
  await waitForServer(readyUrl);
  log('Server preview siap.');
  return child;
}

/** Mengumpulkan halaman HTML dari direktori dist (mengikuti PAGE_ORDER). */
async function collectPages() {
  const found = [];
  for (const slug of PAGE_ORDER) {
    // cleanUrls: setiap halaman (termasuk index) menjadi <slug>.html
    const htmlPath = path.join(DIST_DIR, `${slug}.html`);
    if (existsSync(htmlPath)) {
      found.push({ slug, htmlPath });
    } else {
      log(`  (lewati) halaman tidak ditemukan di dist: ${slug}`);
    }
  }
  return found;
}

/** Mengubah slug menjadi URL di server preview. */
function slugToUrl(slug) {
  if (slug.endsWith('/index')) {
    return `http://127.0.0.1:${PREVIEW_PORT}${BASE_PATH}${slug.replace(/\/index$/, '/')}`;
  }
  return `http://127.0.0.1:${PREVIEW_PORT}${BASE_PATH}${slug}`;
}

/** Merender satu halaman menjadi PDF. */
async function renderPage(browser, url, pdfPath) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
    // Beri waktu font & layout selesai dirender.
    await page.waitForTimeout(800);
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' },
    });
  } finally {
    await page.close();
  }
}

/** Menggabungkan seluruh PDF per halaman menjadi manual-latest.pdf. */
async function mergePdfs(pdfPaths, outputPath) {
  log(`Menggabungkan ${pdfPaths.length} PDF -> ${path.basename(outputPath)}`);
  const merged = await PDFDocument.create();
  for (const pdfPath of pdfPaths) {
    const bytes = await readFile(pdfPath);
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await merged.copyPages(src, src.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }
  const outBytes = await merged.save();
  await mkdir(path.dirname(outputPath), { recursive: true });
  await import('node:fs/promises').then(({ writeFile }) => writeFile(outputPath, outBytes));
}

async function main() {
  if (!existsSync(DIST_DIR)) {
    log(`ERROR: hasil build tidak ditemukan di ${DIST_DIR}`);
    log('Jalankan "npm run build" (vitepress build docs) terlebih dahulu.');
    process.exit(1);
  }

  if (!existsSync(VITEPRESS_BIN)) {
    log(`ERROR: vitepress tidak ditemukan di ${VITEPRESS_BIN}`);
    log('Jalankan "npm install" di folder docs/ terlebih dahulu.');
    process.exit(1);
  }

  const pages = await collectPages();
  if (pages.length === 0) {
    log('ERROR: tidak ada halaman yang ditemukan pada dist.');
    process.exit(1);
  }
  log(`Ditemukan ${pages.length} halaman untuk diekspor.`);

  await mkdir(PUBLIC_PDFS_DIR, { recursive: true });
  await mkdir(DIST_PDFS_DIR, { recursive: true });

  const server = await startPreviewServer();
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const generated = [];
  try {
    for (const { slug } of pages) {
      const outName = `${slug.replaceAll('/', '-')}.pdf`;
      const pdfPath = path.join(PUBLIC_PDFS_DIR, outName);
      const url = slugToUrl(slug);
      log(`Render: ${slug} -> ${outName}`);
      await renderPage(browser, url, pdfPath);
      generated.push(pdfPath);
    }

    // PDF gabungan seluruh halaman.
    const mergedPath = path.join(PUBLIC_PDFS_DIR, 'manual-latest.pdf');
    await mergePdfs(generated, mergedPath);

    // Salin PDF terbaru ke dist/pdfs agar ikut ter-publish.
    await mkdir(DIST_PDFS_DIR, { recursive: true });
    for (const file of await readdir(PUBLIC_PDFS_DIR)) {
      if (file.endsWith('.pdf')) {
        await copyFile(path.join(PUBLIC_PDFS_DIR, file), path.join(DIST_PDFS_DIR, file));
      }
    }
  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }

  log('Selesai. PDF tersedia di:');
  for (const file of await readdir(PUBLIC_PDFS_DIR)) {
    if (file.endsWith('.pdf')) {
      const size = (await stat(path.join(PUBLIC_PDFS_DIR, file))).size;
      log(`  - docs/public/pdfs/${file} (${(size / 1024).toFixed(0)} KB)`);
    }
  }
}

main().catch((error) => {
  console.error('[pdf] Gagal membuat PDF:', error);
  process.exit(1);
});
