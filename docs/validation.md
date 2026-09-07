# Validation notes

The implementation was checked with both a manufacturing example and a service example. The manufacturing example included two products, two staff roles, yearly and monthly operating expenses, two asset types, Arabic-number inputs, a zero-interest loan, and a persisted logo. The service variant confirmed that manufacturing-only questions disappear while the remaining form and review remain valid.

Automated checks cover:

- decimal calculations, Arabic/Persian/Latin numeral parsing, blank-versus-zero values, expense normalization, loan previews, and separate loan fees;
- required fields, conditional manufacturing fields, capacity limits, staff counts, invalid countries/currencies, and financing inconsistencies;
- Signal Form leaf errors, navigation, autosave, finalization, completion invalidation after editing, storage failure, corrupt drafts, and deletion behavior;
- IndexedDB draft/Blob persistence and logo MIME, size, decoding, replacement, and failure behavior.

Browser checks used the production build at 1280 px and 390 px widths. All nine screens had no AXE violations or horizontal overflow. AXE listed only its manual-review “incomplete” entries for decorative, aria-hidden check marks and a short decorative footer dot; these elements have no accessible text requirement. The screen uses visible focus styles, a skip link, semantic labels, native keyboard controls, and a focus target after validation and completion.

The local AXE harness verifies only `app-root`, so its own test button and output are excluded. It showed no external resources: the typeface is bundled locally and the application makes no network or report-generation request.
