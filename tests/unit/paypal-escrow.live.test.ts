import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseRuntimeEnv } from '@/lib/env';
import { PaymentDeclinedError, PaymentProviderError } from '@/lib/errors';
import {
  captureAuthorization,
  createAuthorizationOrder,
  refundCapture,
  resetPayPalTokenCache,
  verifyPayPalWebhookSignature,
} from '@/lib/paypal-client';
import { calculateOrderPricingCents } from '@/lib/pricing';

describe('PayPal Live/Sandbox REST Adapter & Startup Secret Guards', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetPayPalTokenCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetPayPalTokenCache();
    vi.restoreAllMocks();
  });

  it('forbids BITEPASS_MOCK_MODE=true in production or live PayPal mode, while allowing secretless next build phase', () => {
    expect(() =>
      parseRuntimeEnv({
        NODE_ENV: 'production',
        APP_ENV: 'production',
        BITEPASS_MOCK_MODE: 'true',
      })
    ).toThrow(/strictly forbidden/);

    expect(() =>
      parseRuntimeEnv({
        NODE_ENV: 'development',
        PAYPAL_ENV: 'live',
        BITEPASS_MOCK_MODE: 'true',
      })
    ).toThrow(/strictly forbidden/);

    // Secretless CI `next build` phase succeeds cleanly without runtime secrets
    const buildEnv = parseRuntimeEnv({
      NODE_ENV: 'production',
      NEXT_PHASE: 'phase-production-build',
      APP_ENV: 'production',
    });
    expect(buildEnv.isProductionTier).toBe(true);
  });

  it('executes live OAuth + Orders v2 AUTHORIZE with Vault v3, Multiparty split fees, and BITEPASS soft descriptor', async () => {
    process.env.PAYPAL_CLIENT_ID = 'live_test_client_id';
    process.env.PAYPAL_CLIENT_SECRET = 'live_test_client_secret';
    process.env.PAYPAL_PARTNER_MERCHANT_ID = 'PARTNER_BITEPASS_HQ';
    process.env.BITEPASS_MOCK_MODE = 'false';

    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'tok_live_123', expires_in: 3600 }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: '5O190127TN364715T',
            status: 'COMPLETED',
            purchase_units: [
              {
                payments: {
                  authorizations: [{ id: '0VF52814937998046', status: 'CREATED' }],
                },
              },
            ],
          }),
          { status: 201 }
        )
      );

    const pricing = calculateOrderPricingCents({
      basePriceCents: 1250,
      fixedTaxCents: 100,
      tipSelection: { mode: 'fixed_cents', amountCents: 100 },
    });

    const res = await createAuthorizationOrder({
      amountCents: pricing.totalCents,
      pricing,
      merchantName: "Jack's Cafe",
      merchantPayeeId: 'PP-MERCH-JACKS-01',
      vaultId: 'vlt_customer_991',
      idempotencyKey: 'idem-order-001',
    });

    expect(res.isMock).toBe(false);
    expect(res.id).toBe('5O190127TN364715T');
    expect(res.authorizationId).toBe('0VF52814937998046');

    const orderCall = fetchSpy.mock.calls[1];
    expect(orderCall).toBeDefined();
    const reqInit = orderCall?.[1];
    const body = JSON.parse(String(reqInit?.body));
    expect(body.intent).toBe('AUTHORIZE');
    expect(body.payment_source.paypal.vault_id).toBe('vlt_customer_991');
    expect(body.purchase_units[0].soft_descriptor).toBe('BITEPASS*JACKS CAFE');
    expect(body.purchase_units[0].payee.merchant_id).toBe('PP-MERCH-JACKS-01');
    expect(
      body.purchase_units[0].payment_instruction.platform_fees[0].amount.value
    ).toBe('1.00');
  });

  it('FAILS CLOSED on live HTTP 422 capture decline instead of silently faking COMPLETED', async () => {
    process.env.PAYPAL_CLIENT_ID = 'live_test_client_id';
    process.env.PAYPAL_CLIENT_SECRET = 'live_test_client_secret';
    process.env.BITEPASS_MOCK_MODE = 'false';

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'tok_live_123', expires_in: 3600 }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            name: 'UNPROCESSABLE_ENTITY',
            message: 'INSTRUMENT_DECLINED',
          }),
          { status: 422 }
        )
      );

    await expect(
      captureAuthorization('0VF52814937998046', { amountCents: 1450 })
    ).rejects.toThrow(PaymentDeclinedError);
  });

  it('FAILS CLOSED on OAuth 401 credential failure when mock mode is disabled', async () => {
    process.env.PAYPAL_CLIENT_ID = 'bad_client';
    process.env.PAYPAL_CLIENT_SECRET = 'bad_secret';
    process.env.BITEPASS_MOCK_MODE = 'false';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'invalid_client' }), { status: 401 })
    );

    await expect(createAuthorizationOrder(14.5)).rejects.toThrow(
      PaymentProviderError
    );
  });

  it('executes live refundCapture and cryptographic webhook verification', async () => {
    process.env.PAYPAL_CLIENT_ID = 'live_test_client_id';
    process.env.PAYPAL_CLIENT_SECRET = 'live_test_client_secret';
    process.env.PAYPAL_WEBHOOK_ID = 'WH-LIVE-001';
    process.env.BITEPASS_MOCK_MODE = 'false';

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'tok_live_123', expires_in: 3600 }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'REF-LIVE-999',
            status: 'COMPLETED',
            amount: { value: '14.50' },
          }),
          { status: 201 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ verification_status: 'FAILURE' }), {
          status: 200,
        })
      );

    const ref = await refundCapture('CAP-LIVE-111', 1450, 'Empty cubby');
    expect(ref.isMock).toBe(false);
    expect(ref.id).toBe('REF-LIVE-999');

    const headers = new Headers({
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.paypal.com/cert.pem',
      'paypal-transmission-id': 'tx-1',
      'paypal-transmission-sig': 'forged-sig',
      'paypal-transmission-time': new Date().toISOString(),
    });
    const verified = await verifyPayPalWebhookSignature(headers, {
      id: 'WH-EVT-1',
    });
    expect(verified).toBe(false);
  });
});

