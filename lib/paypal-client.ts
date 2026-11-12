import { randomUUID } from 'node:crypto';
import { getEnv } from './env';
import { PaymentDeclinedError, PaymentProviderError, UnauthorizedError } from './errors';
import { formatUsdDecimal } from './pricing';
import { OrderPricingSummary } from './types';

export interface PayPalOrderResponse {
  id: string;
  status: string;
  intent: string;
  isMock: boolean;
  authorizationId?: string;
  amount?: string;
  expiresAt?: number;
}

export interface PayPalCaptureResponse {
  id: string;
  status: string;
  isMock: boolean;
  capturedAmount?: string;
}

export interface PayPalVoidResponse {
  status: string;
  isMock: boolean;
}

export interface PayPalRefundResponse {
  id: string;
  status: string;
  refundedAmount: string;
  isMock: boolean;
}

export interface CreateAuthorizationOptions {
  amountCents: number;
  pricing?: OrderPricingSummary;
  merchantName?: string;
  merchantPayeeId?: string;
  vaultId?: string;
  idempotencyKey?: string;
  description?: string;
}

export interface CaptureAuthorizationOptions {
  amountCents: number;
  idempotencyKey?: string;
  isFinalCapture?: boolean;
  noteToPayer?: string;
}

interface TokenCache {
  token: string;
  expiresAtMs: number;
  baseUrl: string;
}

let oauthCache: TokenCache | null = null;

export function resetPayPalTokenCache(): void {
  oauthCache = null;
}

