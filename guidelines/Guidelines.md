# CSI TND Seniority Portal - Guidelines

_Last updated: 2026-03-20_

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
- `/apply` Form downloads + vacancy map (only when `APPLY_SECTION_ENABLED = true`)

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
- `DOWNLOAD_PDF_ENABLED`
- `APPOINTMENT_REPORT_DOWNLOAD_ENABLED`

## 5) Dashboard Flow
1. Select category tab: High / Elementary / Clergy.
2. Use Filters + Search; use Sort By to switch between Seniority and Appointment views.
3. Use actions (if enabled):
   - `Open Dashboard` (charts)
   - `Download PDF` (filtered list)
   - `Show Appointments`
4. Appointment view:
   - shows appointed candidates only (based on `Appointed` field)
   - displays `Appointment Date`, `Vacancy Institute/Pastorate`, `Based on`
   - no `Appointment Made (Yes/No)` column is shown
5. `Download Appointment Report` exports appointed candidates only with the same appointment columns.

## 6) Ranking Rules (Current)

### English (Simple Explanation)
1. High/Higher Secondary
- **Seniority view (default):**
  - Earlier registration year comes first.
  - If the year is the same, earlier passing month/year comes first.
  - If still tied, older age comes first.
  - If still tied, higher TET score comes first (UG).
- **Appointment view:**
  - UG candidates with valid TET are prioritized over UG without TET.
  - PG candidates follow the same seniority tie-break order.

2. Elementary/Middle
- **Seniority view (default):**
  - Earlier registration year comes first.
  - If the year is the same, earlier passing month/year comes first.
  - If still tied, older age comes first.
  - If still tied, higher TET % comes first.
- **Appointment view:**
  - TET % at/above the pass mark is prioritized.
  - Tie‑break order remains the same.

3. Clergy
- Earlier year of passing comes first (month prioritized when available).
- Then more years of experience.
- Then older age.

### தமிழ் (எளிய விளக்கம்)
1. உயர்நிலை/மேல்நிலை
- **மூப்பு பார்வை (இயல்புநிலை):**
  - பதிவு செய்த ஆண்டு முன்னுரிமை.
  - ஒரே ஆண்டு என்றால், தேர்ச்சி மாதம்/ஆண்டு முன்னுரிமை.
  - இன்னும் சமமானால், வயது மூப்பு.
  - இன்னும் சமமானால், TET மதிப்பெண் (UG) முன்னுரிமை.
- **நியமன பார்வை:**
  - செல்லுபடியாகும் TET (UG) உள்ளவர்கள் முதலில்.
  - PG விண்ணப்பதாரர்கள் மூப்பு வரிசையையே பின்பற்றுவர்.

2. தொடக்க/நடுநிலை
- **மூப்பு பார்வை (இயல்புநிலை):**
  - பதிவு செய்த ஆண்டு முன்னுரிமை.
  - ஒரே ஆண்டு என்றால், தேர்ச்சி மாதம்/ஆண்டு முன்னுரிமை.
  - இன்னும் சமமானால், வயது மூப்பு.
  - இன்னும் சமமானால், TET % அதிகம் முன்னுரிமை.
- **நியமன பார்வை:**
  - TET % தேர்ச்சி பெற்றவர்கள் முன்னுரிமை.
  - சமநிலை விதிகள் மாறாது.

3. குருத்துவம்
- தேர்ச்சி ஆண்டு முன்னுரிமை (மாதம் இருந்தால் முன்னுரிமை).
- அடுத்தது பணி அனுபவம்.
- அடுத்தது வயது மூப்பு.

## 7) Sheet Columns (Appointment Fields)

Note: `Appointed` is used to mark candidates but is not displayed in the UI or PDFs.

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
   - `/apply` (only if enabled)
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
