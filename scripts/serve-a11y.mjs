// Local-only accessibility harness. It is never part of the application build.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist/feasibility/browser');
const scanner = `
const button = document.createElement('button');
button.id = 'qa-scan'; button.textContent = 'Run accessibility check';
button.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:1000;background:#fff;color:#111;border:1px solid #333;padding:8px;font:12px sans-serif';
const output = document.createElement('pre'); output.id = 'qa-result';
output.style.cssText = 'direction:ltr;text-align:left;white-space:pre-wrap;background:white;color:black;font:12px monospace';
document.body.append(button, output);
button.addEventListener('click', async () => {
 button.disabled = true; output.textContent = 'Scanning';
 try {
  const result = await axe.run(document.querySelector('app-root'));
  const overflow = document.documentElement.scrollWidth > window.innerWidth;
  output.textContent = JSON.stringify({width:innerWidth,overflow,violations:result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:result.incomplete.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),externalResources:performance.getEntriesByType("resource").filter(r=>!r.name.startsWith(location.origin)).map(r=>r.name),timing:performance.getEntriesByType("navigation").map(n=>({domContentLoaded:n.domContentLoadedEventEnd,load:n.loadEventEnd}))},null,2);
 } catch(error) { output.textContent = String(error); }
 finally { button.disabled = false; }
});`;
const mime = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1:4201');
    if (url.pathname === '/__qa/axe.js') {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(await readFile('node_modules/axe-core/axe.min.js'));
      return;
    }
    if (url.pathname === '/__qa/scan.js') {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(scanner);
      return;
    }
    let path = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (path !== root && !path.startsWith(root + sep)) {
      response.writeHead(403);
      response.end();
      return;
    }
    if (!extname(path)) path = resolve(root, 'index.html');
    let content = await readFile(path);
    if (extname(path) === '.html')
      content = Buffer.from(
        content
          .toString()
          .replace(
            '</body>',
            '<script defer src="/__qa/axe.js"></script><script defer src="/__qa/scan.js"></script></body>',
          ),
      );
    response.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream');
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
}).listen(4201, '127.0.0.1', () =>
  console.log('Accessibility harness: http://127.0.0.1:4201/study'),
);
