# Production test walkthrough — مدارج 1.0.0

Use the deployed HTTPS domain after completing `DEPLOYMENT.md`. The supplied examples are fictional software test data. Their tax percentages, prices, permits and market assumptions are not verified business or legal guidance.

## Files

| File | Purpose |
| --- | --- |
| `examples/madarej-service-test-backup.json` | Straightforward profitable service case, no borrowing. Start here. |
| `examples/madarej-manufacturing-test-backup.json` | Two products, staff, depreciation, borrowing and working capital; intentionally exposes a cash deficit. |
| `examples/expected-results.json` | Exact calculated first-month, year-one and valuation values for both examples. |

These are **input backups**, not already-generated reports. Import them through the application's UI; do not upload them into `httpdocs`.

## Test A: service business from import to PDF

1. Open `https://YOUR-DOMAIN/report` in a normal browser profile. Use a separate test profile if this origin contains real work. Private browsing may discard your study when closed.
2. Select **استيراد المدخلات** and choose `madarej-service-test-backup.json`.
3. Accept the replacement prompt only after exporting any inputs you want to keep. Expect **تم استيراد المدخلات. راجع البيانات قبل إعداد الدراسة.**
4. Select **العودة إلى بيانات المشروع**. Review the nine steps. The project is **استوديو مدارج للتصميم — اختبار الإنتاج**, in Riyadh, SAR, starting 2026-10-01, over five years.
5. On the products step, check price 1,150 including 15% test sales tax, 20 monthly sales, capacity 40, and per-unit costs totalling 220. On staff, check two employees costing 3,500 each. Expenses total 1,500 monthly.
6. Go to **المراجعة والحفظ**, then save. Wait for a successful save status. Reload the page and verify the same inputs remain.
7. Open **الدراسة والتقارير والنسخ الاحتياطية** and click **إعداد الدراسة**. This sends the fictional inputs to OpenRouter using your configured key.
8. Stay on the report page. The process covers five generation stages and produces 16 sections. A successful first version must show the completion message and PDF download button. Time varies with the free provider; the request timeout is 180 seconds per request, not for the whole report.
9. Compare the deterministic tables to the following expected values. Display rounds to two decimal places; exact stored values are in `expected-results.json`.

| Service result | Expected SAR unless stated otherwise |
| --- | ---: |
| Initial investment / owner contribution | 30,000.00 |
| Borrowing | 0.00 |
| Monthly revenue excluding test sales tax | 20,000.00 |
| Monthly variable costs | 4,400.00 |
| Monthly payroll | 7,000.00 |
| Monthly operating expenses | 1,500.00 |
| First-month net profit | 7,100.00 |
| First-month closing cash | 16,100.00 |
| Year-one revenue | 240,000.00 |
| Year-one net profit | 85,200.00 |
| Funding shortfall | 0.00 |
| Project NPV at the entered 10% discount rate | 313,111.64 |

The revenue check is `1,150 / 1.15 × 20 = 20,000`; profit is `20,000 − 4,400 − 7,000 − 1,500 = 7,100`. These are the example's chosen assumptions.

10. Read all 16 narrative sections. They must describe a design service business, agree with these figures, avoid promises of profitability and state that external research was not performed. Narrative wording is nondeterministic; the numerical tables are deterministic.
11. Click **تنزيل الدراسة PDF**. Open the downloaded PDF. Check the cover name, Arabic and mixed Latin text, contents links, financial tables, charts, monthly appendix, input appendix and final page. The real model can produce a different number of pages from the local layout fixture.
12. Refresh `/report`. The report and calculated figures must remain. Generating identical inputs again must be disabled; downloading again must work.

## Test B: one revision

1. On the service example return to inputs and change monthly sales from **20** to **22**, leaving price/costs unchanged.
2. Save and return to the report. The first report must still show the original numbers with a stale-input notice.
3. Select **إعداد المراجعة النهائية**. On success the selector must contain versions 1 and 2.
4. In version 2, monthly revenue must be **22,000**, variable costs **4,840**, and profit **8,660**. Version 1 must still show **20,000 / 4,400 / 7,100**.
5. Download both versions. A third successful generation must be blocked on this study/browser, while downloads remain available.

