# Dat Pack Co. Quotation Calculator

Internal shared quotation calculator for Dat Pack staff. React, Zustand, Tailwind and jsPDF. Supabase is the primary persistence layer; LocalStorage protects recovery drafts during interrupted saves. There is one application workflow, no persistence-mode selection and no application login.

```powershell
npm ci --prefix frontend
npm start --prefix frontend
```

See [SETUP.md](SETUP.md) for setup, tests and deployment; [ARCHITECTURE.md](ARCHITECTURE.md) for the current ten-section calculation/persistence model.

**Cloud deployment gate:** restrict the actual data API as well as the frontend. A public Supabase key is not security. The app uses the existing schema without new columns or RPCs; review [database/VERIFY-INTERNAL-DEPLOYMENT.md](database/VERIFY-INTERNAL-DEPLOYMENT.md) for the current persistence contract and access boundary.

Security audit exceptions and verification limits are recorded in [SECURITY-REVIEW.md](SECURITY-REVIEW.md). Internal review/reference/checklist files are local working material and are not required deployment artifacts.