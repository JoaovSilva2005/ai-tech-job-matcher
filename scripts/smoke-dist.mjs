import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createApp } = require('../dist/web/server.js');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-tech-job-matcher-dist-'));
const app = createApp({
  uploadDir: path.join(tempRoot, 'uploads'),
  outputDir: path.join(tempRoot, 'output'),
});

const server = await new Promise((resolve) => {
  const listeningServer = app.listen(0, () => resolve(listeningServer));
});

try {
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Could not resolve smoke-test port.');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const [home, health] = await Promise.all([
    globalThis.fetch(`${baseUrl}/`),
    globalThis.fetch(`${baseUrl}/api/health`),
  ]);

  if (!home.ok || !(await home.text()).includes('AI Tech Job Matcher')) {
    throw new Error(`Compiled web home failed with HTTP ${home.status}.`);
  }
  if (!health.ok || (await health.json()).status !== 'ok') {
    throw new Error(`Compiled health endpoint failed with HTTP ${health.status}.`);
  }

  globalThis.console.log('Compiled web smoke test passed.');
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
