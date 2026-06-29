# Datpack Calculator — Setup Guide

## Prerequisites

- **Node.js** v18+ — [nodejs.org](https://nodejs.org)
- **Python** 3.10+ — [python.org](https://python.org)
- **Supabase account** (optional — app falls back to localStorage if not configured)

---

## 1. Clone the Repository

```bash
git clone https://github.com/taheralmighty/Datpack-Calculator.git
cd Datpack-Calculator
```

---

## 2. Frontend Setup

```bash
cd frontend
npm install
```

### Environment Variables

Create a `.env` file inside the `frontend/` folder:

```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **Note:** Both variables are optional. If omitted, the app runs in localStorage-only mode without cloud sync.

### Run Frontend

```bash
npm start
```

App runs at `http://localhost:3000`

---

## 3. Backend Setup

```bash
cd backend
python -m venv venv
```

**Windows:**
```bash
venv\Scripts\activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

```bash
pip install -r requirements.txt
```

### Run Backend

```bash
uvicorn server:app --reload --port 8000
```

API runs at `http://localhost:8000`  
Health check: `http://localhost:8000/api/health`

---

## 4. Supabase Setup (Optional)

If you want cloud persistence:

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → API** and copy:
   - `Project URL` → `REACT_APP_SUPABASE_URL`
   - `anon public key` → `REACT_APP_SUPABASE_ANON_KEY`
3. Create the following tables in the Supabase SQL editor:

```sql
-- Clients table
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  created_at timestamptz default now()
);

-- Quotations table
create table quotations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  data jsonb not null,
  created_at timestamptz default now()
);
```

---

## 5. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, Zustand, Framer Motion |
| PDF Generation | jsPDF, html2canvas |
| Charts | Recharts |
| Database | Supabase (PostgreSQL) / localStorage fallback |
| Backend | FastAPI (Python), Uvicorn |

---

## 6. Project Structure

```
Datpack-Calculator/
├── backend/
│   ├── server.py          # FastAPI server
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # UI sections and layout
│   │   ├── lib/           # Calc logic, PDF, DB helpers
│   │   └── store/         # Zustand state stores
│   └── package.json
└── SETUP.md
```
