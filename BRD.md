# AGENTIC PROMPT: Alumni Database & Networking Platform (v3.0)

You are an expert full-stack engineer and AI coding assistant specializing in Next.js (App Router), Supabase (Postgres, Auth, Storage, RLS), Tailwind CSS, and shadcn/ui. 

Your task is to build a modern, high-performance, non-commercial Alumni Database and Professional Networking Platform based strictly on the provided Business Requirement Document (BRD v3.0).

---

## 1. PROJECT SPECIFICATIONS & TECH STACK

- **Framework**: Next.js (App Router) deployed on Vercel Hobby Tier (Free)[cite: 1]
- **Database & Auth**: Supabase Postgres + Supabase Auth + Supabase Storage[cite: 1]
- **Styling & UI**: Tailwind CSS + shadcn/ui + Lucide Icons[cite: 1]
- **Target Cost**: $0 operational cost (Free Tier Vercel & Supabase)[cite: 1]
- **Core Strategy**: Modular relational database schema with strict Row Level Security (RLS) policies[cite: 1].

---

## 2. DATABASE SCHEMA (SUPABASE POSTGRES)

Generate SQL migrations for Supabase including tables, enums, indexes, and RLS policies based on the specification below:

### 2.1 Enums & Types
- `visibilitas_enum`: `'public'`, `'alumni_only'`, `'private'`[cite: 1]
- `mentoring_status_enum`: `'pending'`, `'diterima'`, `'selesai'`[cite: 1]
- `referral_status_enum`: `'pending'`, `'diterima'`, `'ditolak'`, `'selesai'`[cite: 1]
- `announcement_category_enum`: `'pencapaian'`, `'lowongan'`, `'event'`, `'umum'`[cite: 1]
- `group_type_enum`: `'angkatan'`, `'minat'`[cite: 1]
- `group_role_enum`: `'admin_grup'`, `'anggota'`[cite: 1]

### 2.2 Core Schema Definition
1. **`alumni`**: `id` (UUID, PK), `nama` (text, required), `angkatan` (text/int), `tahun_lulus` (int, required), `pekerjaan` (text), `perusahaan` (text), `alamat_tinggal` (text), `email` (text, unique, required), `no_telepon` (text), `foto_profil` (text/URL), `linkedin` (text), `bio_singkat` (text), `portofolio_url` (text), `resume_url` (text), `contribution_score` (int, default: 0), `status_open_to_work` (boolean, default: false), `status_verifikasi` (boolean, default: false), `visibilitas` (visibilitas_enum, default: 'alumni_only'), `created_at`, `updated_at`[cite: 1].
2. **`skills`**: `id` (UUID, PK), `nama_skill` (text), `kategori` (text - 'hard'/'soft')[cite: 1].
3. **`alumni_skills`**: `alumni_id` (FK), `skill_id` (FK), `level` (int 1-5), `tanggal_input`[cite: 1].
4. **`endorsements`**: `id` (UUID, PK), `endorser_id` (FK -> alumni), `alumni_id` (FK -> alumni), `skill_id` (FK -> skills), `created_at`[cite: 1].
5. **`mentor_profiles`**: `alumni_id` (PK, FK), `bidang_mentoring` (text), `kapasitas_mentee` (int), `status_aktif` (boolean)[cite: 1].
6. **`mentoring_requests`**: `id` (UUID, PK), `mentee_id` (FK), `mentor_id` (FK), `status` (mentoring_status_enum), `pesan` (text)[cite: 1].
7. **`job_postings`**: `id` (UUID, PK), `posted_by` (FK), `judul` (text), `deskripsi` (text), `perusahaan` (text), `lokasi` (text), `skill_required` (text[]), `link_apply` (text), `expired_at` (timestamp)[cite: 1].
8. **`referral_requests`**: `id` (UUID, PK), `requester_id` (FK -> alumni), `target_alumni_id` (FK -> alumni, nullable), `job_posting_id` (FK -> job_postings, nullable), `perusahaan_target` (text), `posisi_target` (text), `pesan` (text), `status` (referral_status_enum), `created_at`[cite: 1].
9. **`announcements`**: `id` (UUID, PK), `posted_by` (FK), `judul` (text), `isi` (text), `kategori` (announcement_category_enum), `created_at`[cite: 1].
10. **`groups`**: `id` (UUID, PK), `nama` (text), `tipe` (group_type_enum), `deskripsi` (text), `created_by` (FK)[cite: 1].
11. **`group_members`**: `group_id` (FK), `alumni_id` (FK), `role` (group_role_enum), `joined_at`[cite: 1].
12. **`polls`**: `id` (UUID, PK), `judul` (text), `deskripsi` (text), `created_by` (FK), `expired_at` (timestamp)[cite: 1].
13. **`poll_options`**: `id` (UUID, PK), `poll_id` (FK), `teks_opsi` (text)[cite: 1].
14. **`poll_votes`**: `id` (UUID, PK), `poll_id` (FK), `option_id` (FK), `alumni_id` (FK), `created_at` (Unique constraint on `poll_id` + `alumni_id`)[cite: 1].
15. **`event_gallery`**: `id` (UUID, PK), `event_id` (text/UUID), `alumni_id` (FK), `foto_url` (text), `caption` (text), `created_at`[cite: 1].

