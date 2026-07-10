import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(projectRoot, 'src', 'web', 'index.html');
const destinationDir = path.join(projectRoot, 'dist', 'web');
const destination = path.join(destinationDir, 'index.html');

await mkdir(destinationDir, { recursive: true });
await copyFile(source, destination);
