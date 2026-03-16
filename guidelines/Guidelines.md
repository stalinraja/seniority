# CSI TND Seniority Portal - Guidelines

_Last updated: 2026-03-16_

## 1) Purpose
This portal manages and displays:
- High/Higher Secondary seniority
- Elementary/Middle seniority
- Clergy ordination seniority
- Appointment-made reports (all 3 categories)

Supports bilingual UI (English/Tamil), filters, search, ranking, dashboard charts, and PDF downloads.

## 2) Current Architecture (Frontend Only)

### Stack
- React + Vite
- Shared theme: `packages/ui-theme`
- Chart.js + react-chartjs-2
- jsPDF + jspdf-autotable
- Backend/payment dependencies removed from `package.json`:
  - removed `stripe`, `express`, `cors`, `concurrently`

### Pages
- `/` Dashboard (seniority + filters + charts + appointment report)
- `/apply` Form downloads + vacancy map/dashboard

## 3) Data Loading

### Live seniority fetch
From browser using `fetch()` in:
- `src/app/utils/fetchGoogleSheetData.ts`

Env vars:
- `VITE_HIGH_SCHOOL_CSV_URL`
- `VITE_ELEMENTARY_SCHOOL_CSV_URL`
- `VITE_CLERGY_ORDINATION_CSV_URL`
- `VITE_SCHOOL_VACANCY_CSV_URL`

### Apply page vacancy source
- Live fetch from published vacancy URL:
  - `VITE_SCHOOL_VACANCY_CSV_URL` (or `VITE_SCHOOL_VACANCY_DATA_URL`)
- Fallback if URL is not provided:
  - `public/seniority-data.json`
- Optional generator for fallback file:
  - `npm run sync:sheet`

## 4) Feature Toggles
File: `src/app/config/features.ts`
- `APPLY_SECTION_ENABLED`
- `APPOINTMENT_REPORT_ENABLED`
- `LANGUAGE_SWITCH_ENABLED`
- `HIGH_SCHOOL_SECTION_ENABLED`
- `MIDDLE_SCHOOL_SECTION_ENABLED`
- `CLERGY_SECTION_ENABLED`

## 5) Dashboard Flow
1. Select category tab: High / Elementary / Clergy.
2. Search + filter rows.
3. Use actions:
   - `Dashboard` (charts)
   - `Download PDF` (filtered seniority)
   - `Appointment Made` (panel above filters)
4. In appointment panel:
   - shows appointed candidates only (`Appointed = Yes/Y/True/1`)
   - includes `Appointed`, `Appointed Date`, `Compassion if any`, location
   - location is school/institute for High+Elementary, pastorate for Clergy
5. `Download Report` exports appointment report PDF.

## 6) Ranking Rules (Simple)

### English
1. High/Higher Secondary (PG & UG)
- PG: earlier registration year, then earlier passing year (month prioritized when available within the same year), then older age.
- UG: TET-passed candidates come first.
- Tie order: registration year -> passing year (month prioritized when available within the same year) -> age -> higher TET score.

2. Elementary/Middle
- TET >= 60% gets first priority.
- Tie order: registration year -> passing year (month prioritized when available within the same year) -> age -> higher TET marks.

3. Clergy
- Earlier year of passing first (month prioritized when available within the same year).
- Then more years of experience.
- Then older age.

### தமிழ்
1. உயர்நிலை/மேல்நிலை
- PG: பதிவு ஆண்டு -> தேர்ச்சி ஆண்டு (ஒரே ஆண்டில் மாதம் இருந்தால் அதற்கு முன்னுரிமை) -> வயது மூப்பு.
- UG: TET தேர்ச்சி பெற்றவர்கள் முன்னுரிமை.
- சமநிலை: பதிவு ஆண்டு -> தேர்ச்சி ஆண்டு (ஒரே ஆண்டில் மாதம் இருந்தால் அதற்கு முன்னுரிமை) -> வயது -> அதிக TET மதிப்பெண்.

2. தொடக்க/நடுநிலை
- TET 60%+ முன்னுரிமை.
- சமநிலை: பதிவு ஆண்டு -> தேர்ச்சி ஆண்டு (ஒரே ஆண்டில் மாதம் இருந்தால் அதற்கு முன்னுரிமை) -> வயது -> அதிக TET மதிப்பெண்.

3. குருத்துவம்
- தேர்ச்சி ஆண்டு முன்னுரிமை (ஒரே ஆண்டில் மாதம் இருந்தால் அதற்கு முன்னுரிமை).
- அடுத்தது பணி அனுபவம்.
- அடுத்தது வயது மூப்பு.

## 7) Sheet Columns (Appointment Fields)

### High School
Add at end:
- `Appointed`
- `Appointed Date`
- `Compassion if any`
- `Appointed institute`

### Elementary
Add at end:
- `Appointed`
- `Appointed Date`
- `Compassion if any`
- `Appointed institute`

### Clergy
Add at end:
- `Appointed`
- `Appointed Date`
- `Compassion if any`
- `Appointed Pastorate`

## 8) Security Status (Current)
- `.env` excluded from git.
- Frontend has no payment/API secret handling.
- Data fetch uses public published sheet URLs only.
- No runtime backend/payment endpoint in app now.
- No backend/payment packages in runtime dependency tree now.

## 9) Hosting Instructions (Vercel + Other Clouds)

### What to upload to GitHub
Upload:
- `src/`
- `public/`
- `packages/`
- `guidelines/`
- `index.html`
- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `vercel.json`
- `README.md`
- `.env.example`
- `.gitignore`
- `sync-google-sheet-to-json.js` (optional script)

Do not upload:
- `.env`
- `node_modules/`
- `dist/`
- `server/` (removed)
- `data/applications.json` (removed)

### Vercel (step-by-step)
1. Push code to GitHub.
2. Import repo in Vercel.
3. Build settings:
   - Framework: `Vite`
   - Build command: `npm run build`
   - Output: `dist`
4. Add env vars:
   - `VITE_HIGH_SCHOOL_CSV_URL`
   - `VITE_ELEMENTARY_SCHOOL_CSV_URL`
   - `VITE_CLERGY_ORDINATION_CSV_URL`
   - `VITE_SCHOOL_VACANCY_CSV_URL`
5. Deploy.
6. Verify:
   - `/`
   - `/apply`
   - `/?appointments=1`

Note: `vercel.json` handles SPA route rewrites to `index.html`.

### Other clouds (Netlify/Cloudflare Pages/Azure SWA)
- Install: `npm ci`
- Build: `npm run build`
- Publish: `dist`
- Add same `VITE_*` env vars
- Configure SPA fallback rewrite to `index.html`

## 10) Key Files
- Dashboard logic: `src/app/pages/Dashboard.tsx`
- Appointment report UI: `src/app/components/AppointmentReport.tsx`
- Seniority table UI: `src/app/components/SeniorityTable.tsx`
- Ranking rules text + comparators: `src/app/config/seniorityRules.ts`
- PDF exports: `src/app/utils/pdfUtils.ts`
- Google sheet fetch: `src/app/utils/fetchGoogleSheetData.ts`
- Feature flags: `src/app/config/features.ts`