---

## 3. SECURITY & ROW LEVEL SECURITY (RLS) RULES

Enforce strict Supabase RLS policies:
- **Alumni Self-Service**: Users can only UPDATE their own profile (`id = auth.uid()`)[cite: 1].
- **Endorsements**: Prevents self-endorsements (`endorser_id != alumni_id`)[cite: 1].
- **Referral Privacy**: `referral_requests` can ONLY be viewed by `requester_id` OR `target_alumni_id`[cite: 1].
- **Job Postings**: Only verified alumni (`status_verifikasi = true`) can post job listings[cite: 1].
- **Visibility Control**: Unauthenticated/Public access can only see profiles with `visibilitas = 'public'`[cite: 1]. `alumni_only` requires an active session[cite: 1].
- **Admin Rights**: Super Admin & Admin roles bypass RLS for data verification and content moderation[cite: 1].

---

## 4. FUNCTIONAL REQUIREMENTS & ARCHITECTURE

Implement the system following a phased roadmap architecture:

### Phase 1: Core Foundation & Digital Self-Branding
- **Auth & CRUD**: Next.js Auth with Supabase. Admin management and user self-profile management[cite: 1].
- **Directory**: Real-time searchable directory with server-side pagination, filtered by name, year/angkatan, job, city, and skills[cite: 1].
- **Digital Portfolio & Resume**: Profile fields to add external portfolio URLs and upload PDF Resumes directly to Supabase Storage[cite: 1].
- **Skill Badges & Endorsements**: Interactive UI to self-rate skills (1-5) and allow other alumni to endorse them[cite: 1].
- **Open to Work**: Toggle switch updating `status_open_to_work` visibility[cite: 1].
- **Job Board (Basic)**: Job listing dashboard filtered by required skill sets[cite: 1].

### Phase 2: Networking & Engagement
- **Referral System**: Request referral dialog to target alumni in target companies[cite: 1].
- **Mentoring Program**: Registration as mentor, matching workflow (`pending`/`diterima`/`selesai`)[cite: 1].
- **Sub-Communities & Groups**: Dedicated spaces for interest groups or class years (`angkatan`)[cite: 1].
- **Admin Dashboard**: Analytics widgets showing distributions across class years, top industries, Open-to-Work metrics, and active mentors[cite: 1].
- **Wall & Import/Export**: CSV/Excel bulk import/export for admins and community wall announcements[cite: 1].

### Phase 3: Gamification & Engagement
- **Event Photo Gallery**: Upload/view event photos with image compression[cite: 1].
- **Lightweight Polls**: Polling widget with 1-vote-per-user restriction[cite: 1].
- **Contribution Leaderboard**: Gamified ranking system based on cached `contribution_score`[cite: 1].

---

## 5. TECHNICAL & NON-FUNCTIONAL CONSTRAINTS

1. **Storage Optimization**: Implement client-side PDF file size checks (Max 2MB) for resumes and auto-compression/resizing for profile images and event gallery photos before uploading to Supabase Storage[cite: 1].
2. **Performance**: Ensure directory searches and job board queries load under 2 seconds using server-side pagination and optimized indexes[cite: 1].
3. **Keep-Alive Mechanism**: Provide a GitHub Actions workflow YAML configured to ping the Supabase endpoint every 3 days to prevent auto-pausing on the free tier[cite: 1].
4. **Strict Commercial Compliance**: Do NOT integrate any payment gateways, paid sponsorship features, or donation modules (preserves compliance with Vercel Hobby Free Tier terms)[cite: 1].

---

## 6. INSTRUCTIONS FOR IMPLEMENTATION

1. Generate the complete Supabase SQL Schema (`schema.sql`) including all tables, indexes, enums, triggers for `updated_at`, and RLS policies[cite: 1].
2. Provide key Next.js App Router route handlers and server actions for:
   - Profile self-update with resume/image upload[cite: 1].
   - Skill endorsement action with self-endorsement check[cite: 1].
   - Search & Filter server action for alumni directory[cite: 1].
   - Referral request submit & review actions[cite: 1].
3. Include `.github/workflows/keep-alive.yml` for preventing Supabase project inactivity[cite: 1].