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
   - `VITE_CHANGE_LOG_CSV_URL=...` (optional; default ChangeLog tab is configured in code)
3. Run app:
   - `npm run dev`

## Environment variables

Client-side data loading uses:

- `VITE_HIGH_SCHOOL_CSV_URL`
- `VITE_ELEMENTARY_SCHOOL_CSV_URL`
- `VITE_CLERGY_ORDINATION_CSV_URL`
- `VITE_SCHOOL_VACANCY_CSV_URL`
- `VITE_CHANGE_LOG_CSV_URL` / `VITE_CHANGE_LOG_DATA_URL`
- `VITE_GOOGLE_SHEET_CSV_URL` (optional fallback alias)

Optional local JSON cache sync script uses:

- `GOOGLE_SHEET_PUB_URL`
- `HIGH_SCHOOL_GID`
- `ELEMENTARY_SCHOOL_GID`
- `HIGH_SCHOOL_CSV_URL`
- `ELEMENTARY_SCHOOL_CSV_URL`
- `GOOGLE_SHEET_CSV_URL`
- `SCHOOL_VACANCY_CSV_URL`
- `CHANGE_LOG_CSV_URL`


## Current UI Status

- Apply page is disabled by default (`APPLY_SECTION_ENABLED = false`).
- Download buttons are controlled via feature flags:
  - `DOWNLOAD_PDF_ENABLED`
  - `APPOINTMENT_REPORT_DOWNLOAD_ENABLED`
- Appointment marking uses the `Appointed` field, but the Yes/No column is not shown in the UI or PDFs.
- ChangeLog is available beside Exit Register for High/Higher Secondary, Elementary/Middle, and Clergy lists. It accepts the columns `List name`, `Member ID`, `Name`, `Date`, `Action`, `Information Changed`, `Description of Change`, `Approved by`, and `Documents`.
- ChangeLog document actions show only `View` and `Download`; the UI does not show an `Open in Drive` action.

## Priority Rules (Summary)

- High/Higher Secondary
  - Seniority: earlier registration year -> earlier passing month/year -> older age -> higher TET score (UG).
  - Appointment view: UG candidates with valid TET are prioritized; PG follows the same seniority order.
- Elementary/Middle
  - Seniority: earlier registration year -> earlier passing month/year -> older age -> higher TET %.
  - Appointment view: TET % at/above the pass mark is prioritized; tie-break order remains the same.
- Clergy
  - Earlier year of passing -> more years of experience -> older age.


## Security Notes

This application is currently frontend-only. Any Google Sheet CSV or Drive PDF loaded directly by the browser must be treated as public to a technical user, even if the UI hides the raw URL. Browser DevTools and network traffic can reveal client-fetched URLs and response data.

Current safeguards:

- No sheet editing is performed by the app; published Google Sheet CSV endpoints are read-only from the portal.
- Drive links are not displayed as plain text and the ChangeLog UI only provides `View` and `Download` actions.
- External document actions use `rel="noreferrer"`.
- No Google credentials or private API keys are stored in the frontend.

For private data or links that even technical users must not access directly, move Google Sheet and Drive access behind an authenticated backend/serverless API. The backend should store secrets server-side, enforce user roles, proxy or stream only authorized rows/documents, and keep the source sheet/Drive files private.

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
