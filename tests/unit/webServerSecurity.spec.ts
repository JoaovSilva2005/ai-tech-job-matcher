import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Server } from 'http';
import { AddressInfo } from 'net';
import { expect, test } from '@playwright/test';
import { createApp, resolveServerHost, resolveServerPort } from '../../src/web/server';

test.describe('web server security defaults', () => {
  test('uses loopback by default and validates explicit host values', () => {
    expect(resolveServerHost(undefined)).toBe('127.0.0.1');
    expect(resolveServerHost(' 0.0.0.0 ')).toBe('0.0.0.0');
    expect(resolveServerHost('jobs.internal.example')).toBe('jobs.internal.example');
    expect(resolveServerHost('::1')).toBe('::1');

    expect(() => resolveServerHost('http://127.0.0.1')).toThrow(/Invalid HOST/);
    expect(() => resolveServerHost('127.0.0.1/path')).toThrow(/Invalid HOST/);
    expect(() => resolveServerHost('999.999.999.999')).toThrow(/Invalid HOST/);
  });

  test('preserves configurable ports and rejects invalid values', () => {
    expect(resolveServerPort(undefined)).toBe(4180);
    expect(resolveServerPort(' 8080 ')).toBe(8080);
    expect(resolveServerPort(3000)).toBe(3000);

    for (const invalidPort of ['0', '65536', '4180.5', 'not-a-port']) {
      expect(() => resolveServerPort(invalidPort)).toThrow(/Invalid PORT/);
    }
  });

  test('sets defensive headers without disclosing Express', async ({ request }) => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-tech-job-matcher-security-'));
    const app = createApp({
      uploadDir: path.join(tempRoot, 'uploads'),
      outputDir: path.join(tempRoot, 'output'),
    });
    const server = await listen(app);

    try {
      const address = server.address() as AddressInfo;
      const response = await request.get(`http://127.0.0.1:${address.port}/api/health`);
      const headers = response.headers();

      expect(response.ok()).toBe(true);
      expect(headers['x-powered-by']).toBeUndefined();
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['referrer-policy']).toBe('no-referrer');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['permissions-policy']).toBe(
        'camera=(), geolocation=(), microphone=(), payment=(), usb=()'
      );
    } finally {
      await close(server);
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});

async function listen(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise<Server>((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    server.once('error', reject);
  });
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
}
