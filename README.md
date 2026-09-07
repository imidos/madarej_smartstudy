# مدارج — دراسة الجدوى

Arabic RTL feasibility-study wizard built on the existing Angular 22 starter, using stable Signal Forms, TypeScript 6, and strict template checking.

## Run locally

```sh
npm ci
npm start -- --host 127.0.0.1
```

Open `http://127.0.0.1:4200/study`. On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`.

```sh
npm test -- --watch=false
npm run build
```

Production output: `dist/feasibility/browser`. Serve this folder with an SPA fallback to `index.html` for `/study`.

## Implemented scope

Nine steps collect project, market, operations, staff, products/services, operating expenses, startup investment, financing, and a final review. Forward navigation validates preceding sections; users can return to edit freely. Repeatable entries use stable IDs and confirmation before removing populated rows. Optional categories have explicit “none” selections. Manufacturing adds conditional production requirements.

The completion message confirms a successful local save. No AI, report generation, payment, account, backend, or cross-device synchronization is included. No API credentials are needed. Any future OpenRouter credentials belong exclusively on a backend.

## Data and persistence

- `study-model.ts` defines the version-1 `FeasibilityStudyDraft`. Persisted field names are independent of Arabic labels and Signal Forms state.
- `StudyStore` owns one signal-backed model and its Signal Form, validation, navigation, derived totals, and a serialized save queue. Autosave is debounced by 450 ms; “save and continue” also explicitly saves. Finalization cancels pending older saves.
- `DraftRepository` stores one active draft in IndexedDB database `madarej-feasibility`, object store `drafts`, key `active`. Data, step, timestamps, completion state, and optional logo Blob are saved together.
- Unsupported versions and malformed drafts are reported and never silently overwritten. Storage failures remain visible, and a failed deletion preserves the current model. A successful deletion starts a new empty draft.
- Logo uploads accept PNG/JPEG/WebP up to 2 MiB, require browser image decoding, and reject images above 25 million pixels. Preview URLs are released when replaced or removed.
- `StudyFinalizer.finalize()` independently validates, persists, and returns a structured completed snapshot. This is the boundary for later backend integration. Editing a completed draft invalidates its completion status until it is finalized again.

Storage belongs to the current browser and origin. Clearing browser data removes the draft. No remote backup is created. The current phase assumes one editing tab for the active draft.

## Numeric and financial assumptions

Numeric inputs remain strings so blank and explicit zero are distinct. Arabic, Persian, and Latin digits are accepted, as is the Arabic decimal separator. Thousands separators, exponent notation, more than six decimal places, and absolute input values above one trillion are rejected.

Calculations use `decimal.js`; display rounds to two decimal places without changing stored inputs.

- Unit cost = materials + additional labor + commissions + packaging + other costs.
- Monthly payroll = sum of headcount × (salary + additional employment costs per employee).
- Annual operating expenses are divided by 12; monthly expenses are unchanged. Fixed operating total includes payroll exactly once. Per-unit labor explicitly excludes salaries already recorded in staff.
- Startup investment = assets and establishment expenses + deposits + initial inventory + working-capital reserve. Inventory is entered once in its dedicated field.
- Borrowing = max(0, startup investment − owner contribution). Contribution above required investment is flagged.
- Loan preview uses equal monthly payments, a fixed annual rate divided by 12, and declining principal, with no grace period. Zero-interest payment = principal / number of months. Upfront borrowing fees remain separate from principal and installments.
- Revenue preview removes the user-entered sales tax from the tax-inclusive selling price. Country and currency selections do not supply tax rules, legal requirements, or currency conversions.

## Validation and browser checks

Vitest covers decimal calculations, conditional requirements, capacity and financing inconsistencies, native Signal Forms interaction, draft corruption/storage failures, navigation, autosave/finalization races, and logo handling.

A local-only AXE harness can serve the production build:

```sh
npm run build
node scripts/serve-a11y.mjs
```

Open `http://127.0.0.1:4201/study` and select “Run accessibility check”. This harness is outside the application bundle and uses a separate browser origin/draft. It reports violations, manual-review items, horizontal overflow, and external resource requests. The QA control itself is excluded from the app scan.

See [validation notes](docs/validation.md) for the checks performed during implementation.
