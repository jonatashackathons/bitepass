import fs from 'node:fs';
import path from 'node:path';
import { buildOpenApiV1Spec } from '../lib/openapi-spec.ts';

const outDir = path.join(process.cwd(), 'openapi');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'openapi.v1.json');
const spec = buildOpenApiV1Spec();
fs.writeFileSync(outFile, JSON.stringify(spec, null, 2) + '\n', 'utf8');
console.log(`✅ Generated OpenAPI 3.1.0 specification at ${path.relative(process.cwd(), outFile)} (${Object.keys(spec.paths).length} paths)`);

