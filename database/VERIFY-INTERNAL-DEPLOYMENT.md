# Internal Trusted-Team Deployment Gate

Dat Pack has 3-4 trusted staff, shared clients/quotations in Supabase, and no application login, user accounts or per-user ownership. Supabase is primary; device storage protects recovery drafts only. There are no separate application persistence modes. This decision does not make an Internet-accessible data API private.

## Required Boundary

- Restrict both the frontend AND the Supabase/PostgREST API to the trusted network/VPN/access gateway. Restrict direct database connectivity too.
- Verify the original API origin cannot bypass the gateway. Protecting only the frontend URL, CORS, or a reverse proxy while the upstream remains public is insufficient.
- For hosted Supabase, verify that the available platform controls actually restrict Data API access. Do not assume database IP restrictions also restrict HTTPS Data API routes.
- If the API cannot be made internal with this no-login architecture, production deployment is blocked pending an infrastructure decision. Recovery drafts are not an alternative production database. Do not grant broad public anon access to work around this.
- Never embed a service-role, secret API key, database password or privileged JWT in a browser bundle. A public anon/publishable key is an identifier, not the security boundary.

## Existing-Schema Operation

The active adapter was changed on 2026-09-15 to use the configured schema without a migration. No authentication, columns, RPCs, RLS or grant changes were made. Backups and the internal-only API boundary remain required; successful CRUD is not proof that outsiders cannot access the API.

| Operation | Current database contract |
|---|---|
| Client list/count | `clients` with `quotations(count)`, filtering `quotations.state->>_deletedAt IS NULL` |
| History, recent, Latest, load | Existing columns and relation; filter `state->>_deletedAt IS NULL`, order `updated_at` |
| New quote | INSERT with a stable UUID; never unchecked upsert |
| Save existing quote | UPDATE filtered by ID, client_id, previous exact updated_at and active JSON marker; zero rows means conflict unless an exact identity/content read confirms that the same write already completed |
| Delete quote | Conditional UPDATE adds state._deletedAt, preserves original state and advances updated_at; ID retained |
| Save token | Returned updated_at exposed as opaque adapter revision; no revision column required |

All clients must use the updated protocol. Old builds/direct writers can bypass app-side safeguards. Do not physically purge retained markers while stale clients/drafts might still use those IDs. Schema-level unique human quote/version enforcement and off-network access denial are separate from this functional fix.

Live verification used a uniquely named temporary client and quotations: creation, save/update/reload, PDF/CSV, duplicate, soft deletion, issued version preservation and competing timestamp updates passed. Temporary fixtures were removed by their exact IDs. Hash comparisons confirmed all original 5 clients and 7 quotations were unchanged. No schema or permission change was executed.

The earlier [migrations/001_internal_quotation_integrity.sql](migrations/001_internal_quotation_integrity.sql) is an archived alternative, not required by this adapter. It revokes grants and uses different top-level tombstones; do not apply or mix it into the working database without a reviewed deployment plan.

## Staging Evidence Required

- [ ] Record network/gateway design and verify off-network requests to frontend AND direct API are denied.
- [ ] Verify the frontend bundle contains no privileged keys.
- [ ] Verify the current adapter against a backup/restored copy of the existing schema. No `deleted_at`/`revision` column or RPC migration is required.
- [ ] Create client, save/update/load quote, duplicate, delete, fetch history and Latest.
- [ ] Verify two staff editors share the same rows intentionally.
- [ ] Verify concurrent edits reject stale revisions and return a clear conflict.
- [ ] Verify old save requests cannot recreate tombstoned IDs.
- [ ] Verify unauthorized external requests cannot select, insert, update or physically delete records. Audit any separately installed RPCs as well; this application does not call them.
- [ ] Review pre-existing policies and grants; functional CRUD tests do not prove that unrelated schema/tables are private.
- [ ] Test backup/restore, retention, and operational access revocation.

These are deployment checks, not completed local tests. Read-only schema probes do not establish live policy correctness or an internal-only network boundary.

