#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const errors = [];

const SUPPORTED_MERMAID_TYPES = [
  'flowchart',
  'graph',
  'sequenceDiagram',
  'stateDiagram-v2',
  'stateDiagram',
  'classDiagram',
  'erDiagram',
  'xychart-beta',
];

function walkMd(dir, acc = []) {
  for (const entry of fs.readdirSync(dir)) {
    if (
      entry === 'node_modules' ||
      entry === '.git' ||
      entry === '.next' ||
      entry === 'coverage' ||
      entry === 'test-results' ||
      entry === 'playwright-report'
    ) {
      continue;
    }
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      walkMd(full, acc);
    } else if (entry.endsWith('.md')) {
      acc.push(full);
    }
  }
  return acc;
}

// 1. Governance & Runbook presence check
const requiredFiles = [
  'SECURITY.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'openapi/openapi.v1.json',
  'docs/runbooks/RB-01-orphaned-paypal-holds.md',
  'docs/runbooks/RB-02-paypal-webhook-dlq-replay.md',
  'docs/runbooks/RB-03-kds-cubby-manual-override.md',
];

for (const rel of requiredFiles) {
  if (!fs.existsSync(path.join(rootDir, rel))) {
    errors.push(`Missing required production governance/runbook file: ${rel}`);
  }
}

// 2. Mermaid diagram syntax & legacy '1-Tap Bypass' drift check across all Markdown files
for (const mdFile of walkMd(rootDir)) {
  const rel = path.relative(rootDir, mdFile);
  const content = fs.readFileSync(mdFile, 'utf8');

  if (/1-Tap Bypass|Bypass orders/i.test(content)) {
    errors.push(`Legacy 'Bypass' branding drift detected in ${rel}`);
  }

  const mermaidBlocks = content.matchAll(/```mermaid\s+([\s\S]*?)```/g);
  for (const match of mermaidBlocks) {
    const firstLine = match[1]
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !l.startsWith('%%'));
    if (!firstLine) continue;
    const isSupported = SUPPORTED_MERMAID_TYPES.some(
      (t) => firstLine === t || firstLine.startsWith(`${t} `)
    );
    if (!isSupported) {
      errors.push(
        `Unsupported Mermaid diagram header '${firstLine}' in ${rel}. Allowed: ${SUPPORTED_MERMAID_TYPES.join(', ')}`
      );
    }
  }
}

// 3. OpenAPI 3.1 route parity check against app/api/v1/**/route.ts
const openApiPath = path.join(rootDir, 'openapi', 'openapi.v1.json');
if (fs.existsSync(openApiPath)) {
  const spec = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));
  if (spec.openapi !== '3.1.0') {
    errors.push(`Expected openapi version 3.1.0, found '${spec.openapi}'`);
  }
  for (const apiPath of Object.keys(spec.paths ?? {})) {
    // Convert /api/v1/orders/{orderId} -> app/api/v1/orders/[orderId]/route.ts
    const fsSegments = apiPath
      .replace(/^\//, '')
      .split('/')
      .map((seg) => (seg.startsWith('{') && seg.endsWith('}') ? `[${seg.slice(1, -1)}]` : seg));
    const routeFile = path.join(rootDir, 'app', ...fsSegments, 'route.ts');
    if (!fs.existsSync(routeFile)) {
      errors.push(`OpenAPI path '${apiPath}' has no matching route handler at ${path.relative(rootDir, routeFile)}`);
    }
  }
}

if (errors.length > 0) {
  console.error('❌ Documentation & OpenAPI drift check failed:');
  for (const e of errors) {
    console.error(`  - ${e}`);
  }
  process.exit(1);
}

console.log('✅ Documentation, Mermaid diagrams, runbooks, and OpenAPI 3.1 route parity verified cleanly!');

