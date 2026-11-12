const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  for (const item of fs.readdirSync(dir)) {
    if (
      item === 'node_modules' ||
      item === '.git' ||
      item === '.next' ||
      item === 'coverage' ||
      item === 'test-results' ||
      item === 'playwright-report'
    ) {
      continue;
    }
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) walk(full, files);
    else if (item.endsWith('.md')) files.push(full);
  }
  return files;
}

/**
 * Extract Markdown link targets supporting balanced parentheses in filenames
 * e.g. [UX](docs/User Experience (UX) features.md)
 */
function extractMarkdownLinks(rawContent) {
  const stripped = rawContent.replace(/```[\s\S]*?```/g, '');
  const links = [];
  let idx = 0;
  while (idx < stripped.length) {
    const openBracket = stripped.indexOf('[', idx);
    if (openBracket === -1) break;
    const closeBracket = stripped.indexOf('](', openBracket + 1);
    if (closeBracket === -1) break;
    // Ensure no unescaped newline inside [text]
    const text = stripped.slice(openBracket + 1, closeBracket);
    if (text.includes('\n')) {
      idx = openBracket + 1;
      continue;
    }

    let cursor = closeBracket + 2;
    let depth = 1;
    while (cursor < stripped.length && depth > 0) {
      const ch = stripped[cursor];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === '\n') {
        depth = -1;
        break;
      }
      cursor++;
    }

    if (depth === 0) {
      let rawTarget = stripped.slice(closeBracket + 2, cursor - 1).trim();
      // Strip optional title `"title"` or `'title'`
      rawTarget = rawTarget.replace(/\s+(?:"[^"]*"|'[^']*')$/, '').trim();
      links.push({ text, rawTarget });
      idx = cursor;
    } else {
      idx = closeBracket + 2;
    }
  }
  return links;
}

function checkEnvParity(rootDir, errors) {
  const envExamplePath = path.join(rootDir, '.env.example');
  const envTsPath = path.join(rootDir, 'lib', 'env.ts');
  if (!fs.existsSync(envExamplePath) || !fs.existsSync(envTsPath)) return;

  const envExample = fs.readFileSync(envExamplePath, 'utf8');
  const envTs = fs.readFileSync(envTsPath, 'utf8');

  const exampleKeys = new Set();
  for (const m of envExample.matchAll(/^\s*([A-Z][A-Z0-9_]*)=/gm)) {
    exampleKeys.add(m[1]);
  }

  const listMatch = envTs.match(/ENV_SCHEMA_KEYS\s*=\s*\[([\s\S]*?)\]\s*as\s*const/);
  if (!listMatch) return;
  const schemaKeys = new Set();
  for (const m of listMatch[1].matchAll(/'([A-Z][A-Z0-9_]*)'/g)) {
    schemaKeys.add(m[1]);
  }

  for (const k of schemaKeys) {
    if (!exampleKeys.has(k)) {
      errors.push({
        file: '.env.example',
        type: 'missing-env-key',
        target: k,
        detail: `Key '${k}' is declared in lib/env.ts ENV_SCHEMA_KEYS but missing from .env.example`,
      });
    }
  }
  for (const k of exampleKeys) {
    if (!schemaKeys.has(k)) {
      errors.push({
        file: 'lib/env.ts',
        type: 'undocumented-env-key',
        target: k,
        detail: `Key '${k}' is in .env.example but missing from lib/env.ts ENV_SCHEMA_KEYS`,
      });
    }
  }
}

const rootDir = process.cwd();
const mdFiles = walk(rootDir);
const broken = [];
const srcRegex = /src=["']([^"']+)["']/g;

for (const file of mdFiles) {
  const relFile = path.relative(rootDir, file);
  const content = fs.readFileSync(file, 'utf8');

  for (const { text, rawTarget } of extractMarkdownLinks(content)) {
    if (
      !rawTarget ||
      rawTarget.startsWith('http://') ||
      rawTarget.startsWith('https://') ||
      rawTarget.startsWith('#') ||
      rawTarget.startsWith('mailto:') ||
      rawTarget.startsWith('conversation://')
    ) {
      continue;
    }

    // Reject non-portable machine-specific schemes and absolute OS user paths
    if (
      /^file:\/\//i.test(rawTarget) ||
      /^\/(Users|home|var|private|tmp)\//.test(rawTarget) ||
      /^[A-Za-z]:[\\/]/.test(rawTarget)
    ) {
      broken.push({
        file: relFile,
        type: 'non-portable-path',
        text,
        target: rawTarget,
      });
      continue;
    }

    let cleanTarget = rawTarget.split('#')[0].split('?')[0];
    if (!cleanTarget) continue;
    cleanTarget = decodeURIComponent(cleanTarget);

    const resolved = path.isAbsolute(cleanTarget)
      ? path.join(rootDir, cleanTarget)
      : path.resolve(path.dirname(file), cleanTarget);

    if (!fs.existsSync(resolved)) {
      broken.push({
        file: relFile,
        type: 'markdown-link',
        text,
        target: rawTarget,
        resolved,
      });
    }
  }

  const strippedHtml = content.replace(/```[\s\S]*?```/g, '');
  let match;
  while ((match = srcRegex.exec(strippedHtml)) !== null) {
    const rawTarget = match[1].trim();
    if (
      rawTarget.startsWith('http://') ||
      rawTarget.startsWith('https://') ||
      rawTarget.startsWith('data:')
    ) {
      continue;
    }
    if (/^file:\/\//i.test(rawTarget) || /^\/(Users|home|var|private|tmp)\//.test(rawTarget)) {
      broken.push({ file: relFile, type: 'non-portable-src', target: rawTarget });
      continue;
    }
    const cleanSrc = decodeURIComponent(rawTarget.split('#')[0].split('?')[0]);
    const resolved = path.isAbsolute(cleanSrc)
      ? path.join(rootDir, cleanSrc)
      : path.resolve(path.dirname(file), cleanSrc);
    if (!fs.existsSync(resolved)) {
      broken.push({ file: relFile, type: 'html-src', target: rawTarget, resolved });
    }
  }
}

checkEnvParity(rootDir, broken);

console.log('Total markdown files scanned:', mdFiles.length);
console.log('Total broken links, non-portable paths, or env parity issues:', broken.length);
if (broken.length > 0) {
  console.error(JSON.stringify(broken, null, 2));
  process.exit(1);
} else {
  console.log('✅ ALL markdown links, media sources, and .env.example keys verified cleanly!');
}