## Historical Audit: Superseded RPC Adapter

The following records the failure before the existing-schema fix above. Its missing columns/RPCs are no longer dependencies of the active adapter.

The configured API reproduced PostgreSQL/PostgREST error `42703`: `column quotations_1.deleted_at does not exist` on the client-count query. Individual zero-row reads also reproduced `column quotations.revision does not exist` and `column quotations.deleted_at does not exist`. This is a database schema mismatch, not a JavaScript `columns.at()` exception. No production records were written and no migration was applied.

| Table / column | Read dependency | Write dependency | Migration source | Configured API zero-row probe |
|---|---|---|---|---|
| clients.id | Client identity; quotation relation | Generated on client insert | CREATE clients | 200 |
| clients.name | Selection/history/export client lookup | Client insert | CREATE clients | 200 |
| clients.phone | Client record | Client insert | CREATE clients | 200 |
| clients.email | Client record | Client insert | CREATE clients | 200 |
| clients.created_at | Client ordering | Database default | CREATE clients | 200 |
| quotations.id | Load/duplicate/delete/save identity | Checked save; delete tombstone | CREATE quotations | 200 |
| quotations.client_id | Client history/count/Latest/relation | Checked save; immutable on update | CREATE quotations, FK clients.id | 200 |
| quotations.created_at | History metadata | Database default | CREATE quotations | 200 |
| quotations.job_name | History/search | Checked save | ALTER quotations | 200 |
| quotations.quote_number | Identity and exports | Checked insert; retained on update | ALTER + unique number/version index | 200 |
| quotations.version | Revision identity and exports | Checked insert | ALTER + unique number/version index | 200 |
| quotations.is_repeat_order | Compatibility record field | Checked save writes false | ALTER quotations | 200 |
| quotations.state | All quote loading, previews, exports | Checked save JSONB | ALTER; legacy data copied if absent | 200 |
| quotations.updated_at | History/Latest/recent ordering | RPC now(); client payload not authoritative | ALTER + active indexes | 200 |
| quotations.revision | Expected-revision comparisons | Checked save/delete increment | ALTER, default 0 | 400 / 42703: missing |
| quotations.deleted_at | Client count and every active quote query | Delete tombstone | ALTER, nullable | 400 / 42703: missing |
| quotations.data (legacy) | Migration only; not active adapter | Retained, no new writes | Copy to state when absent; drop old NOT NULL | Not probed; not required by current adapter |

`getClients` embeds `quotations(count)`, filters `quotations.deleted_at IS NULL`, and orders `clients.created_at`. Quote list/load/history/Latest paths filter `deleted_at IS NULL`; history/Latest/recent paths order `updated_at`, with recent limited to 200. This explains why the initial client dialog fails before a quotation can be opened.

| RPC | Arguments / result | Migration contract | Live verification |
|---|---|---|---|
| save_quotation_checked | payload JSONB, expected_revision BIGINT; returns saved quotation JSONB including revision | SECURITY INVOKER, per-ID lock, revision/client/tombstone checks | Unverified: API schema discovery returned 401; no write probe attempted |
| delete_quotation_checked | quotation_id UUID; returns void | SECURITY INVOKER, per-ID lock, persistent tombstone | Unverified: API schema discovery returned 401; no delete probe attempted |

Fresh and legacy disposable PostgreSQL tests passed the full column matrix, migration rerun, data preservation, revisions, tombstones and default-deny grants. Browser tests passed the actual cloud adapter against a completely intercepted synthetic endpoint. Neither proves hosted PostgREST relations, RPC grants, real staff collaboration or off-network denial. A successful zero-row request proves query/schema compatibility only, not access to records or authorization safety.

That superseded adapter required a coordinated schema/RPC rollout. The active adapter instead uses the existing-schema contract above; do not apply the archived migration to resolve the historical error. Backup/restore, reviewed internal access and real staging CRUD/concurrency remain deployment checks, without introducing new columns or RPCs.