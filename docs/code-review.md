# Code review and release evidence — 2026-09-08

Reviewed the current working tree, including the existing uncommitted report feature. No skills or subagents were used. Existing changes were preserved. The requested scope remains a simple static Angular application with a browser-visible OpenRouter key, hosted on Plesk.

## Findings addressed

| Priority | Finding and trigger | Change |
| --- | --- | --- |
| P1 | Production CSS used Angular's generated inline `onload` handler. The shipped CSP blocks inline JavaScript, so styles could remain `media=print` on Plesk. | Disabled critical CSS inlining; retained script/CSS minification. Packaging rejects inline event handlers. Browser QA uses the deployment CSP. |
| P1 | Starting generation immediately after edits could persist a report/checkpoint before the active draft had been saved. A failed save or reload could detach that work from the active inputs. | Save inputs before loading provider configuration or sending requests; stop generation on storage failure. |
| P1 | Loading a completed report recomputed its projection using current code. Later calculation changes could silently change figures while preserving the old AI narrative. | Validate saved projection shape and numerical values and preserve the stored figures, including resumed checkpoints. |
| P2 | Configuration/catalog requests had no timeout, and configuration could not be cancelled. | Added 30-second request bounds and propagated the run cancellation signal. |
| P2 | `Retry-After: 0` was parsed as a date/falsy number and could suppress a valid retry. | Distinguish integer delays from HTTP dates and handle zero correctly. |
| P2 | Schema-rejected responses lost usage records when the error handler restored the previous checkpoint. | Persist usage before section validation; failed attempts still consume no successful revision. |
| P2 | A report page could retain another study's old state after loading failed or inputs changed. | Clear previous report/checkpoint state before loading the active study. |
| P2 | Navigation back to editable inputs during generation allowed same-tab edits/deletion to race with checkpoint writes. | A route guard keeps the report open until generation is stopped/completed, with a visible explanation. |
| P2 | Saved reports accepted duplicate sections/revision order and malformed calculation payloads. Checkpoints did not validate source/metric references. | Validate exact section count, snapshot ownership, revision order, projection dimensions, source IDs and metric IDs. |
| P2 | Packaging copied deployment files after creating its checksums, omitted license output and created no ZIP. It also allowed stale builds. | Fresh build in the package command, versioned ZIP, complete manifest, archive verification, license inclusion and SHA-256 sidecar. |
| P2 | Missing JS/CSS could be rewritten to Angular HTML, masking failed uploads behind MIME errors. | Apache/IIS SPA fallback excludes file-like paths so missing assets return 404. |
| P3 | README described the old form-only phase and contradicted the implemented report workflow. | Replaced it with current behavior, deployment instructions, test examples and release notes. |

## Validation evidence

- Baseline: 68 tests passed. Final working tree: 78 tests passed across 11 files, including concurrent provider-routing error tests.
- Production build passed. Initial application payload approximately 269 kB raw / 72 kB estimated transfer. Lazy PDF dependencies still emit CommonJS optimization warnings; they are documented rather than suppressed.
- `npm audit --omit=dev`: zero reported vulnerabilities on this date. The installation audit also reported zero vulnerabilities. This is a point-in-time registry result.
- Both supplied example inputs pass the application validation. Independently checked service and manufacturing first-month arithmetic; all 360 monthly balance checks across the two examples and their three scenarios passed.
- Browser: all nine wizard steps scanned at 1280px and 390px; zero AXE violations and no whole-page horizontal overflow. The populated report had zero AXE violations at both widths. No external resources were loaded by the local fixture.
- The browser loaded production assets under the shipped CSP without console errors. A representative report exported successfully to a 51-page A4 PDF; Arabic cover and narrative pages were visually inspected. See release notes for the limits of this evidence.
- The public OpenRouter catalog listed the configured free model with zero prompt/completion prices, structured outputs, response format and medium reasoning support. No authenticated model request was made.
- ZIP packaging verifies all archived file hashes, required hosting/font/license files and exclusions. `verify:release` reruns this check on the final archive.

## Accepted scope and remaining live checks

The user explicitly retained a browser-side API key and requested no additional backend/security architecture. This is an accepted design limitation: visitors can read the key and browser-only revision limits are not account entitlements.

A runtime key and provider-routing changes were added to the working tree concurrently during review and preserved. The final package includes the configured runtime file by user request. No production domain was provided and this review made no authenticated generation call. Live generation, provider response quality, actual Plesk headers/routing, and Safari/Firefox/device downloads remain unverified. The delivered hosting check and production walkthrough make those remaining checks repeatable.

The current provider request permits data collection (`data_collection: allow`), as in the concurrent routing edit. OpenRouter account privacy settings can still prevent an endpoint from being selected; the UI now distinguishes those failures from general routing errors.

AXE reported manual-review items for decorative glyph contrast and some clipped/offscreen table cells at mobile width. Zero automatic violations is not a claim of full WCAG conformance. The HTML report provides semantic headings/tables; jsPDF output is not a tagged accessible PDF.

Data remains browser-local with one editing tab expected. There is no server backup, authentication or cross-device sync. Clearing browser storage loses local history. Input backups do not preserve report history; retain PDFs separately.

Financial results are a simplified planning model using user-entered rates and conventions. The review checked implementation consistency, arithmetic fixtures and reconciliation; it is not an accounting/tax certification. Research remains disabled and its live paid-tool behavior is not accepted by this release.

Official references used: [Angular Service API](https://angular.dev/api/core/Service), [OpenRouter model](https://openrouter.ai/nvidia/nemotron-3-super-120b-a12b%3Afree/api), [OpenRouter web-search tool](https://openrouter.ai/docs/guides/features/server-tools/web-search), [Plesk rewrite setup](https://support.plesk.com/hc/en-us/articles/12377525282967-How-to-enable-Apache-nginx-rewrite-rules-in-Plesk).
