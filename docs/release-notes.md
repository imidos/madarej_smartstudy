# مدارج 1.0.0 — 2026-09-08

Deployment artifact prepared from the current working tree for a simple static Plesk VPS installation. The archive is a local release; it has not been uploaded or published as a Git tag.

## Included

- Nine-step Arabic RTL study wizard with local autosave, logo upload and input backups.
- Financial projections over three/five years with scenarios, working capital, financing, capacity, valuation and cash-shortfall warnings.
- Five-stage OpenRouter generation covering 16 report sections; local checkpoints, cancellation, resume and one successful revision.
- Frozen report figures and input snapshots, charts, tables and Arabic PDF export.
- Reliability fixes detailed in `CODE-REVIEW.md`, CSP-compatible CSS loading, Apache/IIS routing and cache settings.
- Versioned ZIP, complete file hashes, ZIP checksum, two importable test studies and expected financial results.

## Deploy

Upload `httpdocs` contents to the domain root, including the configured `generation-config.json` when included. If packaging without a key, create it from the blank example. Follow `DEPLOYMENT.md`, then `PRODUCTION-TEST.md`.

## Validation and known limits

78 automated tests pass, production build passes, production npm audit reports zero vulnerabilities, both input examples and 360 monthly reconciliations pass. All nine wizard steps and the populated report pass automatic AXE scans at desktop/mobile widths. A 51-page A4 PDF export was generated locally and representative pages inspected.

Local browser checks used synthetic report narrative, not live OpenRouter output. Live model quality, actual Plesk deployment, Firefox/Safari and real mobile PDF downloads remain acceptance checks. PDF output is not tagged for accessibility; use the HTML report's semantic tables/headings for accessible reading. Lazy PDF dependency CommonJS warnings remain.

The API key stays browser-visible by request. Research defaults off. Drafts, reports and checkpoints are local to one browser/origin; one editing tab is expected. Existing draft schema v1 migrates to v2. A rollback to a v1-only application requires an input backup and is not directly compatible with v2 local drafts.
