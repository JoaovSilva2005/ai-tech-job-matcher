import fs from 'fs';
import path from 'path';

const HTML_PATH = path.join(__dirname, 'index.html');

/**
 * Returns the single-page web UI.
 *
 * The page is authored as a standalone `index.html` (designed separately) and
 * served verbatim. Keeping it as a real .html file avoids escaping conflicts
 * with the template literals inside the page's own client-side script.
 *
 * The role/source <option> values in that file are kept in sync with
 * VALID_ROLES / VALID_SOURCES (src/cli/cliTypes.ts); the server also validates
 * every submitted value, so an out-of-sync option can never reach the pipeline.
 */
export function indexHtml(): string {
  return fs.readFileSync(HTML_PATH, 'utf-8');
}
