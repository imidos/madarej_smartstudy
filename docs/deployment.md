# Plesk VPS deployment — release 1.0.0

This release is a static website. You do not need to install Angular, Node, PHP or a database on the VPS. The app runs in the visitor's browser and calls OpenRouter directly. The browser-side key arrangement is retained as requested.

## 1. Prepare the files

Use the delivered `madarej-1.0.0-<timestamp>.zip`. Extract it on your computer. Its layout is:

```text
httpdocs/                         Website files to upload
  index.html
  main-<hash>.js
  chunk-<hash>.js
  styles-<hash>.css
  fonts/ and media/
  .htaccess                       Apache configuration
  web.config                      IIS configuration
  generation-config.json          Included when a key is configured
  3rdpartylicenses.txt
generation-config.example.json    Copy and configure separately
examples/                         Test inputs and expected numeric results
DEPLOYMENT.md
PRODUCTION-TEST.md
CODE-REVIEW.md
RELEASE-NOTES.md
manifest.json                     Version, build provenance and file hashes
```

Upload the **contents** of the package's `httpdocs`, not the whole release directory. The final location must be the domain's `httpdocs/index.html`, not `httpdocs/httpdocs/index.html`. Keep the guides, manifest and example inputs on your computer.

If rebuilding from source, run these commands in the project folder with Node 24:

```powershell
npm.cmd ci
npm.cmd run validate:examples
npm.cmd audit --omit=dev
npm.cmd run release
npm.cmd run verify:release -- "release/madarej-1.0.0-TIMESTAMP.zip"
Get-FileHash "release/madarej-1.0.0-TIMESTAMP.zip" -Algorithm SHA256
```

Replace `TIMESTAMP` with the actual filename. Compare the last result to the adjacent `.zip.sha256` file. Packaging already verifies every archived file against the manifest. The manifest records `dirty: true` when packaging uncommitted work; it does not imply a Git commit or published release tag.

## 2. Set up the domain

1. Point your domain/subdomain DNS A record to the VPS IP. If an AAAA record exists, ensure it points to working IPv6 hosting as well.
2. In Plesk, open **Websites & Domains** and select or create the destination domain. Use a dedicated domain/subdomain for this app.
3. Open its **Hosting Settings**. Use website hosting and the document root `httpdocs` (or use the root shown for that domain).
4. Install a valid certificate through **SSL/TLS Certificates / Let's Encrypt**. Enable HTTPS and permanent HTTP-to-HTTPS redirection.
5. Open **File Manager** for that domain. Before replacing an existing website, download a complete copy of its current files, including its runtime configuration.
6. Upload/extract the website files into the domain's document root. Make `index.html` the first default document. Move any previous default `index.php`/Plesk placeholder out of this domain root after backing it up.

HTTPS is required for browser storage/crypto/locking APIs used by generation. Keep the same hostname and scheme for later releases to preserve browser-local data.

## 3. Select the hosting instructions

### Linux Plesk with Apache and nginx

The simplest setup is to let Apache handle this domain so the included `.htaccess` controls routes and headers:

1. Keep `.htaccess` in the website root; ensure File Manager shows hidden files.
2. Open **Apache & nginx Settings** for this domain.
3. Enable **Proxy mode**. Disable **Smart static files processing** and **Serve static files directly by nginx** for this domain so Apache applies the supplied cache/header rules consistently.
4. Ensure Apache `mod_rewrite` and `mod_headers` are available and `.htaccess` overrides are enabled. Most standard Plesk Apache setups already provide them.
5. Apply the settings, then verify `/study` and `/report` by opening each directly and refreshing.

Do not paste a second `location /` block into Plesk's generated nginx configuration. If you intentionally run nginx-only hosting, `.htaccess` is ignored: an administrator must implement SPA routing and matching headers in the existing locations. The recommended Apache path above avoids that additional configuration. [Plesk rewrite instructions](https://support.plesk.com/hc/en-us/articles/12377525282967-How-to-enable-Apache-nginx-rewrite-rules-in-Plesk), [nginx-only limitations](https://support.plesk.com/hc/en-us/articles/12377853043351-How-to-switch-a-domain-to-nginx-only-hosting-in-Plesk).

### Windows Plesk with IIS

1. Keep `web.config` in the website root.
2. Verify **IIS URL Rewrite** is installed on the VPS. A missing rewrite module commonly produces HTTP 500.19.
3. Ensure the site's default document is `index.html`.
4. Under MIME types, ensure `.json` is `application/json`, `.ttf` is `font/ttf` and `.woff2` is `font/woff2`. Add only mappings that are missing; duplicate entries can cause a configuration error.
5. Apply the settings and directly refresh `/study` and `/report`.

The IIS file conservatively revalidates assets. Apache uses long caching for hashed build assets. Both configurations prevent caching of the entry page and runtime configuration. If an inherited IIS header duplicates a supplied header, resolve that duplicate in the site's configuration instead of removing all headers.

