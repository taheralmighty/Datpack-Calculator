# Dat Pack Co. Calculator Architecture

## Product And Access Model

An internal quotation tool for 3-4 trusted Dat Pack staff. There is no application login, user ownership or administrator UI. All staff share clients and quotations in Supabase, the authoritative persistence layer. There is one application experience and no local/cloud mode selection. LocalStorage is limited to draft/recovery protection and preferences. The security boundary must restrict both the application and its data API; a public Supabase key or hidden website URL is not protection.

Cloud rollout is gated by [database/VERIFY-INTERNAL-DEPLOYMENT.md](database/VERIFY-INTERNAL-DEPLOYMENT.md). Do not deploy permissive public anonymous database policies to make the no-login UI work.

## Components And Ownership

- React 18 and Create React App provide the existing UI/build system. Tailwind, CSS variables, Framer Motion and Lucide preserve the existing cream/bronze design.
- [frontend/src/lib/calc.js](frontend/src/lib/calc.js) owns all business arithmetic, configuration mappings, migration and document rounding calculations.
- [frontend/src/lib/validation.js](frontend/src/lib/validation.js) distinguishes incomplete, invalid and exportable states. Incomplete drafts can be saved; invalid domains cannot be issued. Overrides are checked at their store boundary.
- [frontend/src/store/calculatorStore.js](frontend/src/store/calculatorStore.js) owns raw inputs, overrides, dirty state and monotonically increasing local edit revisions.
- [frontend/src/store/clientStore.js](frontend/src/store/clientStore.js) owns active identity, save orchestration, client/history state, destructive transitions and draft recovery.
- [frontend/src/lib/saveCoordinator.js](frontend/src/lib/saveCoordinator.js) serializes writes per quote, shares requests for the same revision, carries expected server revisions, and retires deleted identities before queued writes can run.
- [frontend/src/lib/db.js](frontend/src/lib/db.js) always uses Supabase. Missing configuration, connection failures and rejected writes never select another permanent database. The old local adapter is retained only for historical compatibility tests, has no production imports and is not bundled into the app.
- [frontend/src/lib/storage.js](frontend/src/lib/storage.js) distinguishes absent, corrupt, wrong-shaped, unavailable and unwritable local data. It never interprets corruption as an empty database.
- [frontend/src/lib/drafts.js](frontend/src/lib/drafts.js) stores recovery snapshots separately from database records. Local recovery is not a claim of successful cloud persistence.

## Current Sections

| Number | File | Responsibility |
|---|---|---|
| 1 | [frontend/src/components/sections/Section1_JobSpecs.jsx](frontend/src/components/sections/Section1_JobSpecs.jsx) | Client/job names, order quantity, direct ups |
| 2 | [frontend/src/components/sections/Section2_PaperSpecs.jsx](frontend/src/components/sections/Section2_PaperSpecs.jsx) | Master dimensions, GSM, paper rate, wastage |
| 3 | [frontend/src/components/sections/Section3_PaperCost.jsx](frontend/src/components/sections/Section3_PaperCost.jsx) | Net/gross sheets and paper cost |
| 4 | [frontend/src/components/sections/Section4_Printing.jsx](frontend/src/components/sections/Section4_Printing.jsx) | Shared machine selection and printing |
| 5 | [frontend/src/components/sections/Section5_Lamination.jsx](frontend/src/components/sections/Section5_Lamination.jsx) | Lamination selection and cost |
| 6 | [frontend/src/components/sections/Section6_Foiling.jsx](frontend/src/components/sections/Section6_Foiling.jsx) | Foiling size, block/run rates and cost |
| 7 | [frontend/src/components/sections/Section7_UV.jsx](frontend/src/components/sections/Section7_UV.jsx) | UV type and cost |
| 8 | [frontend/src/components/sections/Section8_DieCutting.jsx](frontend/src/components/sections/Section8_DieCutting.jsx) | Punching values derived from Printing's machine |
| 9 | [frontend/src/components/sections/Section9_Pasting.jsx](frontend/src/components/sections/Section9_Pasting.jsx) | Pasting priced by order quantity |
| 10 | [frontend/src/components/sections/Section10_Summary.jsx](frontend/src/components/sections/Section10_Summary.jsx) | Margin, GST, production/quote totals and breakdown |

