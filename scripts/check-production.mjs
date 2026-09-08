// Read-only hosting smoke check. Never prints configuration bodies or sends generation requests.
const target = process.argv[2];
if (!target) throw new Error('Usage: npm run check:production -- https://your-domain.example');
const origin = new URL(target);
if (
  !['http:', 'https:'].includes(origin.protocol) ||
  origin.pathname !== '/' ||
  origin.search ||
  origin.hash ||
  origin.username ||
  origin.password
)
  throw new Error('Supply a domain root URL without credentials, query or path');
let failures = 0;
function check(ok, label) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failures++;
}
const get = (path) =>
  fetch(new URL(path, origin), { signal: AbortSignal.timeout(30000), cache: 'no-store' });
try {
  check(
    origin.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(origin.hostname),
    'HTTPS (localhost exempt)',
  );
  const root = await get('/');
  const html = await root.text();
  check(root.ok && html.includes('<app-root'), 'Application entry');
  check(
    /no-store|no-cache|max-age=0/.test(root.headers.get('cache-control') ?? ''),
    'Entry revalidates',
  );
  check(!/\son\w+\s*=/i.test(html), 'No CSP-blocked inline event handlers');
  check(!!root.headers.get('content-security-policy'), 'Deployment CSP is present');
  for (const path of ['/study', '/report']) {
    const response = await get(path);
    const body = await response.text();
    check(response.ok && body.includes('<app-root'), `Direct navigation ${path}`);
  }
  const assets = [...html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))"/g)].map((m) => m[1]);
  check(assets.length >= 2, 'JavaScript and stylesheet references found');
  for (const path of assets) {
    const response = await get(path);
    check(
      response.ok && /javascript|text\/css/.test(response.headers.get('content-type') ?? ''),
      `Asset ${path}`,
    );
  }
  const font = await get('/fonts/Amiri-Regular.ttf');
  check(font.ok && /font|octet-stream/.test(font.headers.get('content-type') ?? ''), 'PDF font');
  const missing = await get('/__release_missing_asset__.js');
  check(missing.status === 404, 'Missing assets return 404');
  const configResponse = await get('/generation-config.json');
  check(
    configResponse.ok && /json/.test(configResponse.headers.get('content-type') ?? ''),
    'Runtime configuration is JSON',
  );
  check(
    /no-store/.test(configResponse.headers.get('cache-control') ?? ''),
    'Runtime configuration is not cached',
  );
  if (configResponse.ok) {
    let config;
    try {
      config = await configResponse.json();
    } catch {
      /* Report below, never print the body. */
    }
    check(
      typeof config?.apiKey === 'string' && !!config.apiKey.trim(),
      'Runtime key has been configured',
    );
    check(typeof config?.model === 'string' && !!config.model, 'Runtime model has been configured');
    check(
      config?.zeroCost === true &&
        config?.researchEnabled === false &&
        config?.researchBudgetUsd === 0,
      'Free-only launch settings; research disabled',
    );
  }
} catch {
  check(false, 'Network/TLS request failed; check the domain and hosting configuration');
}
console.log(`${failures} failed checks. This does not test live generation or PDF downloads.`);
process.exitCode = failures ? 1 : 0;