export function isPayPalConfigured(): boolean {
  const env = getEnv();
  return Boolean(!env.isMockPayPal && env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
}

function buildSoftDescriptor(merchantName?: string): string {
  if (!merchantName) return 'BITEPASS*FASTPASS';
  const cleaned = merchantName.toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim();
  return `BITEPASS*${cleaned}`.slice(0, 22);
}

export async function getPayPalAccessToken(): Promise<string | null> {
  const env = getEnv();
  if (env.isMockPayPal) {
    return null;
  }

  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    throw new PaymentProviderError(
      'oauth',
      'Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET while mock mode is disabled.'
    );
  }

  const now = Date.now();
  if (
    oauthCache &&
    oauthCache.baseUrl === env.paypalBaseUrl &&
    oauthCache.expiresAtMs - 30_000 > now
  ) {
    return oauthCache.token;
  }

  const auth = Buffer.from(
    `${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  let res: Response;
  try {
    res = await fetch(`${env.paypalBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      body: 'grant_type=client_credentials',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      signal: AbortSignal.timeout(6000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OAuth network failure';
    throw new PaymentProviderError('oauth', msg);
  }

  if (!res.ok) {
    throw new PaymentProviderError(
      'oauth',
      `PayPal OAuth token request returned HTTP ${res.status}`,
      res.status
    );
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new PaymentProviderError('oauth', 'PayPal OAuth response omitted access_token');
  }

  oauthCache = {
    token: data.access_token,
    expiresAtMs: now + (data.expires_in ?? 3600) * 1000,
    baseUrl: env.paypalBaseUrl,
  };

  return data.access_token;
}

/**
 * Phase 1: Create an Order with intent: "AUTHORIZE" (2-Phase Escrow Hold).
 * Supports PayPal Vault v3 1-tap tokens, Multiparty Commerce Platform split fees,
 * itemized breakdown reconciliation, and PayPal-Request-Id idempotency.
 */
export async function createAuthorizationOrder(
  amountOrOptions: number | CreateAuthorizationOptions,
  description = 'BitePass — Ambient Fast-Track Lunch Order'
): Promise<PayPalOrderResponse> {
  const opts: CreateAuthorizationOptions =
    typeof amountOrOptions === 'number'
      ? {
          amountCents: Math.round(amountOrOptions * 100),
          description,
        }
      : amountOrOptions;

  const formattedAmount = formatUsdDecimal(opts.amountCents);
  const env = getEnv();

  if (env.isMockPayPal) {
    const mockOrderId = `ORD-PP-${Math.floor(100000 + Math.random() * 900000)}`;
    const mockAuthId = `AUTH-PP-${Math.floor(100000 + Math.random() * 900000)}`;
    return {
      id: mockOrderId,
      status: 'CREATED',
      intent: 'AUTHORIZE',
      authorizationId: mockAuthId,
      amount: formattedAmount,
      expiresAt: Date.now() + 3 * 60 * 60 * 1000,
      isMock: true,
    };
  }

  const token = await getPayPalAccessToken();
  if (!token) {
    throw new PaymentProviderError('authorize', 'Unable to acquire PayPal access token');
  }

  const requestId = opts.idempotencyKey ?? `bp-auth-${randomUUID()}`;
  const purchaseUnit: Record<string, unknown> = {
    description: opts.description ?? description,
    soft_descriptor: buildSoftDescriptor(opts.merchantName),
    amount: {
      currency_code: 'USD',
      value: formattedAmount,
      ...(opts.pricing
        ? {
            breakdown: {
              item_total: {
                currency_code: 'USD',
                value: formatUsdDecimal(opts.pricing.subtotalCents),
              },
              tax_total: {
                currency_code: 'USD',
                value: formatUsdDecimal(opts.pricing.taxCents),
              },
              handling: {
                currency_code: 'USD',
                value: formatUsdDecimal(
                  opts.pricing.tipCents + opts.pricing.fastPassFeeCents
                ),
              },
            },
          }
        : {}),
    },
  };

  if (opts.merchantPayeeId && env.PAYPAL_PARTNER_MERCHANT_ID) {
    purchaseUnit.payee = { merchant_id: opts.merchantPayeeId };
    if (opts.pricing && opts.pricing.platformFeeCents > 0) {
      purchaseUnit.payment_instruction = {
        disbursement_mode: 'DELAYED',
        platform_fees: [
          {
            amount: {
              currency_code: 'USD',
              value: formatUsdDecimal(opts.pricing.platformFeeCents),
            },
          },
        ],
      };
    }
  }

  const payload: Record<string, unknown> = {
    intent: 'AUTHORIZE',
    purchase_units: [purchaseUnit],
  };

  if (opts.vaultId) {
    payload.payment_source = {
      paypal: {
        vault_id: opts.vaultId,
      },
    };
  }

  let res: Response;
  try {
    res = await fetch(`${env.paypalBaseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': requestId,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error creating PayPal order';
    throw new PaymentProviderError('authorize', msg);
  }

  const data = (await res.json()) as {
    id?: string;
    status?: string;
    message?: string;
    name?: string;
    purchase_units?: Array<{
      payments?: {
        authorizations?: Array<{ id?: string; status?: string; expiration_time?: string }>;
      };
    }>;
  };

  if (!res.ok || !data.id) {
    if (res.status === 422) {
      throw new PaymentDeclinedError(
        data.message ?? 'PayPal declined escrow authorization.',
        { paypalIssue: data.name }
      );
    }
    throw new PaymentProviderError(
      'authorize',
      data.message ?? `PayPal order creation failed (${res.status})`,
      res.status
    );
  }

  let authorizationId =
    data.purchase_units?.[0]?.payments?.authorizations?.[0]?.id;

  // If the order is APPROVED and does not yet embed an authorization ID, execute /authorize
  if (!authorizationId && data.status === 'APPROVED') {
    const authRes = await fetch(
      `${env.paypalBaseUrl}/v2/checkout/orders/${data.id}/authorize`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `${requestId}:exec`,
        },
        body: '{}',
        signal: AbortSignal.timeout(6000),
      }
    );
    const authData = (await authRes.json()) as {
      message?: string;
      purchase_units?: Array<{
        payments?: { authorizations?: Array<{ id?: string; status?: string }> };
      }>;
    };
    if (!authRes.ok) {
      if (authRes.status === 422) {
        throw new PaymentDeclinedError(
          authData.message ?? 'PayPal authorization execution was declined.'
        );
      }
      throw new PaymentProviderError(
        'authorize',
        authData.message ?? `PayPal /authorize failed (${authRes.status})`,
        authRes.status
      );
    }
    authorizationId =
      authData.purchase_units?.[0]?.payments?.authorizations?.[0]?.id;
  }

  return {
    id: data.id,
    status: data.status ?? 'CREATED',
    intent: 'AUTHORIZE',
    authorizationId,
    amount: formattedAmount,
    expiresAt: Date.now() + 3 * 60 * 60 * 1000,
    isMock: false,
  };
}

/**
 * Phase 2: Capture the Held Authorization upon Doorstep Geofence Arrival (<= 50m)
 * or execute a partial final capture ($5.00 spoilage shield) upon post-fire cancellation.
 */
export async function captureAuthorization(
  authorizationId: string,
  amountOrOptions?: number | CaptureAuthorizationOptions
): Promise<PayPalCaptureResponse> {
  const env = getEnv();
  const opts: CaptureAuthorizationOptions | undefined =
    typeof amountOrOptions === 'number'
      ? { amountCents: Math.round(amountOrOptions * 100), isFinalCapture: true }
      : amountOrOptions;

  const formattedAmount = opts ? formatUsdDecimal(opts.amountCents) : undefined;

  if (env.isMockPayPal) {
    return {
      id: `CAP-PP-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'COMPLETED',
      capturedAmount: formattedAmount ?? '14.50',
      isMock: true,
    };
  }

  if (
    authorizationId.startsWith('AUTH-PP-') ||
    authorizationId.startsWith('ORD-PP-') ||
    authorizationId.startsWith('AUTH-SIM-')
  ) {
    throw new PaymentDeclinedError(
      `Synthetic mock authorization ID '${authorizationId}' cannot be captured when live PayPal mode is active.`
    );
  }

  const token = await getPayPalAccessToken();
  if (!token) {
    throw new PaymentProviderError('capture', 'Unable to acquire PayPal access token');
  }

  const requestId = opts?.idempotencyKey ?? `bp-cap-${authorizationId}`;
  const body: Record<string, unknown> = {
    final_capture: opts?.isFinalCapture ?? true,
  };
  if (formattedAmount) {
    body.amount = {
      currency_code: 'USD',
      value: formattedAmount,
    };
  }
  if (opts?.noteToPayer) {
    body.note_to_payer = opts.noteToPayer;
  }

  let res: Response;
  try {
    res = await fetch(
      `${env.paypalBaseUrl}/v2/payments/authorizations/${encodeURIComponent(
        authorizationId
      )}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': requestId,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(6000),
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error capturing PayPal hold';
    throw new PaymentProviderError('capture', msg);
  }

  const data = (await res.json()) as {
    id?: string;
    status?: string;
    message?: string;
    name?: string;
    amount?: { value?: string };
  };

  if (!res.ok) {
    if (res.status === 422) {
      throw new PaymentDeclinedError(
        data.message ?? 'PayPal capture was declined by issuer.',
        { paypalIssue: data.name }
      );
    }
    throw new PaymentProviderError(
      'capture',
      data.message ?? `PayPal capture failed (${res.status})`,
      res.status
    );
  }

  if (!data.id || (data.status !== 'COMPLETED' && data.status !== 'PENDING')) {
    throw new PaymentDeclinedError(
      `PayPal capture returned non-settled status '${data.status ?? 'UNKNOWN'}'.`
    );
  }

  return {
    id: data.id,
    status: data.status,
    capturedAmount: data.amount?.value ?? formattedAmount,
    isMock: false,
  };
}

/**
 * Phase 1b: Void/Release Pre-Prep Authorization during 90s Grace Hold ($0.00 fee).
 */
export async function voidAuthorization(
  authorizationId: string,
  idempotencyKey?: string
): Promise<PayPalVoidResponse> {
  const env = getEnv();

  if (env.isMockPayPal) {
    return {
      status: 'VOIDED',
      isMock: true,
    };
  }

  if (
    authorizationId.startsWith('AUTH-PP-') ||
    authorizationId.startsWith('AUTH-SIM-')
  ) {
    throw new PaymentDeclinedError(
      `Synthetic mock authorization ID '${authorizationId}' cannot be voided in live mode.`
    );
  }

  const token = await getPayPalAccessToken();
  if (!token) {
    throw new PaymentProviderError('void', 'Unable to acquire PayPal access token');
  }

  let res: Response;
  try {
    res = await fetch(
      `${env.paypalBaseUrl}/v2/payments/authorizations/${encodeURIComponent(
        authorizationId
      )}/void`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': idempotencyKey ?? `bp-void-${authorizationId}`,
        },
        signal: AbortSignal.timeout(6000),
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error voiding PayPal hold';
    throw new PaymentProviderError('void', msg);
  }

  if (res.status === 204 || res.ok) {
    return { status: 'VOIDED', isMock: false };
  }

  let message = `PayPal void failed (${res.status})`;
  try {
    const data = (await res.json()) as { message?: string };
    if (data.message) message = data.message;
  } catch {
    // Ignore non-JSON error body
  }

  throw new PaymentProviderError('void', message, res.status);
}

/**
 * Instant Self-Serve Cubby Dispute Refund (`POST /v2/payments/captures/{id}/refund`).
 */
export async function refundCapture(
  captureId: string,
  amountCents: number,
  reasonNote: string,
  idempotencyKey?: string
): Promise<PayPalRefundResponse> {
  const env = getEnv();
  const formattedAmount = formatUsdDecimal(amountCents);

  if (env.isMockPayPal) {
    return {
      id: `REF-PP-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'COMPLETED',
      refundedAmount: formattedAmount,
      isMock: true,
    };
  }

  const token = await getPayPalAccessToken();
  if (!token) {
    throw new PaymentProviderError('refund', 'Unable to acquire PayPal access token');
  }

  let res: Response;
  try {
    res = await fetch(
      `${env.paypalBaseUrl}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': idempotencyKey ?? `bp-ref-${captureId}`,
        },
        body: JSON.stringify({
          amount: {
            currency_code: 'USD',
            value: formattedAmount,
          },
          note_to_payer: reasonNote.slice(0, 120),
        }),
        signal: AbortSignal.timeout(6000),
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error issuing PayPal refund';
    throw new PaymentProviderError('refund', msg);
  }

  const data = (await res.json()) as {
    id?: string;
    status?: string;
    message?: string;
    amount?: { value?: string };
  };

  if (!res.ok || !data.id) {
    throw new PaymentProviderError(
      'refund',
      data.message ?? `PayPal refund failed (${res.status})`,
      res.status
    );
  }

  return {
    id: data.id,
    status: data.status ?? 'COMPLETED',
    refundedAmount: data.amount?.value ?? formattedAmount,
    isMock: false,
  };
}

/**
 * Cryptographic PayPal Webhook Signature Verification (`POST /v1/notifications/verify-webhook-signature`).
 * Never trusts unsigned webhook events.
 */
export async function verifyPayPalWebhookSignature(
  headers: Headers,
  webhookEvent: Record<string, unknown>
): Promise<boolean> {
  const env = getEnv();

  if (env.isMockPayPal) {
    const mockSig = headers.get('x-paypal-mock-signature');
    return mockSig === 'VALID_SANDBOX_SIMULATION';
  }

  const authAlgo = headers.get('paypal-auth-algo');
  const certUrl = headers.get('paypal-cert-url');
  const transmissionId = headers.get('paypal-transmission-id');
  const transmissionSig = headers.get('paypal-transmission-sig');
  const transmissionTime = headers.get('paypal-transmission-time');

  if (
    !authAlgo ||
    !certUrl ||
    !transmissionId ||
    !transmissionSig ||
    !transmissionTime ||
    !env.PAYPAL_WEBHOOK_ID
  ) {
    throw new UnauthorizedError('Missing required PayPal webhook cryptographic signature headers.');
  }

  const token = await getPayPalAccessToken();
  if (!token) {
    throw new PaymentProviderError('webhook', 'Unable to acquire PayPal access token');
  }

  let res: Response;
  try {
    res = await fetch(`${env.paypalBaseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: env.PAYPAL_WEBHOOK_ID,
        webhook_event: webhookEvent,
      }),
      signal: AbortSignal.timeout(6000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook signature verification request failed';
    throw new PaymentProviderError('webhook', msg);
  }

  if (!res.ok) {
    return false;
  }

  const data = (await res.json()) as { verification_status?: string };
  return data.verification_status === 'SUCCESS';
}
