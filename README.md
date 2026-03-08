# Seniority Portal

This is a frontend-only React + Vite application.
It fetches published Google Sheets CSV/JSON directly in the browser, so users see latest data without re-deploy.

## Requirements

- Node `20.11.0` (see `.nvmrc`)
- npm `10+`

## Local setup

1. Install:
   - `npm ci`
2. Configure `.env` (client variables):
   - `VITE_HIGH_SCHOOL_CSV_URL=...`
   - `VITE_ELEMENTARY_SCHOOL_CSV_URL=...` (optional)
   - `VITE_CLERGY_ORDINATION_CSV_URL=...` (optional)
   - `VITE_SCHOOL_VACANCY_CSV_URL=...` (optional, for live vacancy list on Apply page)
3. Run app:
   - `npm run dev`

## Environment variables

Client-side data loading uses:

- `VITE_HIGH_SCHOOL_CSV_URL`
- `VITE_ELEMENTARY_SCHOOL_CSV_URL`
- `VITE_CLERGY_ORDINATION_CSV_URL`
- `VITE_SCHOOL_VACANCY_CSV_URL`
- `VITE_GOOGLE_SHEET_CSV_URL` (optional fallback alias)

Optional local JSON cache sync script uses:

- `GOOGLE_SHEET_PUB_URL`
- `HIGH_SCHOOL_GID`
- `ELEMENTARY_SCHOOL_GID`
- `HIGH_SCHOOL_CSV_URL`
- `ELEMENTARY_SCHOOL_CSV_URL`
- `GOOGLE_SHEET_CSV_URL`
- `SCHOOL_VACANCY_CSV_URL`

## Build & deploy

- Build: `npm run build`
- Output directory: `dist`

For Vercel/Netlify/Cloudflare Pages:
- Build command: `npm run build`
- Publish directory: `dist`
- Configure `VITE_*` env vars in cloud settings
- Keep SPA fallback enabled (`vercel.json` is included for Vercel)

## Optional sheet sync workflow

- One-time sync: `npm run sync:sheet`
- Watch sync: `npm run sync:sheet:watch`

## Docker (frontend static)

- Build image: `docker build -t seniority-portal .`
- Run: `docker run --rm -p 8080:80 seniority-portal`
- Open: `http://localhost:8080`
