import { describe, it, expect } from 'vitest';
import {
  createAuthorizationOrder,
  captureAuthorization,
  voidAuthorization,
} from '@/lib/paypal-client';

describe('2-Phase PayPal Agentic Escrow Engine (US-02, US-03, US-08)', () => {
  it('Phase 1: creates an escrow authorization order with intent AUTHORIZE', async () => {
    const res = await createAuthorizationOrder(14.50);

    expect(res.id).toBeDefined();
    expect(res.intent).toBe('AUTHORIZE');
    expect(res.status).toBe('CREATED');
    expect(res.amount).toBe('14.50');
  });

  it('Phase 2: executes doorstep proximity capture when customer arrives', async () => {
    const authRes = await createAuthorizationOrder(14.50);
    const captureRes = await captureAuthorization(authRes.id, 14.50);

    expect(captureRes.id).toBeDefined();
    expect(captureRes.status).toBe('COMPLETED');
    expect(captureRes.capturedAmount).toBe('14.50');
  });

  it('US-08: voids pre-prep authorization if customer cancels order', async () => {
    const authRes = await createAuthorizationOrder(14.50);
    const voidRes = await voidAuthorization(authRes.id);

    expect(voidRes.status).toBe('VOIDED');
  });
});
