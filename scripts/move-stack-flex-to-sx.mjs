/**
 * MUI v9: Stack only supports direction, spacing, divider, useFlexGap, sx.
 * Move alignItems / justifyContent / flexWrap (string literals) into sx on the same line.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', 'src');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts|jsx|js)$/.test(name) && !/Old\.(tsx|ts|jsx|js)$/.test(name)) out.push(p);
  }
  return out;
}

function mergeLayoutIntoSx(line) {
  if (!line.includes('<Stack')) return line;

  let s = line;
  const layout = {};
  for (const prop of ['alignItems', 'justifyContent', 'flexWrap']) {
    const re = new RegExp(`\\s${prop}="([^"]*)"`);
    const m = s.match(re);
    if (m) {
      layout[prop] = m[1];
      s = s.replace(new RegExp(`\\s${prop}="[^"]*"`), '');
    }
  }

  const keys = Object.keys(layout);
  if (keys.length === 0) return line;

  const inject = keys.map((k) => `${k}: '${layout[k]}'`).join(', ');

  const sxIdx = s.indexOf('sx={{');
  if (sxIdx !== -1) {
    const insertAt = sxIdx + 'sx={{'.length;
    return `${s.slice(0, insertAt)} ${inject}, ${s.slice(insertAt)}`;
  }

  const gt = s.lastIndexOf('>');
  if (gt === -1) return line;
  return `${s.slice(0, gt).trimEnd()} sx={{ ${inject} }}${s.slice(gt)}`;
}

function processFile(fp) {
  const raw = fs.readFileSync(fp, 'utf8');
  const lines = raw.split('\n');
  const next = lines.map((ln) => mergeLayoutIntoSx(ln));
  const out = next.join('\n');
  if (out !== raw) fs.writeFileSync(fp, out);
}

for (const fp of walk(ROOT)) {
  processFile(fp);
}
console.log('Stack layout props merged into sx where applicable.');
