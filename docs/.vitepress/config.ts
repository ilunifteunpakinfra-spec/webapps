import { defineConfig } from 'vitepress';

// ============================================
// ILUNI FT ELEKTRO UNPAK — User Manual
// VitePress site configuration
// ============================================

// Base path untuk GitHub Pages project site:
// https://ilunifteunpakinfra-spec.github.io/webapps/
export default defineConfig({
  lang: 'id-ID',
  title: 'ILUNI FT ELEKTRO UNPAK',
  description:
    'User Manual Ikatan Alumni Fakultas Teknik Program Studi Teknik Elektro Universitas Pakuan Bogor',
  base: '/webapps/',
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: true,

  // Dokumen analisis lama di root docs/ tidak boleh ikut dipublikasikan.
  srcExclude: [
    '**/CROSS_CHECK_ANALYSIS.md',
    '**/DEPLOYMENT_ANALYSIS.md',
    '**/SUPERADMIN_MODERATION_PLAN.md',
  ],

  // Penting: jangan biarkan Vite memuat postcss.config.js milik app Next.js
  // di root repo (mereferensikan plugin tailwindcss yang tidak ada di
  // node_modules docs). Timpa dengan PostCSS kosong agar build deterministik.
  vite: {
    css: {
      postcss: {
        plugins: [],
      },
    },
  },

  head: [
    ['meta', { name: 'theme-color', content: '#1b3a5c' }],
    [
      'link',
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/webapps/favicon.svg',
      },
    ],
  ],

  themeConfig: {
    logo: '/webapps/favicon.svg',
    nav: [
      { text: 'Beranda', link: '/latest/' },
      { text: 'Panduan Admin', link: '/latest/admin/' },
      { text: 'Pemecahan Masalah', link: '/latest/troubleshooting' },
    ],

    sidebar: [
      {
        text: 'Panduan Pengguna',
        items: [
          { text: 'Tentang Aplikasi', link: '/latest/' },
          { text: 'Memulai', link: '/latest/mulai' },
          { text: 'Profil & Data Diri', link: '/latest/profil' },
          { text: 'Direktori Alumni', link: '/latest/direktori' },
          { text: 'Lowongan Kerja', link: '/latest/lowongan' },
          { text: 'Program Mentoring', link: '/latest/mentoring' },
          { text: 'Sistem Referral', link: '/latest/referral' },
          { text: 'Komunitas & Grup', link: '/latest/grup' },
          { text: 'Pengumuman', link: '/latest/pengumuman' },
          { text: 'Polling', link: '/latest/polling' },
          { text: 'Galeri Kegiatan', link: '/latest/galeri' },
          { text: 'Peringkat Kontribusi', link: '/latest/peringkat' },
          { text: 'Melaporkan Konten', link: '/latest/moderasi' },
        ],
      },
      {
        text: 'Panduan Admin',
        items: [
          { text: 'Ringkasan Panel Admin', link: '/latest/admin/' },
          { text: 'Kelola Pengguna', link: '/latest/admin/pengguna' },
          { text: 'Kelola Alumni', link: '/latest/admin/alumni' },
          { text: 'Moderasi Konten', link: '/latest/admin/moderasi' },
          { text: 'Impor & Ekspor CSV', link: '/latest/admin/impor-ekspor' },
        ],
      },
      {
        text: 'Lainnya',
        items: [{ text: 'Pemecahan Masalah', link: '/latest/troubleshooting' }],
      },
    ],

    outline: {
      level: [2, 3],
      label: 'Di halaman ini',
    },

    docFooter: {
      prev: 'Sebelumnya',
      next: 'Berikutnya',
    },

    darkModeSwitchLabel: 'Mode gelap',
    sidebarMenuLabel: 'Menu',
    returnToTopLabel: 'Kembali ke atas',
    lastUpdated: {
      text: 'Terakhir diperbarui',
      formatOptions: {
        dateStyle: 'full',
        timeStyle: 'short',
      },
    },

    footer: {
      message:
        'Ikatan Alumni Fakultas Teknik Program Studi Teknik Elektro Universitas Pakuan Bogor',
      copyright: 'Hak cipta © 2026 ILUNI FT ELEKTRO UNPAK',
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: 'Cari', buttonAriaLabel: 'Cari dokumen' },
          modal: {
            displayDetails: 'Tampilkan daftar rinci',
            resetButtonTitle: 'Atur ulang pencarian',
            backButtonTitle: 'Kembali',
            noResultsText: 'Tidak ada hasil untuk',
            footer: {
              selectText: 'pilih',
              navigateText: 'navigasi',
              closeText: 'tutup',
            },
          },
        },
      },
    },
  },
});