## 4. Enter the OpenRouter configuration

If `httpdocs/generation-config.json` is already included, upload it with the website files and keep its configured value. You can skip the creation steps below. The manifest's `runtimeConfigured` field records whether the ZIP includes it.

1. If no runtime configuration is included, copy the package's `generation-config.example.json` into the website root.
2. Rename the copy to exactly `generation-config.json`.
3. Edit it in Plesk File Manager and enter your own key in `apiKey`:

```json
{
  "apiKey": "PASTE_YOUR_OPENROUTER_KEY_HERE",
  "model": "nvidia/nemotron-3-super-120b-a12b:free",
  "zeroCost": true,
  "reasoningEffort": "medium",
  "researchEnabled": false,
  "researchBudgetUsd": 0,
  "maxTokens": 12000,
  "timeoutSeconds": 180
}
```

4. Save valid JSON: use double quotes, no comments and no trailing comma.
5. Refresh the app. Changing this file does not require rebuilding Angular or restarting a service.

This key is readable by visitors, as expected for the chosen static design. Packaging uses `public/generation-config.json` when present; otherwise it uses a configured `public/generation-config.example.json`. The copy shipped outside `httpdocs` is always blank. Keep the runtime file when uploading later releases.

The configured model was present in the public OpenRouter catalog on 2026-09-08 with zero prompt/completion prices and the required structured-output/reasoning support. This check is not a successful authenticated generation. The app checks availability again at generation time. See the [model API page](https://openrouter.ai/nvidia/nemotron-3-super-120b-a12b%3Afree/api).

Keep `zeroCost: true`, research off and the budget at zero for this launch test. There is no automatic paid-model fallback. Free endpoints can be busy or rate-limited. Research is a separate optional paid feature and is outside this release's live acceptance evidence.

## 5. Verify hosting, then test the workflow

From your development computer:

```powershell
npm.cmd run check:production -- https://YOUR-DOMAIN
```

Use the domain root without a path or query. This read-only check requests the app entry, `/study`, `/report`, JS/CSS, PDF font and runtime configuration. It checks cache headers, missing-file handling and free-only settings. It never prints your key or starts an OpenRouter generation. Exit code 0 means these hosting checks passed; it does not mean the full product has been accepted.

Then follow `PRODUCTION-TEST.md` with the service and manufacturing backups. In particular:

1. Import the service example from the report page, review all steps, save, and generate the report.
2. Compare the deterministic figures to the expected-results table.
3. Check all 16 narrative sections, refresh/resume behavior, PDF download, backup/import and one successful revision.
4. Repeat with the manufacturing example in a separate browser profile to keep the examples independent.
5. Test your actual supported desktop and mobile browsers.

Do not declare the domain live-tested until generation completes using your configured key and the downloaded PDF opens correctly there. No production domain was supplied during the local release work; the configured key has not been exercised by this review.

## 6. Updating and rollback

For an update, keep the old release and `generation-config.json`. Upload the new hashed assets first and replace `index.html` last. Keep the prior hashed files temporarily so already-open tabs can still lazy-load their matching assets. Remove obsolete files later during a controlled cleanup. Never clear IndexedDB as part of deployment.

For rollback, restore the previous compatible site's entry, assets and hosting files. Retain its matching runtime configuration. This app uses draft schema version 2; a much older v1-only build cannot open v2 drafts. Export input backups/PDFs before rolling back to an incompatible build.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Plesk default page | Correct document root and default document; no nested `httpdocs` directory. |
| `/study` works only after opening `/` | Apache rewrite not applied or IIS URL Rewrite missing. |
| Blank page / module MIME error | Missing hashed file, stale `index.html`, or missing JS being rewritten to HTML. Reupload the matching release. |
| Page looks unstyled | CSS upload/MIME type, old cached entry or additional host CSP conflicting with the supplied policy. |
| HTTP 500.19 | Missing IIS module or duplicate inherited header/MIME configuration. |
| Configuration error | File named incorrectly, empty key, invalid JSON, wrong root or cached configuration. |
| Authentication/rate-limit error | Key validity and provider quota; wait and resume. Do not change to a paid model merely to bypass a free-model limit. |
| Generation stops | Stay on the report page, wait for the visible result, and use resume. Completed stages remain saved. |
| Cannot leave report while generating | Click **إيقاف الإعداد**, wait until it stops, then return to inputs. |
| PDF export fails | `/fonts/Amiri-Regular.ttf`, browser memory/storage, and download permissions. |
| Draft appears missing | Same browser profile, same HTTPS origin, and browser storage has not been cleared. |
| Research is unavailable | Expected: research is disabled in the launch configuration. |

For support retain the release ZIP filename, date, browser version and the visible error category. Avoid copying the runtime key or provider authorization headers into diagnostic notes.
