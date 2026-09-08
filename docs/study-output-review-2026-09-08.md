# Review of the supplied Madarej study

The supplied PDF is not acceptable as a completed feasibility study for the supplied JSON. It contains the local layout-test narrative and a different set of inputs. Its Arabic rendering is generally readable, but this artifact cannot establish the quality of a live LLM completion.

Reviewed: `examples/madarej-service-test-backup.json`, `C:/Users/net16/Downloads/madarej-study-v1 (2).pdf` (51 pages), and the current generation, projection, viewer and PDF code. No skills were used. No application code or supplied inputs were changed, and no new OpenRouter generation was requested.

## 1. The PDF contains a layout fixture

Pages 3–10 contain 16 sections repeating the same general paragraph and actions. Page 3 explicitly says: «هذه عينة اختبار لتنسيق الملخص التنفيذي وليست دراسة مولدة بالذكاء الاصطناعي».

This text matches `scripts/report-fixture.ts:62`, including its deliberate threefold repetition and its mixed-language test sentence containing Angular, OpenRouter, 12.5%, and SAR 1,250. The fixture sets the recorded model to `local-layout-fixture` with zero tokens at line 58. Its project name matches the PDF cover: «استوديو مدارج للتصميم — عينة اختبار».

The fixture is a local QA path that constructs a saved report without calling the LLM. Its seed operation replaces the local QA draft and saved report. This identifies the content's origin; it does not establish which browser actions led to this downloaded copy, or prove that production generation uses the fixture.

**Writing assessment:** readable Arabic sentences, but no substantive executive summary, market analysis, staffing analysis, sensitivity interpretation, or project-specific recommendation. Repeating identical advice under different headings is unsuitable for a client report. The mixed-language test sentence is also inappropriate in a real study. These are fixture characteristics, not evidence of a weak LLM response.

## 2. The PDF and JSON describe different financial cases

The PDF inputs are visible on pages 43–46; financial results appear on pages 13–18 and charts on pages 19–27.

| Item | Supplied JSON | Supplied PDF |
| --- | ---: | ---: |
| Services | 1 | 2, including Web 2026 |
| Identity-design price including input tax | SAR 1,150 | SAR 115 |
| Monthly identity-design sales | 20 | 100 |
| Monthly identity-design capacity | 40 | 200 |
| Annual sales-volume growth | 0% | 5% |
| Staff | 2 designers | 2 designers + operations manager |
| Monthly payroll including additions | SAR 7,000 | SAR 11,000 |
| Equipment/furniture investment | SAR 20,000 | SAR 23,000 |
| Initial inventory | SAR 0 | SAR 2,000 |
| Funded cash reserve | SAR 9,000 | SAR 7,000 |
| Owner contribution | SAR 30,000 | SAR 6,000 |
| Total investment | SAR 30,000 | SAR 33,000 |
| Borrowing | SAR 0 | SAR 27,000 |
| Year-one revenue excluding input sales tax | SAR 240,000 | SAR 180,000 |
| Year-one net profit under entered assumptions | SAR 85,200 | SAR 0 |

Reconstructing the current service layout fixture reproduces the PDF's selected financial results: base NPV SAR 29,726.51, project payback 40.12 months, and base funding shortfall SAR 10,600. The optimistic and pessimistic NPVs also match: SAR 175,469.09 and negative SAR 110,811.40. This supports a different-input explanation for the discrepancies; they are not evidence that the LLM changed these table figures.

## 3. Correct reference results for the supplied JSON

These are mechanical projections under the entered assumptions, not validation of demand, prices, tax applicability, or actual business profitability.

| Calculation | Expected result |
| --- | ---: |
| Net selling price: 1,150 / 1.15 | SAR 1,000 per service |
| Variable unit cost: 150 + 50 + 20 | SAR 220 |
| Monthly revenue: 20 × 1,000 | SAR 20,000 |
| Monthly variable costs: 20 × 220 | SAR 4,400 |
| Monthly payroll: 2 × (3,000 + 500) | SAR 7,000 |
| Monthly operating expenses: 12,000 / 12 + 500 | SAR 1,500 |
| Monthly profit: 20,000 − 4,400 − 7,000 − 1,500 | SAR 7,100 |
| Annual profit | SAR 85,200 |
| Capacity utilization: 20 / 40 | 50% |
| Monthly break-even volume: 8,500 / 780 | 10.90 services; 11 whole services |
| Simple project payback: 30,000 / 7,100 | 4.23 months |
| Five-year project NPV, 10% annual discount converted monthly | SAR 313,111.64 |

The NPV includes recovery of the SAR 9,000 opening reserve in the final month, as the current methodology specifies. The full engine output is retained in `tmp/study-review/projections.json`.

The study must explain its weak assumptions: demand and competitor evidence are absent; prices, sales, salaries and expenses stay flat for five years; sales start immediately at the full forecast; collection is immediate; profit tax is entered as zero; and equipment is marked non-depreciable. Utilities and internet are described operationally but have no separately identified expense. Software subscriptions, owner compensation and other costs require clarification rather than invented amounts. The SAR 150 unit labor charge must be genuinely additional to payroll to avoid economic double counting.

## 4. Real LLM generation has useful safeguards but no content acceptance gate

