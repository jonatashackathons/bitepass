const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  for (const item of fs.readdirSync(dir)) {
    if (item === 'node_modules' || item === '.git' || item === '.next') continue;
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) walk(full, files);
    else if (item.endsWith('.md')) files.push(full);
  }
  return files;
}

const mdFiles = walk(process.cwd());
const broken = [];

const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
const srcRegex = /src=["']([^"']+)["']/g;

for (const file of mdFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = mdLinkRegex.exec(content)) !== null) {
    const rawTarget = match[2].trim();
    if (rawTarget.startsWith('http://') || rawTarget.startsWith('https://') || rawTarget.startsWith('#') || rawTarget.startsWith('mailto:')) {
      continue;
    }
    let targetPath = rawTarget;
    if (targetPath.startsWith('file://')) {
      targetPath = targetPath.replace('file://', '');
    }
    const hashIdx = targetPath.indexOf('#');
    if (hashIdx !== -1) targetPath = targetPath.substring(0, hashIdx);

    const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(path.dirname(file), targetPath);
    if (!fs.existsSync(resolved)) {
      broken.push({ file: path.relative(process.cwd(), file), type: 'markdown-link', text: match[1], target: rawTarget, resolved });
    }
  }

  while ((match = srcRegex.exec(content)) !== null) {
    const rawTarget = match[1].trim();
    if (rawTarget.startsWith('http://') || rawTarget.startsWith('https://') || rawTarget.startsWith('data:')) continue;
    const resolved = path.isAbsolute(rawTarget) ? rawTarget : path.resolve(path.dirname(file), rawTarget);
    if (!fs.existsSync(resolved)) {
      broken.push({ file: path.relative(process.cwd(), file), type: 'html-src', target: rawTarget, resolved });
    }
  }
}

console.log('Total markdown files scanned:', mdFiles.length);
console.log('Total broken links or media sources:', broken.length);
if (broken.length > 0) {
  console.log(JSON.stringify(broken, null, 2));
  process.exit(1);
} else {
  console.log('✅ ALL markdown links and media sources resolve cleanly to files on disk!');
}
