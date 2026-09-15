# Dependency And Deployment Security Review

Review date: 2026-09-14. Next review / exception expiry: **2026-10-14**.

## Access Model

No application login, per-user ownership or administrator workflow. All authorized internal Dat Pack staff share records. The frontend AND data API must be unreachable outside the approved internal network/gateway. See [database/VERIFY-INTERNAL-DEPLOYMENT.md](database/VERIFY-INTERNAL-DEPLOYMENT.md). Live CRUD and timestamp-conflict behavior were verified with removable synthetic records on 2026-09-15, but off-network denial and policy correctness remain unverified. The active adapter uses the existing schema and permissions; the older default-deny migration was not applied.

## JavaScript Audit

Baseline: 50 affected packages (2 critical, 23 high, 13 moderate, 12 low). Removed unused direct React Query, lodash, next-themes, recharts and html2canvas. Applied compatible `npm audit fix`, without `--force`. Result at review: **29 affected packages, 0 critical, 14 high, 6 moderate, 9 low**.

The following high chains are time-limited exceptions, not declarations of safety:

| Packages | Exposure / usage | Reason and follow-up |
|---|---|---|
| nth-check, css-select, svgo, @svgr/plugin-svgo, @svgr/webpack | Build-time SVG processing in CRA; app assets are trusted local PNG/fonts, no uploaded SVG build input | Avoid forced incompatible plugin replacement. Update the SVG build chain in a separately tested maintenance task. Do not compile untrusted assets. |
| postcss (nested resolve-url-loader copy) | Build-time source-map/CSS parsing; runtime app does not parse uploaded CSS | Root PostCSS received compatible fixes, nested old major remains. Do not process untrusted CSS/source maps. Replace/update the loader chain after compatibility checks. |
| serialize-javascript, rollup-plugin-terser, workbox-build, workbox-webpack-plugin | Build serialization/minification/service-worker tooling; app has no service-worker registration or runtime use of serializer | Breaking override/toolchain replacement is not approved in this hardening pass. Restrict build inputs and CI secrets; schedule maintained toolchain migration. |
| underscore, jsonpath, bfj | CRA build JSON reporting chain; no direct application import | Compatible update did not remove the parent chain. Avoid untrusted build metadata, review upstream fixes and replace the reporting chain when compatible. |
| react-scripts | Direct build/dev/test orchestrator, aggregates the above chains | Never expose its dev server publicly. `npm audit fix --force` proposes react-scripts 0.0.0, which is not a valid upgrade. Plan a controlled build-tool migration if upstream cannot resolve the chains. |

All other initial high/critical chains, including shell-quote and websocket-driver, were removed by compatible resolved-version updates. Low/moderate findings remain in legacy test/dev-server dependencies (including jsdom/proxy, qs, uuid/sockjs); no runtime exploitability claim is made. The committed audit gate fails on any critical finding, any unreviewed high package, audit transport failure, or expiry of these exceptions. Re-triage advisories even when a package name is already known; package allowance is not a permanent waiver.

## Python Audit

Initial requirements audit reported 30 advisory entries across python-multipart, python-dotenv and Starlette (some alias/duplicate entries). Multipart and dotenv were unused and removed. FastAPI was updated from 0.109.2 to 0.141.1 to allow a patched Starlette dependency. Uvicorn remains 0.27.1.

`pip-audit -r backend/requirements.txt` after the update: **No known vulnerabilities found** at review time. This audits the resolved requirements, not every unrelated globally installed package or the deployed host. Re-run in CI and for the deployment lock/environment.

## Verification Boundaries

- Unit/App tests, embedded PostgreSQL migration checks, lint, build and browser tests are local/CI checks.
- Real shared-role policies, network bypass tests, backup/restore and staff rollout remain deployment gates. The active adapter needs no schema upgrade or new RPCs; live CRUD/reconnect checks are recorded separately from these access-control checks.
- No service-role or privileged secret belongs in any `REACT_APP_*` variable. The frontend rejects known service-role/secret key forms, but prevention of secret bundling remains an operator responsibility.
- LocalStorage holds device recovery drafts, not an authoritative quotation database or selectable application mode. Browser storage failure is reported; an offline draft is never represented as a successful Supabase save. Supabase writes resume through conditional, identity-preserving retries.
- PDF Unicode coverage is currently Latin/Devanagari. The tested sample extracts correctly, but additional scripts and complex typography need explicit font/shaping proofing.