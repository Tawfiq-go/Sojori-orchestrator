import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');

const exts = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.css'];
const importRe = /(?:import\s+(?:[^'"]+\s+from\s+)?|export\s+[^'"]+\s+from\s+|import\s*\()\['"]([^'"]+)['"]/g;

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.') && !spec.startsWith('/')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [
  ...exts.map((e) => base + e),
  ...exts.map((e) => path.join(base, 'index' + e)),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return null;
  }
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return null;
  return spec;
}

const files = walk(srcDir);
const missing = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = importRe.exec(text)) !== null) {
    const spec = m[1];
    const miss = resolveImport(file, spec);
    if (miss) {
      missing.push({ file: path.relative(root, file), import: miss });
    }
  }
}

if (!missing.length) {
  console.log('No missing relative imports found.');
} else {
  console.log(`Missing imports (${missing.length}):`);
  for (const row of missing) {
    console.log(`  ${row.file} -> ${row.import}`);
  }
  process.exitCode = 1;
}
