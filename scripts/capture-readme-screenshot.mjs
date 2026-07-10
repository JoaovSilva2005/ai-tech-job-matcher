import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..');
const require = createRequire(import.meta.url);
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'job-matcher-screenshot-'));
const outputPath = path.join(projectRoot, 'docs', 'assets', 'web-ui.png');

process.env.AI_PROVIDER = 'fallback';
process.env.LEVER_COMPANY_SLUGS = '';

const { createApp } = require(path.join(projectRoot, 'dist', 'web', 'server.js'));
const app = createApp({
  uploadDir: path.join(tempRoot, 'uploads'),
  outputDir: path.join(tempRoot, 'output'),
});

const server = await new Promise((resolve) => {
  const runningServer = app.listen(0, '127.0.0.1', () => resolve(runningServer));
});
const address = server.address();
const browser = await chromium.launch();

try {
  const page = await browser.newPage({
    viewport: { width: 1360, height: 1000 },
    colorScheme: 'light',
  });
  await page.goto(`http://127.0.0.1:${address.port}`);
  await page.setInputFiles('#resumeInput', path.join(projectRoot, 'samples', 'sample-resume.txt'));
  await page.selectOption('#roleSelect', 'qa');
  await page.fill('#locationInput', 'Campinas, SP');
  await page.getByText('Analyze one job', { exact: true }).click();
  await page.fill('#jobTitleInput', 'Junior QA Analyst');
  await page.fill('#jobCompanyInput', 'Public Tech Company');
  await page.fill('#jobUrlInput', 'https://public-tech-company.gupy.io/jobs/123456');
  await page.fill('#jobLocationInput', 'Remote - Brazil');
  await page.selectOption('#jobWorkModeSelect', 'remote');
  await page.fill(
    '#jobDescriptionInput',
    'Junior QA opportunity focused on manual web testing, Playwright automation, API validation, Git, SQL, defect reporting, Scrum, and advanced written English communication.'
  );
  await page.getByRole('button', { name: 'Analyze this job' }).click();
  await page.locator('.card').waitFor();
  await page.locator('#resultsState').scrollIntoViewIfNeeded();

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await page.screenshot({ path: outputPath, fullPage: true });
  process.stdout.write(`README screenshot saved to ${outputPath}\n`);
} finally {
  await browser.close();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