`src/app/report/generation-store.ts:202` sends the study inputs, calculated base metrics, base annual statements, scenario NPVs/warnings, methodology and research evidence. Financial tables are rendered from the saved projection rather than generated by the model. The system prompt correctly treats supplied text as data and prohibits invented financial figures, sources and regulatory claims.

However:

- `validateSections()` at line 20 checks schema, expected section IDs and permitted source/metric IDs. It does not check numeric claims in paragraphs, repeated prose, contradictions, unsupported claims or whether each section answers its topic. A structurally valid but inaccurate report can pass.
- `metricValues()` in `report-model.ts:134` sends bare values without explicit unit/period metadata. For example, `payback` is months, `irr` is annual percent, and `breakEvenRevenue` is annual revenue. These meanings should be explicit in the model context.
- The model's scenario context contains NPVs and warnings, but omits the calculated scenario profits, cash balances and payback results. Add those authoritative figures if the scenario section is expected to discuss them.
- Only the executive-summary stage receives previous sections. There is no final consistency review across the complete narrative.
- `metricIds` are accepted but not displayed as figures or linked references by the narrative loops in `report-viewer.html` or `report-pdf.ts`. Referring to a metric ID therefore does not itself give the reader a traceable figure.
- The web viewer exposes model names, but the PDF does not include model/run provenance or an input fingerprint. A prominent test-report label and matching input identification would make this mix-up easier to detect.

OpenRouter's structured-output feature concerns JSON schema conformance. Content accuracy still needs application-level acceptance criteria; the limitations above follow directly from the local code. [Official structured-output documentation](https://openrouter.ai/docs/guides/features/structured-outputs).

## 5. PDF presentation

All 51 pages were rendered and surveyed, with larger inspections of narrative and detailed-input pages. Arabic letters join correctly in the inspected text; table columns read right-to-left, and the mixed Arabic/Latin sample is visibly legible. Chart data tables provide exact figures alongside the chart images.

Pagination needs improvement. Page 46 contains only the loan-term row. Pages 30, 33, 36, 39 and 42 contain short continuations of monthly tables with extensive blank space. Staffing and product tables split across pages without retaining their section title on every continuation. A close-up of page 44 confirms its text stays above the footer; footer overlap was not confirmed. Chart labels are much smaller than narrative text, and nine separate chart pages are excessive for this small case.

Keep short tables together, repeat meaningful continuation captions, group related charts and move detailed monthly statements into a compact appendix. Use consistent digit formatting, explicit monetary units in financial table captions, and human-readable country/currency labels. A PDF should also distinguish missing information from information that does not apply.

Text extraction is imperfect: pypdf omitted some inline Latin/numeric content while pdfplumber recovered it in visual order with reversed Arabic. Visible readability therefore does not establish reliable copy/paste, search or assistive-technology reading order. PDF accessibility was not certified.

## 6. Example of appropriate writing for this JSON

This is reviewer-written illustrative text, not a replacement report or a sampled OpenRouter response:

> يستهدف استوديو مدارج تقديم خدمات تصميم الهوية للشركات الصغيرة في الرياض. وبحسب مدخلات صاحب المشروع، يبلغ سعر الخدمة 1,150 ريالًا شامل ضريبة المبيعات المدخلة بنسبة 15%، بما يعادل 1,000 ريال قبل الضريبة. وعند بيع 20 خدمة شهريًا، تبلغ الإيرادات المتوقعة 20,000 ريال، ويبلغ صافي الربح التقديري 7,100 ريال شهريًا وفق التكاليف والافتراضات الحالية، التي لا تتضمن إهلاكًا أو ضريبة على الأرباح. وتمثل المبيعات المفترضة 50% من الطاقة المدخلة البالغة 40 خدمة شهريًا.
>
> تشير الحسابات إلى تغطية التكاليف التشغيلية عند بيع نحو 11 خدمة شهريًا، إلا أن تحقيق هذا الحجم لم يُدعَم ببحث سوقي أو بيانات طلب فعلية. وقبل اتخاذ قرار الاستثمار، يلزم التحقق من قدرة قناة البيع الإلكترونية على جذب العملاء، ومراجعة تكاليف البرامج والخدمات والتشغيل، وتوضيح ما إذا كانت تكلفة العمالة لكل خدمة إضافية إلى رواتب المصممين. وتظل النتائج مشروطة بصحة هذه المدخلات وانتظام التحصيل.

## 7. Verification and next acceptance step

- Exact JSON passed current study validation.
- Independent monthly totals, year-one profit, investment, borrowing, NPV and payback checks passed.
- All 180 monthly balance checks across the JSON's three scenarios passed.
- Existing `projections.spec.ts` and `generation-store.spec.ts`: 12 tests passed in 2 files. These tests do not prove live narrative quality.
- Selected PDF results matched the reconstructed local fixture. This was not an automated cell-by-cell audit of every PDF table.
- No live model call, production-browser generation, market research, tax/legal verification or application change was performed.

Next, obtain a completed real-model report tied to this exact JSON and review its prose against these reference figures. Record the actual model, input fingerprint and generation time; reject placeholder text, unsupported claims, repeated sections and mismatched figures before calling the report final. Improving the prompt alone cannot validate this attached fixture as an LLM study.
