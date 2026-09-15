# Dat Pack Co. Setup

## Local Development

Use Node 22 LTS and npm. From the repository root:

```powershell
npm ci --prefix frontend
npm start --prefix frontend
```

The React application runs at http://localhost:3000 and automatically uses Supabase for clients, quotations, history and saves. LocalStorage holds recovery drafts and preferences only; it is not a separate quotation database or selectable mode. Do not clear site data while a recovery draft is pending.

Configure `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`. Only a public/publishable key may be bundled. Never use service-role/secret keys. Restart the dev server after environment changes. Missing configuration produces a connection-setup error, not an alternate local database.

Temporary network/server failures retain the draft and its original identity, show that Supabase has not confirmed the save, and retry every 15 seconds or when the browser signals reconnection. Refresh during an outage still exposes recovery drafts with their original client. Recovery is an explicit draft choice, not a persistence-mode choice. An unconfirmed write is reconciled before newer edits; conflicts, validation and permission errors require review and are not automatically overwritten. New clients and history still require Supabase availability; recovery is not a complete offline mirror of the database.

## Internal Cloud Deployment

This is a no-login trusted-team application, not a public SaaS service. Read and complete [database/VERIFY-INTERNAL-DEPLOYMENT.md](database/VERIFY-INTERNAL-DEPLOYMENT.md) before enabling cloud production access.

1. Back up the existing database. The current cloud adapter works with the existing client/quotation tables; no new columns, RPCs or migration are required for the configured database.
2. Use the existing `updated_at` timestamp for conditional updates and `state._deletedAt` for non-destructive deletion. Deploy the same app version to all staff; older clients that ignore these conditions can bypass the safeguards.
3. Restrict the frontend and the actual data API, including direct upstream access, to the trusted internal network/gateway.
4. Review the existing shared-role grants/policies behind that boundary. The compatibility fix does not change RLS or permissions. It uses ordinary select/insert/update permissions, not physical deletion.
5. Verify CRUD, Latest, stale-update rejection, retained deletion markers and off-network denial. The archived [database/migrations/001_internal_quotation_integrity.sql](database/migrations/001_internal_quotation_integrity.sql) is not a prerequisite; do not run its grant-revoking migration on the working database merely to start this app.

If hosted Supabase cannot meet the internal-only Data API boundary without unsafe anonymous policies, stop the production rollout. Recovery drafts are not an alternative production database. Do not introduce public database access or assume the frontend URL protects the API.

## Checks

```powershell
npm run lint --prefix frontend
npm test --prefix frontend -- --watchAll=false --runInBand
npm run test:database --prefix frontend
npm run build --prefix frontend
npm run audit:reviewed --prefix frontend
```

The database test uses disposable embedded PostgreSQL instances for fresh and legacy schemas. It does not verify hosted Supabase grants, PostgREST configuration or network controls.

Browser tests use Playwright:

```powershell
frontend/node_modules/.bin/playwright install chromium
npm run test:browser --prefix frontend
```

On Windows with installed Edge, set `$env:PLAYWRIGHT_CHANNEL='msedge'` before browser tests. Never disable TLS certificate validation to download a browser. Tests start one server on port 3012 with a dummy `datpack-audit.invalid` Supabase configuration. Requests are intercepted with synthetic server records; the real production adapter and UI remain in use. No browser test selects a LocalStorage application mode. Outage tests exercise refresh, reconnect, lost responses, stale remote edits and deletion. These checks do not replace live Supabase or network-boundary verification.

## Optional Backend

The FastAPI backend only exposes `/api/health`; frontend persistence does not depend on it. Use Python 3.12:

```powershell
py -3.12 -m venv backend/venv
backend/venv/Scripts/python -m pip install -r backend/requirements.txt
backend/venv/Scripts/python -m uvicorn server:app --app-dir backend --host 127.0.0.1 --port 8000
```

CORS is limited to local development origins and GET without credentials. Review origins before adding internal endpoints. Audit Python separately with `pip-audit -r backend/requirements.txt`.

## Production Assets And Operations

Deploy only the optimized frontend build behind the approved internal boundary, not the development server. Keep recovery drafts separate from cloud success status. Validate backup/restore and conflict handling with staff before rollout. Review the time-limited build dependency exceptions in [SECURITY-REVIEW.md](SECURITY-REVIEW.md).

PDFs retain issued/revised/generated dates, shared pricing snapshots and explicit rounding adjustments. Legacy quotes must be reviewed before revision/export. Latin/Devanagari font support is bundled; other script support must be added and proofed before customer use.