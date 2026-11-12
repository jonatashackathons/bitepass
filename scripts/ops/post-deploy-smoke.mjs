#!/usr/bin/env node

const baseUrl = (process.env.BITEPASS_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

async function assertEndpoint(path, expectedStatus = 200, validateJson) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, { headers: { Accept: 'application/json, text/html' } });
  if (res.status !== expectedStatus) {
    throw new Error(`Smoke check failed for ${url}: expected ${expectedStatus}, got ${res.status}`);
  }
  if (validateJson) {
    const data = await res.json();
    validateJson(data);
  }
  console.log(`✅ [smoke] ${path} -> ${res.status}`);
}

async function main() {
  console.log(`Running BitePass post-deploy smoke suite against ${baseUrl}...`);

  await assertEndpoint('/api/v1/health', 200, (data) => {
    if (data.status !== 'ok' || data.db !== 'up') {
      throw new Error(`Unhealthy readiness payload: ${JSON.stringify(data)}`);
    }
  });

  await assertEndpoint('/api/v1/openapi', 200, (spec) => {
    if (spec.openapi !== '3.1.0') {
      throw new Error(`Unexpected OpenAPI version: ${spec.openapi}`);
    }
  });

  await assertEndpoint('/', 200);
  await assertEndpoint('/legal/terms', 200);
  await assertEndpoint('/legal/privacy', 200);
  await assertEndpoint('/manifest.webmanifest', 200);

  console.log('✅ All post-deploy smoke checks passed.');
}

main().catch((err) => {
  console.error('❌ Post-deploy smoke suite failed:', err.message);
  process.exit(1);
});