## Test C: manufacturing and cash shortfall

Use another browser profile for this example to keep the service acceptance evidence intact. Import `madarej-manufacturing-test-backup.json`, review its steps, save, and generate.

| Manufacturing result | Expected SAR unless stated otherwise |
| --- | ---: |
| Initial investment | 33,000.00 |
| Owner contribution | 6,000.00 |
| Borrowing | 27,000.00 |
| Upfront borrowing fee | 100.00 |
| Monthly loan installment, first 24 months | 1,125.00 |
| First-month revenue | 15,000.00 |
| First-month variable costs | 2,500.00 |
| Monthly payroll | 11,000.00 |
| Monthly operating expenses | 1,500.00 |
| First-month depreciation | 333.33 |
| First-month net loss | −333.33 |
| First-month receivables | 15,000.00 |
| First-month inventory | 1,875.00 |
| First-month purchases / payables | 1,125.00 each |
| First-month closing cash | −7,975.00 |
| Year-one net loss | −4,000.00 |
| Maximum funding shortfall, base scenario | 27,006.25 |
| Project NPV | 23,393.21 |

The negative cash is expected. The report must disclose the shortfall rather than silently add borrowing. Month 24 ends with zero debt; month 25 has no loan principal payment. Review base, optimistic and pessimistic results, capacity tables and warnings. A positive NPV does not erase an earlier liquidity shortage. This case has multiple cash-flow sign changes, so an ambiguous IRR is an expected outcome.

## Test D: interruption and recovery

Use an example that has not consumed both successful versions:

1. Start generation and wait until at least one stage completes. Click **إيقاف الإعداد**. Expect an interruption message and completed progress retained.
2. Select resume. The app must request only remaining stages; a cancelled attempt must not consume a successful revision.
3. Attempt **العودة إلى بيانات المشروع** during generation. It must remain on the report and tell you to stop generation first. After stopping, navigation must work.
4. Reload during a request, then open `/report`. Expect a resumable checkpoint. If the provider had processed a request before the interruption but the stage had not been saved, resuming may repeat that unfinished stage.
5. Disconnect the test browser's network during a request, then reconnect. Expect an error, preserved previous report/checkpoint, and a working retry. Check browser developer tools; do not change shared VPS network settings.
6. Temporarily remove `generation-config.json` on a separate staging copy, then click generation. Expect a clear configuration error without hanging. Restore the file. Do not run this disruption on a domain other people are using.

## Test E: backup, persistence and UI

1. Use **نسخة احتياطية للمدخلات**, retain the downloaded JSON, then import it in a separate test profile. All inputs must match; report history is intentionally not part of this backup.
2. Add a valid PNG/JPEG/WebP logo of at most 2 MiB to a disposable test study, save, reload and export its PDF. The logo must persist and render correctly. Reject an oversized/invalid file without changing the previous logo.
3. Try a malformed JSON backup. Expect an import error; current inputs must remain unchanged.
4. Use keyboard Tab/Shift+Tab, Enter/Space, skip links and disclosure controls. Focus must remain visible. Invalid required fields must expose understandable messages.
5. At mobile width, verify no whole-page horizontal scrolling. Financial tables may scroll inside their own regions.
6. Test the actual browsers your users use. Local evidence covers Chromium at 1280px and 390px; Firefox, Safari and real mobile-device downloads still require acceptance on those devices.
7. Use **حذف المسودة** only for a disposable test study after exporting anything needed. Its confirmation explains that all locally saved reports and checkpoints on that origin are cleared.

## Record the outcome

```text
Release ZIP:
Domain:
Test date:
Browser and device:
Hosting smoke check: PASS / FAIL
Service first version and figures: PASS / FAIL
Service revision and preserved version 1: PASS / FAIL
Manufacturing figures and shortfall: PASS / FAIL
Cancel / reload / network recovery: PASS / FAIL
PDF opened and inspected: PASS / FAIL
Backup / restore / logo: PASS / FAIL
Keyboard / mobile layout: PASS / FAIL
Visible errors or remaining issues:
```

Keep the two PDFs, test result notes and release ZIP. Do not include API keys in those notes.
