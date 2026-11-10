// Guards the npm package contents: every relative import among published files must
// resolve to another published file. Catches "added a module, forgot to add it to
// package.json files" — the bug that shipped 0.9.1 without quotes.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const files = pkg.files;

function inSet(f) {
  return files.some((x) => {
    if (x === f) return true;
    if (x.endsWith('/')) return f.startsWith(x);
    const abs = path.join(root, x);
    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) return f.startsWith(x + '/');
    if (x.includes('*')) {
      const re = new RegExp('^' + x.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
      return re.test(f);
    }
    return false;
  });
}

test('every relative import in published files resolves to a published file', () => {
  const seen = new Set();
  const gaps = [];
  const queue = files.filter((f) => /\.(mjs|js|cjs)$/.test(f));

  while (queue.length) {
    const f = queue.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    const abs = path.join(root, f);
    if (!fs.existsSync(abs)) {
      gaps.push('missing on disk: ' + f);
      continue;
    }
    const src = fs.readFileSync(abs, 'utf8');
    const re = /(?:import|export)[^'"]*?from\s*['"](\.?\.?\/[^'"]+)['"]|import\s*\(\s*['"](\.?\.?\/[^'"]+)['"]\s*\)|import\s*['"](\.?\.?\/[^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src))) {
      const raw = m[1] || m[2] || m[3];
      if (!raw) continue;
      let t = path.normalize(path.join(path.dirname(f), raw)).replace(/\\/g, '/');
      if (t.startsWith('./')) t = t.slice(2);
      if (!/\.(mjs|cjs|js|json|svg)$/.test(t)) t += '.mjs';
      if (!inSet(t)) {
        gaps.push(f + ' -> ' + t);
      } else if (/\.(mjs|cjs|js)$/.test(t)) {
        queue.push(t);
      }
    }
  }

  assert.deepEqual(gaps, [], 'files referenced but not published:\n' + gaps.join('\n'));
});

test('every entry in package.json files exists on disk', () => {
  const missing = files.filter((f) => !fs.existsSync(path.join(root, f)));
  assert.deepEqual(missing, []);
});

// client.js never gets imported by any test — it is a browser module the host bundles.
// A stray paren there ships as "import failed" with no failing test, so parse it here.
test('client.js parses as a module', async () => {
  const { execFileSync } = await import('node:child_process');
  const src = path.join(root, 'client.js');
  const copy = path.join(fs.mkdtempSync(path.join((await import('node:os')).tmpdir(), 'wealth-check-')), 'client.mjs');
  fs.copyFileSync(src, copy);
  execFileSync(process.execPath, ['--check', copy], { stdio: 'pipe' });
});
