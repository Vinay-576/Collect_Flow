import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publishDir = resolve(root, 'netlify-dist');
const apiValue = process.env.COLLECTFLOW_API_URL?.trim();
let apiOrigin = null;

if (apiValue) {
  try {
    const parsed = new URL(apiValue);
    if (parsed.protocol !== 'https:' || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error();
    apiOrigin = parsed.origin;
  } catch {
    throw new Error('COLLECTFLOW_API_URL must be an HTTPS origin only, for example https://collectflow-api.example.com.');
  }
}

await rm(publishDir, { recursive: true, force: true });
await mkdir(resolve(publishDir, 'dashboard'), { recursive: true });
await cp(resolve(root, 'login_register/dist'), publishDir, { recursive: true });
await cp(resolve(root, 'dashboard/dist'), resolve(publishDir, 'dashboard'), { recursive: true });

if (!apiOrigin) {
  await writeFile(
    resolve(publishDir, 'api-not-configured.json'),
    JSON.stringify({ detail: 'CollectFlow API is not connected. Set COLLECTFLOW_API_URL in Netlify to the HTTPS origin of the hosted FastAPI service, then redeploy.' }),
    'utf8',
  );
}

const redirects = [
  apiOrigin
    ? `/api/*  ${apiOrigin}/api/:splat  200`
    : '/api/*  /api-not-configured.json  404',
  '/dashboard  /dashboard/index.html  200',
  '/dashboard/*  /dashboard/index.html  200',
  '/*  /index.html  200',
].join('\n') + '\n';

await writeFile(resolve(publishDir, '_redirects'), redirects, 'utf8');
console.log(apiOrigin
  ? `Prepared Netlify site files with API proxy to ${apiOrigin}.`
  : 'Prepared Netlify site files without an API connection. Add COLLECTFLOW_API_URL to enable login and live data.');
