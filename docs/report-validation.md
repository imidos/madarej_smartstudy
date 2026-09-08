# Report workflow validation

## Local automated checks

Run the following before each release:

```powershell
npm test -- --watch=false
npm run build
npm run package:release
```

The focused test suite covers Signal Form validation and v1-to-v2 migration, IndexedDB draft/report/checkpoint storage, backup validation, Arabic and Latin numeric entry, calculated decimal precision, monthly statement reconciliation, capacity limits, funding gaps, zero-discount valuation, ambiguous IRR, zero-cost request limits, model capability preflight, malformed model output, research evidence citations, cancellation/retry checkpoint behavior and local revision accounting.

The calculation tests use independent first-month service expectations and a manufacturing example with working capital, depreciation, loans and five annual reconciliations. They do not call OpenRouter.

## Browser QA fixture

After `npm run build`, run `node scripts/serve-a11y.mjs` and browse to `http://127.0.0.1:4201/report`. The local-only controls load service or manufacturing fixtures in IndexedDB. They are injected by the QA server and are absent from the static production build.

For each fixture:

1. Confirm the 16 generated-section placeholders, assumptions, annual and monthly tables, product-capacity table, warnings, charts and methodology are readable.
2. Select the PDF export control. The QA server receives `tmp/pdfs/representative.pdf`; render it with Poppler and inspect the cover, Arabic/mixed-text narrative, financial tables, at least one chart, source appendix, long monthly table and last page. Check `pdfinfo` reports A4 pages and that text extraction returns content from every page.
3. Run the injected axe scan at desktop and mobile widths. It must report zero violations and no horizontal page overflow. Chart canvases have labelled images and each chart exposes its equivalent data table.
4. Test keyboard navigation: skip links, table regions, details controls, section links, error links and the download/backup controls. Keep focus visible.

The fixture does not test a model response and never sends client data outside localhost. It is a layout and document check only.

## Live acceptance gate

Use a newly issued dedicated OpenRouter key in the Gitignored runtime configuration only. Do not use a key pasted into any conversation. With the zero-cost configuration, complete one service and one manufacturing example and inspect the actual model identifier, returned usage, Arabic fluency, section-specific content, unsupported claims and contract recovery behavior. Retain completed reports when a fresh generation fails.

Research stays disabled. Its actual provider behavior and paid tool cost require a separately approved, nonzero-budget evaluation. Do not claim research or live model quality has been accepted until that work occurs.

Plesk validation, browser download behavior outside the current Chromium test browser, Safari/mobile PDF opening, and the host’s cache/header rules remain deployment checks described in `docs/deployment.md`.
