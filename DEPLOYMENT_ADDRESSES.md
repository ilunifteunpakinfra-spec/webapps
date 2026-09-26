# Deployment Addresses

> **Purpose:** Quick reference for the live deployment addresses of ILUNI FTE WebApps
> (Vercel production app + Supabase project), how they were detected, and how to re-verify them.
>
> **Scope:** Detection/verification only. No credentials are stored in this file.
> **Generated:** 2026-09-26 · **Repo state:** `main` @ `2647147`

---

## 1. Addresses at a Glance


| Service                                     | Address                                                       | Status                                                      |
| --------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------- |
| **Vercel** — production app                | `https://ilunifteunpak.vercel.app`                            | ✅ Live (HTTP 200)                                          |
| **Supabase** — project API / storage       | `https://zotizozgkzzuhrwbxoud.supabase.co`                    | ✅ Live (HTTP 401 on`/rest/v1/` = healthy, apikey required) |
| **Supabase** — direct Postgres (psql only) | `db.zotizozgkzzuhrwbxoud.supabase.co`                         | ⚠️ TLS cert expired — see[§5](#5-known-issues)          |
| **Supabase Dashboard**                      | `https://supabase.com/dashboard/project/zotizozgkzzuhrwbxoud` | Derived from project ref                                    |
| **Docs / User Manual** — GitHub Pages      | `https://ilunifteunpakinfra-spec.github.io/webapps/`          | Deployed from`docs` branch                                  |

**Supabase project ref:** `zotizozgkzzuhrwbxoud`
**Vercel project name:** `ilunifteunpak` (inferred from the production hostname)

> The Vercel **project ID** and **team ID** are *not* recorded anywhere in the repository.
> See [§4](#4-what-is-not-in-the-repo) for how to recover them.

---

## 2. How These Were Detected

### Vercel — `ilunifteunpak.vercel.app`

Committed in documentation:


| File                          | Line    | Content                                        |
| ------------------------------- | --------- | ------------------------------------------------ |
| `README.md`                   | 7       | Production app link in the header table        |
| `README.md`                   | 197     | CI/CD table:`main` → **Vercel — Production** |
| `README.md`                   | 346     | Links section                                  |
| `CONTRIBUTING.md`             | 11      | Branch strategy table                          |
| `docs/DEPLOYMENT_ANALYSIS.md` | 11, 384 | Live status + deploy record                    |

### Supabase — `zotizozgkzzuhrwbxoud.supabase.co`

Not present as a plain literal in source (it is injected at build time via
`NEXT_PUBLIC_SUPABASE_URL`), so it was recovered two ways:

1. **From the live Vercel build** — the URL is inlined into the production
   HTML/JS chunks as a `NEXT_PUBLIC_*` constant. Fetching
   `https://ilunifteunpak.vercel.app` returns 9 occurrences, e.g. in avatar
   preloads:
   ```html
   <link rel="preload" as="image"
         href="https://zotizozgkzzuhrwbxoud.supabase.co/storage/v1/object/public/avatars/...">
   ```
2. **From the deployment report** — `docs/DEPLOYMENT_ANALYSIS.md:217` and `:372`
   reference the same project as `db.zotizozgkzzuhrwbxoud.supabase.co`
   (the `db.` prefix is the direct-Postgres hostname for the *same* project).

### Re-verifying the Supabase URL from a live build

```bash
curl -s https://ilunifteunpak.vercel.app \
  | grep -oE 'https://[a-z0-9]+\.supabase\.co' | sort -u
# https://zotizozgkzzuhrwbxoud.supabase.co
```

---

## 3. Deployment Architecture

```
git push → main
   │
   └─► Vercel (Git Integration, productionBranch: main)
         └─► https://ilunifteunpak.vercel.app
               └─► https://zotizozgkzzuhrwbxoud.supabase.co

git push → docs
   └─► .github/workflows/deploy-docs.yml
         └─► VitePress build + PDF → gh-pages
               └─► https://ilunifteunpakinfra-spec.github.io/webapps/

cron: 0 0 */3 * *   (.github/workflows/keep-alive.yml)
   └─► ping ${{ secrets.SUPABASE_URL }}/rest/v1/
         (prevents free-tier project auto-pause)
```

### Branch → target mapping


| Branch            | Target                   | Mechanism                                                                                       |
| ------------------- | -------------------------- | ------------------------------------------------------------------------------------------------- |
| `main`            | **Vercel — Production** | Vercel Git Integration; all other branches are skipped by the`ignoreCommand` in `vercel.json:3` |
| `docs`            | **GitHub Pages**         | `deploy-docs.yml` → build VitePress, generate PDFs, push to `gh-pages`                         |
| PR →`docs`       | Build check only         | `preview-check` job in `deploy-docs.yml` (no deploy)                                            |
| schedule (3 days) | Supabase keep-alive      | `keep-alive.yml`                                                                                |

> `vercel.json` contains **only** an `ignoreCommand` — no builds, routes, headers
> or rewrites are configured. All routing is Next.js App Router.
> Vercel builds with **npm** (`package-lock.json` wins over `bun.lock`) — keep both
> lockfiles in sync.

---

## 4. What Is *Not* in the Repo


| Item                                     | Where it actually lives             | How to recover                                                                                                 |
| ------------------------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `VERCEL_PROJECT_ID`                      | Vercel project settings             | `vercel project ls` or `vercel link`                                                                           |
| `VERCEL_TEAM_ID`                         | Vercel account                      | `vercel teams ls`                                                                                              |
| `VERCEL_API_TOKEN`                       | Local`.env` + Vercel account tokens | [https://vercel.com/account/tokens](https://vercel.com/account/tokens)                                         |
| `SUPABASE_PROJECT_ID`                    | Local`.env`                         | [https://supabase.com/dashboard/project/_/settings/api](https://supabase.com/dashboard/project/_/settings/api) |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | Vercel project env vars             | Vercel → Project → Settings → Environment Variables                                                         |
| `SUPABASE_SERVICE_ROLE_KEY`              | Vercel project env vars             | Supabase → Project → Settings → API                                                                         |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`      | GitHub repo secrets                 | Settings → Secrets and variables → Actions                                                                   |

Confirmed safe: `.gitignore` excludes `.env`, `.env.*`, `supabase/.env`,
`supabase/.env.local`, and `.vercel/`. Git history shows **no** `.env` or
`.vercel/project.json` was ever committed — only `.env.example` (placeholders)
is tracked.

The only `.env`-style file in this checkout is `.env.example`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
VERCEL_API_TOKEN=your-vercel-api-token-here
VERCEL_PROJECT_ID=your-vercel-project-id-here
SUPABASE_ACCESS_TOKEN=your-supabase-access-token-here
SUPABASE_PROJECT_ID=your-supabase-project-id-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 5. Known Issues


| # | Issue                                                                                                                                                                                                                        | Impact                                                                                                     | Action                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 1 | **TLS certificate expired** on `db.zotizozgkzzuhrwbxoud.supabase.co` (Let's Encrypt `R3`, verify code 10). The project API host `zotizozgkzzuhrwbxoud.supabase.co` is valid (Google Trust Services, valid until 2026-11-24). | `psql` direct connections **fail cert validation**. The app is unaffected — it uses the API/Storage host. | Add`sslmode=require` (or fix the Supabase-side cert). Prefer the dashboard SQL editor over raw `psql`. |
| 2 | **Keep-alive workflow secrets unconfigured** — `keep-alive.yml` needs `SUPABASE_URL` + `SUPABASE_ANON_KEY` in repo secrets.                                                                                                 | Workflow fails (or no-ops) every 3 days; free-tier project may auto-pause.                                 | Repo → Settings → Secrets → add both.                                                               |
| 3 | **Supabase Auth URL config pending** — Site URL + email redirect URLs.                                                                                                                                                      | Email confirmation / password-reset links point at the wrong origin.                                       | Dashboard → Authentication → URL Configuration. Set Site URL to`https://ilunifteunpak.vercel.app`.   |
| 4 | **`SUPABASE_SERVICE_ROLE_KEY` reportedly shared in chat** (per `docs/DEPLOYMENT_ANALYSIS.md:389`).                                                                                                                           | Key exposure risk.                                                                                         | Rotate in the dashboard, then update Vercel env vars.                                                  |
| 5 | `deploy.sh:40` references an undefined variable `$vercel_team_id` (lowercase) instead of `$VERCEL_TEAM_ID`.                                                                                                                  | Prints a malformed Vercel dashboard link on deploy.                                                        | Fix the casing in`scripts/deploy.sh`.                                                                  |
| 6 | `deploy-supabase.sh:36` tests for `.supabase/config.toml` (leading dot); the CLI writes `supabase/config.toml`.                                                                                                              | `supabase link` re-runs on every deploy (works, but noisy/network-dependent).                              | Test for`supabase/.temp/project-ref` or `supabase/config.toml`.                                        |

---

## 6. Verification Commands

```bash
# 1. Vercel production app is up
curl -s -o /dev/null -w '%{http_code}\n' -L https://ilunifteunpak.vercel.app
# expect: 200

# 2. Supabase project is alive (401 = healthy, apikey required)
curl -s -k -o /dev/null -w '%{http_code}\n' \
  https://zotizozgkzzuhrwbxoud.supabase.co/rest/v1/
# expect: 401

# 3. Supabase URL baked into the live build
curl -s https://ilunifteunpak.vercel.app \
  | grep -oE 'https://[a-z0-9]+\.supabase\.co' | sort -u
# expect: https://zotizozgkzzuhrwbxoud.supabase.co

# 4. Route protection is enforced by middleware
curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}\n' \
  https://ilunifteunpak.vercel.app/profil/edit
# expect: 307 -> https://ilunifteunpak.vercel.app/login?next=%2Fprofil%2Fedit

# 5. Docs site is up
curl -s -o /dev/null -w '%{http_code}\n' -L \
  https://ilunifteunpakinfra-spec.github.io/webapps/
# expect: 200
```

### Local dev note

The app fails at runtime with **"URL and Key are required"** when
`NEXT_PUBLIC_SUPABASE_*` are unset at build time. To run locally, copy
`.env.example` → `.env` and fill in real values from the Supabase dashboard.
Note that a **new** `.env` is required per working copy — it is not shared and
is not in version control.

---

## 7. Related Documentation


| Doc                                   | Location                                                                                                 |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Project README (deployment section)   | [`README.md`](./README.md) — Deployment                                                                 |
| Detailed deployment report            | [`docs/DEPLOYMENT_ANALYSIS.md`](./docs/DEPLOYMENT_ANALYSIS.md)                                           |
| Branch strategy / contribution rules  | [`CONTRIBUTING.md`](./CONTRIBUTING.md)                                                                   |
| User manual (VitePress,`docs` branch) | [https://ilunifteunpakinfra-spec.github.io/webapps/](https://ilunifteunpakinfra-spec.github.io/webapps/) |
| Security policy                       | [`SECURITY.md`](./SECURITY.md)                                                                           |

---


authorization token for postman :

vscode://Postman.postman-for-vscode?code=8f457404bb2537f9e925ee184e6450b76d733c6b5976ce952837a46a0f1b841b

**Last verified:** 2026-09-26 · Vercel HTTP 200 · Supabase REST HTTP 401 (alive)
**Repo:** `github.com/ilunifteunpakinfra-spec/webapps` @ `main` (`2647147`)
