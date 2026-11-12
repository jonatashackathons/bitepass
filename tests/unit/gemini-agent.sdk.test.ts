import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent: mockGenerateContent,
    };
  },
  Type: {
    OBJECT: 'OBJECT',
    BOOLEAN: 'BOOLEAN',
    STRING: 'STRING',
  },
  ThinkingLevel: {
    MEDIUM: 'MEDIUM',
  },
}));

import {
  evaluateAgentContext,
  resetAgentMemoCache,
  sanitizeAgentReason,
} from '@/lib/gemini';
import { kitchenStore } from '@/lib/mock-db';

describe('Gemini 4 Argon SDK Branch, Suppression Fidelity & Allergen Safety', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    kitchenStore.resetOrders();
    resetAgentMemoCache();
    mockGenerateContent.mockReset();
    process.env.GEMINI_API_KEY = 'test-live-gemini-key';
    process.env.BITEPASS_MOCK_MODE = 'false';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    kitchenStore.resetOrders();
    resetAgentMemoCache();
  });

  it('RESPECTS shouldTrigger: false from Gemini instead of overriding back to true', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        shouldTrigger: false,
        reason: 'Walk plus assembly time leaves insufficient buffer before meeting.',
      }),
    });

    const result = await evaluateAgentContext({
      freeMinutes: 31,
      distanceMeters: 480,
      dietary: 'Omnivore',
    });

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(result.shouldTrigger).toBe(false);
    if (!result.shouldTrigger) {
      expect(result.suppressionCode).toBe('MODEL_DECLINED');
    }
  });

  it('FAILS CLOSED when Vegan item is 86d or Sesame allergen is excluded (NEVER falls back to meat panini)', async () => {
    const resultAllergenBlocked = await evaluateAgentContext({
      freeMinutes: 40,
      distanceMeters: 150,
      dietary: 'Vegan',
      excludedAllergens: ['Sesame'], // Quinoa bowl contains tahini (Sesame)
    });

    expect(resultAllergenBlocked.shouldTrigger).toBe(false);
    if (!resultAllergenBlocked.shouldTrigger) {
      expect(resultAllergenBlocked.suppressionCode).toBe(
        'NO_ELIGIBLE_DIETARY_ITEM'
      );
    }
    expect(mockGenerateContent).not.toHaveBeenCalled();

    // Also test when item is 86'd in kitchen
    await kitchenStore.setItemAvailability('prod_quinoa_bowl', false);
    const resultSoldOut = await evaluateAgentContext({
      freeMinutes: 40,
      distanceMeters: 150,
      dietary: 'Vegan',
    });

    expect(resultSoldOut.shouldTrigger).toBe(false);
    expect(resultSoldOut.item).toBeUndefined();
  });

  it('strips phishing URLs, domains, markdown links, and HTML from LLM reason output', () => {
    const dirty =
      'Great bowl! Claim reward at <script>alert(1)</script> [Free Gift](https://evil-phish.io/login) or visit attacker.net now.';
    const clean = sanitizeAgentReason(dirty, 'Safe fallback');

    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('https://');
    expect(clean).not.toContain('evil-phish.io');
    expect(clean).not.toContain('attacker.net');
    expect(clean).toContain('[redacted]');
  });
});