All numeric section IDs remain stable. There is no Layout or Repeat Order card. The database repeat flag is retained solely for compatibility and new saves write false.

## Calculation Contract

Dimensions are inches. Percentages are decimal fractions internally. Valid pricing is not rounded until presentation.

```text
netSheets = ceil(orderQty / upsPerSheet)
grossSheets = ceil(netSheets * (1 + platenWastage))
weightPerSheet = masterLength * masterWidth * gsm / 1550000
paperCost = grossSheets * weightPerSheet * paperRate
numberOfThousands = 0 for no sheets; 1 through 1200; otherwise 1 + ceil((grossSheets - 1200) / 1000)
printing = plateCost + numberOfThousands * printPrice
lamination = grossSheets * masterLength * masterWidth * laminationCost / 100
foiling = foilingBlockCost + numberOfThousands * foilingRunRate
UV = numberOfThousands * uvRate
punching = punchCost + numberOfThousands * punchingCostPer1000
pasting = orderQty * pastingRate
production = paper + printing + lamination + foiling + UV + punching + pasting
costPerUnit = production / orderQty
sellingPricePerUnit = costPerUnit * (1 + margin)
subtotal = sellingPricePerUnit * orderQty
GST = subtotal * gst
grandTotal = subtotal * (1 + gst)
```

The five configuration maps live only in calc.js. Number of Thousands is evaluated once. Machine selection also controls Die Cutting. Master sheet dimension edits auto-select the smallest fitting machine through `selectMachineSize()` in calc.js; the dropdown remains available for a manual choice. Margin is a cost-plus markup with no upper cap. Fixed selected charges and overrides surviving rate/selection changes remain intentional business behavior. Invalid arithmetic has finite guards, but validation explains invalid values instead of treating a zero result as a valid quote.

## Save And Recovery Lifecycle

1. Editing increments the local revision and marks dirty. A stable UUID and human-readable quote number are assigned before the first draft/write snapshot.
2. Every dirty edit writes an identity-scoped local recovery snapshot, independently of the three-second autosave debounce.
3. Autosave, manual save and export call the same store action and coordinator. The snapshot carries ID, client, session, local revision, expected database revision and immutable state.
4. The Supabase adapter compares the exact previously returned `updated_at` value in an atomic conditional update, also filtering ID, client and active JSON deletion marker. It exposes that timestamp as the coordinator's opaque `revision` token. A zero-row update is a conflict unless the server already holds the exact requested identity/content, indicating a previously completed save. A conflict leaves the recovery draft intact and asks the user to reload or copy.
5. Save completion updates active metadata only when quote/client/session still match. Only the matching latest edit revision becomes clean.
6. Delete retires queued writes, waits for a running write, then conditionally stores `state._deletedAt` while retaining the original Supabase record/state. Counts, history and Latest all filter that JSON marker. New records use insert, so a retained ID cannot be recreated by a late insert. New edits use a new draft identity.
7. Load, template, client/new-quote actions go through one Save/Discard/Cancel transition. Cancellation retains the current quote. Recovery choices are explicitly associated with the original client.

Supabase failures never change the data source. Temporary connection errors retry every 15 seconds and on browser `online`, while validation/permission/conflict errors stop automatic retry. Drafts include the last unconfirmed write, allowing a response-lost save to be acknowledged before newer edits proceed, including after refresh. Exact content comparison is independent of JSON key order. Original quote/client IDs and numbers are retained; tombstones and changed remote content are not overwritten.

Recovery is refreshed before the client fetch, so it remains available when Supabase is unavailable. A recovered draft can use its embedded original client identity until server loading resumes; it does not populate an alternate client database/history. Only the selected draft is retried automatically; other saved recovery drafts remain explicit recovery/discard choices. Recovery storage permissions/quota remain prerequisites and failures are surfaced without claiming the draft is protected. A fresh browser with no recovery data cannot browse historical records during an outage.

