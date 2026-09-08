# مدارج — feasibility study 1.0.0

Arabic RTL Angular 22 application: a nine-step study form, decimal financial projections, staged OpenRouter reports, charts, Arabic PDF exports, and browser-local backups. Deploy the compiled static files on Plesk. No backend, database server, account system or Node process is required on the VPS.

## Develop and verify

Use Node 24 and the checked-in npm lockfile. In Windows PowerShell use `npm.cmd`.

```powershell
npm.cmd ci
npm.cmd start
npm.cmd test -- --watch=false
npm.cmd run validate:examples
npm.cmd run release
```

`release` runs tests, makes a fresh production build, then creates and verifies a timestamped ZIP in `release/`. It includes the deployment guides, examples, a file manifest and a separate ZIP checksum. Existing work is not committed or tagged automatically.

## Deploy and test

1. Follow [the Plesk deployment guide](docs/deployment.md).
2. Keep the included `httpdocs/generation-config.json`. If packaging without a configured key, copy the example there and enter your key. For development use `public/generation-config.json`.
3. Follow [the production test walkthrough](docs/production-test.md). It includes two ready-to-import files and exact expected results.
4. Review [the findings and validation evidence](docs/code-review.md) and [release notes](docs/release-notes.md).

The simple browser-side key design is retained as requested; visitors can read that key. Packaging includes a configured runtime file when available and a separate blank example. Research is disabled and free-only requests are the default.

## Data and calculation behavior

The active draft, local reports and generation checkpoints are stored in IndexedDB database `madarej-feasibility`. There is one active study per browser/origin. Version-1 drafts migrate to schema version 2, retaining previous inputs and requiring review of added assumptions. Use one editing tab. There is no cross-device synchronization or server backup.

Autosave is debounced; explicit saves serialize through a queue. Generation saves inputs before contacting OpenRouter. Successful reports retain their input snapshot and validated calculated figures, even after later code changes. A study permits one successful initial report and one successful revision on this browser/origin. Failed attempts preserve completed stages and do not consume a revision. Browser-local limits are workflow controls.

Input backups include data and the optional PNG/JPEG/WebP logo; they do not contain report history or API credentials. Retain PDFs separately. Deleting a draft clears all studies/reports/checkpoints on that origin. Clearing browser data has the same local-data consequences.

Amounts accept Arabic, Persian and Latin digits with up to six decimal places. `decimal.js` performs calculations. Payroll is counted once; annual expenses are divided by 12; sales tax is removed from tax-inclusive prices; capacity limits sales. Projections disclose working-capital assumptions, depreciation, simplified profit tax, financing, scenarios, terminal recovery, NPV, IRR and funding shortfalls. Rates are user inputs, not country-specific tax advice. Report methodology describes these conventions.

## Browser QA

```powershell
npm.cmd run build
node scripts/serve-a11y.mjs
```

Open `http://127.0.0.1:4201/study`. The local-only controls scan the app with AXE and can load synthetic report fixtures. The harness uses the deployment CSP and captures PDF exports in `tmp/pdfs/representative.pdf`. It is excluded from the release.

The downloadable PDF is not a tagged accessible PDF; the HTML report provides semantic headings and data tables. Passing AXE does not replace keyboard, screen-reader and target-device checks.
