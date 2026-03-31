# Dat Pack Co. — Quotation & Cost Calculator
## PRD & Project Memory

---

## Project Overview
A premium, high-performance internal Quotation & Cost Calculator web application for Dat Pack Co., a high-end packaging company based in Mumbai. Used daily by the sales and operations team.

**App URL**: https://f17f7567-5f29-43f2-97cd-104dafa39651.preview.emergentagent.com

---

## Architecture

### Tech Stack
- **Frontend**: React (CRA) + Tailwind CSS + Framer Motion + Zustand + Recharts + jspdf
- **Backend**: FastAPI (minimal health endpoint)
- **Database**: Supabase (hosted Postgres) with localStorage fallback
- **State Management**: Zustand (calculator state, client state)
- **Icons**: Lucide React
- **Fonts**: DM Sans + Playfair Display (Google Fonts)

### Key Files
- `src/App.js` — Main orchestration, auto-save, client selection logic
- `src/lib/calc.js` — All calculation formulas (calcAll function)
- `src/lib/db.js` — Supabase DB helpers (with localStorage fallback in db.local.js)
- `src/lib/pdf.js` — jsPDF-based quotation PDF generation
- `src/lib/csv.js` — CSV export
- `src/store/calculatorStore.js` — Zustand store for all calculator state
- `src/store/clientStore.js` — Zustand store for client/quotation metadata
- `src/components/clients/ClientSelectionModal.jsx` — Full-screen client selector
- `src/components/history/QuotationHistoryDrawer.jsx` — Slide-in history drawer
- `src/components/sections/Section1-9.jsx` — All 9 calculator sections

---

## Database Schema (Supabase)
```sql
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null, phone text, email text,
  created_at timestamptz default now()
);
create table quotations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  job_name text not null, quote_number text not null,
  version integer default 1, is_repeat_order boolean default false,
  state jsonb not null, created_at timestamptz default now(), updated_at timestamptz default now()
);
```

---

## Implemented Features ✅ (as of 2026-03-31)

### Core Calculator
- [x] Client Selection Modal (full-screen, dark luxury background)
- [x] 9-section accordion calculator with Framer Motion animations
- [x] All calculation formulas implemented (calcAll in lib/calc.js)
- [x] Calculated-but-editable fields (CalculatedEditableField component)
- [x] Override + Reset to formula with OVERRIDE tag

### UX Features
- [x] Sticky glassmorphism summary bar (live totals: Production Cost, Selling/Unit, Grand Total)
- [x] Sticky sidebar with section navigation and completion dots
- [x] Custom cursor (dot + ring with lerp delay)
- [x] Dark mode toggle (full light/dark mode)
- [x] Section completion indicators (empty/partial/complete)
- [x] Formula tooltips on calculated fields (? icon)
- [x] Repeat Order Toggle (Section 9) with pricing adjustment
- [x] Cost breakdown chart in Section 8

### Data Management
- [x] Auto-save to Supabase (debounced 3 seconds)
- [x] Save Snapshot (manual versioning v1, v2...)
- [x] Quotation History Drawer per client (sort by newest/value)
- [x] Load / Duplicate / Export PDF from history
- [x] Delete quotation with confirmation
- [x] Unsaved changes guard on Load

### Export
- [x] PDF export (jspdf) — full Dat Pack Co. branded template
  - Company header with logo placeholder, contact info
  - Main items table, tooling line item
  - Pricing summary footer
  - Conditional repeat order block
- [x] CSV export — all fields grouped by section

### Design
- [x] Luxury aesthetic: Off-white #FAFAFA, deep black #1A1A1A, copper #C8956C
- [x] Playfair Display headers + DM Sans body
- [x] Tabular-nums on all number fields
- [x] Indian Rupee formatting (₹X,XX,XXX.XX)
- [x] Staggered entrance animations on section cards
- [x] Shimmer effect on export buttons
- [x] Glassmorphism on summary bar and client modal
- [x] localStorage fallback when Supabase not available

---

## Business Logic (Key Formulas)
- Ups per Sheet = `Floor(MasterL/FlatL) × Floor(MasterW/FlatW)`
- Gross Sheets = `RoundUp(NetSheets × (1 + Wastage%))`
- Weight per Sheet = `(MasterL × MasterW × GSM) / 1,550,000`
- Paper Cost = `Total Weight × Paper Rate`
- Total Print Cost = `Gross Sheets × Click Charge`
- Lam Cost = `Gross Sheets × (MasterL × MasterW / 645.16) × Lam Rate`
- Foiling Cost = `(Gross/1000 × RunRate) + Setup + BlockCost`
- Die-Cutting = `(Gross/1000 × PunchRate) + Setup + Die`
- Selling Price/Unit = `CostPerUnit / (1 - Margin%)`
- Final Total = `Subtotal × (1 + GST%)`
- Repeat Total = `(Subtotal - OneTimeTooling) × (1 + GST%)`

---

## Supabase Config
- URL: https://wopyvmtylpteenfjxpgy.supabase.co
- Anon Key: stored in frontend/.env as REACT_APP_SUPABASE_ANON_KEY

---

## Prioritized Backlog

### P0 (Must have - already done)
- [x] All calculator sections functional
- [x] Supabase persistence
- [x] PDF/CSV export

### P1 (Should have - next phase)
- [ ] Supabase Auth (email magic link) - scaffold exists in master prompt
- [ ] Mobile sidebar collapse (hamburger menu)
- [ ] Save/load quote from URL (shareable link)
- [ ] Batch export multiple quotes as PDF

### P2 (Nice to have)
- [ ] Company settings page (change company name, address)
- [ ] Client edit / delete
- [ ] Quote email sending (via SendGrid/Resend)
- [ ] Multiple currency support

---

## Test Data
- Test Client: **Acme Packaging Ltd.** (acme@example.com, +91 98765 43210)
- Created 2026-03-31 in Supabase
