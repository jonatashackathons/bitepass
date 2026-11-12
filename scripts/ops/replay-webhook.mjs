#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (key.startsWith('--')) {
      args[key.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const targetUrl =
    args.url || `${process.env.BITEPASS_BASE_URL || 'http://localhost:3000'}/api/v1/webhooks/paypal`;

  let bodyPayload;
  if (args.file) {
    bodyPayload = JSON.parse(readFileSync(args.file, 'utf8'));
  } else {
    const eventType = args.event || 'PAYMENT.AUTHORIZATION.VOIDED';
    const authId = args['auth-id'] || 'AUTH-MOCK-REPLAY';
    bodyPayload = {
      id: args.id || `WH-REPLAY-${randomUUID().slice(0, 12).toUpperCase()}`,
      event_type: eventType,
      resource: {
        id: authId,
        merchant_id: args['merchant-id'] || undefined,
      },
      create_time: new Date().toISOString(),
    };
  }

  const res = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Trace-Id': `ops-replay-${Date.now()}`,
      'x-paypal-mock-signature': args['mock-sig'] || 'VALID_SANDBOX_SIMULATION',
    },
    body: JSON.stringify(bodyPayload),
  });

  const text = await res.text();
  console.log(`[replay-webhook] HTTP ${res.status} -> ${text}`);
  if (!res.ok) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[replay-webhook] Fatal error:', err);
  process.exit(1);
});