## Migration And Historical Records

Model version 2 is current. Future versions are rejected without altering their records. Known old percentage formats use schema signatures rather than magnitude alone; ambiguous states require review. Original legacy JSON is retained under `legacyState`.

Legacy quotes require review and acknowledgment before saving/issuing a current-model revision. New selection mappings are never guessed from obsolete rates. Hidden paper-weight overrides remain visible and resettable in a review area. Existing valid total-cost override keys are preserved.

Issue snapshots capture raw input, calculated values and issue time. Editing a saved issued quote forks a new record/version, preserving the previously issued record. Templates/copies clear issue identity. Original issue time, revision time and export generation date are distinct.

## Exports

[frontend/src/lib/pdf.js](frontend/src/lib/pdf.js) and [frontend/src/lib/csv.js](frontend/src/lib/csv.js) consume the same snapshot and document-pricing policy. Both export entry points validate the state. The editable quotation client name is the display identity in both documents; the database `client_id` remains the record relationship.

The calculation engine remains full precision. Documents display currency at two decimals and explicitly include rate, cost or tax rounding adjustments where needed. Thus visible rate times quantity plus the rate adjustment equals the quoted subtotal without changing margin or production formulas.

PDF generation uses jsPDF/AutoTable. The logo is resized to a maximum 180px dimension, cached, aspect-preserving and timeout-protected. Tables reserve footer space and every page gets a footer. Noto Sans Devanagari is embedded only for non-ASCII text; its SIL Open Font License is included. Latin and Devanagari are supported by the current font path; other scripts produce an explicit PDF error and remain available through CSV. Complex-script visual proofing is still required for customer-facing language coverage beyond the tested sample.

## UI, Theme And Accessibility

The existing AnimatedInput, CalculatedEditableField, PremiumSelect and SectionCard remain the only field/card systems. PremiumSelect retains floating labels, real viewport direction checks, keyboard controls, portals and wash-only option highlighting. Mouse-wheel scrolling releases numeric focus without changing values.

Dialog provides shared semantics, focus containment/restoration, Escape handling, background inertness and scroll locking. Theme state is shared by header/modal toggles and safely persisted. Framer Motion has a user reduced-motion policy; the custom cursor stops for reduced motion/touch, with native cursor fallback. Save/validation/recovery errors are separate from the decorative completion indicator.

## Database And Verification

The current cloud adapter uses the existing `clients` and `quotations` tables, with `state` JSONB and `updated_at` providing deletion markers and concurrency tokens. It does not require `revision`/`deleted_at` columns or checked-save/delete RPCs. The earlier [database/migrations/001_internal_quotation_integrity.sql](database/migrations/001_internal_quotation_integrity.sql) remains an archived, tested alternative and was not applied to the configured database. Do not mix its top-level tombstones/RPC writers with the JSON-marker adapter without a reviewed migration.

Timestamp comparisons are atomic, but are a trusted-client protocol rather than an authorization boundary. All staff must use the current build; direct SQL writers and older clients must advance `updated_at` and respect deletion markers. Reload previously recovered drafts with obsolete integer cloud tokens before saving. Concurrent issuance of the same human version still needs operational coordination unless a database uniqueness constraint is provisioned. No RLS, grants, auth or network restrictions were changed by the compatibility fix.

Commands and deployment gates are in [SETUP.md](SETUP.md). Tests include existing arithmetic/UI coverage, save races, recovery/corruption, full-App workflows, embedded PostgreSQL migration checks and real-browser PDF/CSV/responsive checks. CI runs locked installs, lint, tests, build, migration checks, browser tests and reviewed dependency audit gates.

Security exceptions and their expiry are in [SECURITY-REVIEW.md](SECURITY-REVIEW.md). No application test proves the live network or Supabase policies are correctly configured.