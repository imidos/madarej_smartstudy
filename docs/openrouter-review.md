# OpenRouter integration review — 2026-09-08

Follow-up: the owner subsequently requested removal of privacy routing restrictions. The client now sends `data_collection: 'allow'`; references to `deny` below describe the reviewed snapshot. OpenRouter account privacy settings remain independently enforced.

Further follow-up: HTTP 200 top-level and choice-level provider error envelopes are now classified before completion validation, including bounded retries for transient failures. The report viewer clears stale import notices when generation starts. All 35 report tests pass. A small synthetic structured completion returned HTTP 200 and reported zero cost. The larger diagnostic using the existing report prompt and synthetic study fixture was blocked by automatic approval review pending explicit user authorization; successful full-report generation is still unverified.

Reviewed the current client, configuration schema, generation checkpoints, research adapter, report persistence/viewer, tests, and deployment/package instructions against the [OpenRouter quickstart](https://openrouter.ai/docs/quickstart) and the linked references below. This is an integration review, not validation of the financial methodology, Arabic report quality, PDF layout, or production hosting.

## Confirmed runtime blocker

One synthetic request using the configured free model, the application's routing constraints, and no study data returned HTTP 404 with the provider message: “No endpoints found matching your data policy (Free model training).” The public endpoint catalog lists the model and its reasoning/structured-output capabilities, so model existence does not establish account eligibility.

The account's free-model training policy blocks the selected route. The application also sends `data_collection: 'deny'`. Account settings and request routing restrictions both need to be compatible with a provider; changing an account setting alone has not been tested and is not guaranteed to resolve every restriction. [Provider privacy](https://openrouter.ai/docs/guides/privacy/provider-logging), [routing controls](https://openrouter.ai/docs/guides/routing/provider-selection).

Select a model/provider compatible with the intended privacy and price constraints, or explicitly decide whether the free provider's data terms are acceptable. No privacy settings, model, API key, or price constraints were changed during this review. A successful completion remains unverified.

## Findings

### P1 — Shared deployment key is exposed to every visitor

`src/app/report/openrouter-client.ts:52` downloads the runtime JSON into the browser and the completion request uses its key directly. A visitor can reuse that key outside this application, bypassing its free-only routing, research switch, and local revision limits, subject only to restrictions enforced by OpenRouter itself. Gitignore and release-package exclusion prevent accidental distribution through those channels; they do not protect the key once the runtime file is hosted.

This is an explicitly documented tradeoff of the current static architecture, not a newly introduced regression. It remains a public-deployment risk against the documentation's key-protection guidance. For an operator-funded service, keep the key behind an authenticated server boundary. For a static application, consider per-user authorization through the documented OAuth PKCE flow. Review provider-enforced key/credit restrictions independently. [Authentication](https://openrouter.ai/docs/api_reference/authentication), [OAuth PKCE](https://openrouter.ai/docs/guides/overview/auth/oauth), [limits](https://openrouter.ai/docs/api_reference/limits).

### P2 — HTTP 200 error envelopes bypass error classification and retries

`src/app/report/openrouter-client.ts:229` parses every successful HTTP response as a completion. OpenRouter documents non-streaming responses with HTTP 200 and a body containing `error` instead of `choices`. Those responses currently become a generic invalid-response error; transient rate/provider failures never reach the existing retry branch. Responses with `finish_reason: 'error'` are likewise reported as truncation.

Parse the error envelope before the success schema, map its typed error category to sanitized application messages, and apply a bounded retry policy where appropriate. Cover HTTP 200 error-only bodies and partial completion errors. [Errors and debugging](https://openrouter.ai/docs/api_reference/errors-and-debugging).

### P2 — Failed research can discard billable usage and repeat searches on resume

`src/app/report/research-adapter.ts:41` validates the returned JSON and citations before returning usage. If JSON or evidence validation fails, `src/app/report/generation-store.ts:145` never receives the usage, and `researchDone` stays false. Resuming then issues another research request. Each request has search-count limits, but repeated attempts are not charged against a persisted study allowance.

The deployment guide correctly describes `researchBudgetUsd` as a request gate, not an account spending cap. It also cannot currently cap cumulative study research. Persist usage/attempt state before evidence validation, account for unknown outcomes after network interruption, and enforce the intended cumulative allowance before another paid attempt. Truncated completions have a related usage-loss path because the client throws before returning usage. Search calls incur charges separately from model tokens. This issue is dormant while research remains disabled. [Search pricing and usage](https://openrouter.ai/docs/guides/features/server-tools/web-search).

## Documentation alignment

| Area | Result |
| --- | --- |
| HTTP API | Correct POST URL, Bearer header, JSON body, `model`, `messages`, and non-streaming mode. Raw `fetch` is supported; an SDK migration is not required. Attribution headers are optional. [Quickstart](https://openrouter.ai/docs/quickstart). |
| Configuration | Runtime JSON is an application convention, not an OpenRouter endpoint. Strict local validation and `no-store` are appropriate; the deployed path assumes origin root as documented. |
| Model checks | Catalog lookup, free-price checks and capability checks are useful, but cannot prove an account can route to that model. Provider-level support and account policy still apply. [Structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs). |
| Structured output | `response_format.type: 'json_schema'`, named schema, `strict: true`, and `require_parameters: true` match the docs. Local schema/reference validation remains necessary because enforcement varies by provider. [Structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs). |
| Reasoning | Unified `reasoning.effort` and `exclude: true` match the docs. Exclusion hides the trace, not the computation or its token usage. [Reasoning](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens). |
| Routing | `data_collection: 'deny'` and zero prompt/completion `max_price` are valid restrictions. Removing them is not a neutral 404 fix. [Provider routing](https://openrouter.ai/docs/guides/routing/provider-selection). |
| Research request | The server-tool form, Exa fast mode, per-search/result bounds, and top-level `max_tool_calls` are documented. OpenRouter executes the tool loop; a client tool executor is not missing. [Server tools](https://openrouter.ai/docs/guides/features/server-tools). |
| Research evidence | Matching URLs to returned `url_citation` annotations and retaining provider excerpts is consistent with the documented Exa result format. Paid live behavior remains untested. [Web search](https://openrouter.ai/docs/guides/features/server-tools/web-search). |
| Retries | HTTP 429/5xx retries are bounded, recognize `Retry-After`, and support cancellation. Longer waits stop automatic retries. The HTTP 200 error-envelope gap above remains. [Error handling](https://openrouter.ai/docs/api_reference/errors-and-debugging). |
| Checkpoints | Valid completed sections survive interruption and revisions are consumed on full success. These are local workflow rules, not OpenRouter account limits or tamper-resistant entitlements. |

## Change and verification in this session

- Added sanitized Arabic messages for HTTP 404 privacy/training/publication failures and a generic routing fallback. Raw provider details are not displayed. This improves diagnosis; it does not unblock the account.
- Added regression coverage for those classifications, malformed 404 bodies, and absence of automatic 404 retries.
- `npm.cmd test -- --watch=false --include='src/app/report/**/*.spec.ts'`: 4 files, 26 tests passed, including client, research, generation checkpoints, and repository tests.
- Live check: one synthetic free-only request reproduced the policy 404. No customer study or paid research was submitted.
- No successful live report, paid research, browser acceptance test, production build, or deployment was validated by this review. The broader findings above were not implemented.
