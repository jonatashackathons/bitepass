import { describe, it, expect } from 'vitest';
import { evaluateAgentContext } from '@/lib/gemini';

describe('Gemini 4 Argon Agent Reasoning & Guardrails (US-01)', () => {
  it('triggers recommendation when gap >= 30 mins and distance <= 500m', async () => {
    const res = await evaluateAgentContext({
      freeMinutes: 35,
      distanceMeters: 200,
      dietary: 'Omnivore',
    });

    expect(res.shouldTrigger).toBe(true);
    expect(res.item).toBeDefined();
    expect(res.reason).toBeDefined();
    expect(res.total).toBe(14.50);
    expect(res.timeSavedMinutes).toBeGreaterThanOrEqual(12);
  });

  it('respects Quiet Hours guardrail when calendar gap is < 30 mins', async () => {
    const res = await evaluateAgentContext({
      freeMinutes: 20,
      distanceMeters: 150,
      dietary: 'Omnivore',
    });

    expect(res.shouldTrigger).toBe(false);
    expect(res.reason).toContain('30-minute quiet threshold');
    expect(res.item).toBeUndefined();
  });

  it('respects Proximity perimeter guardrail when distance exceeds 500m', async () => {
    const res = await evaluateAgentContext({
      freeMinutes: 45,
      distanceMeters: 650,
      dietary: 'Omnivore',
    });

    expect(res.shouldTrigger).toBe(false);
    expect(res.reason).toContain('exceeds 500m proximity perimeter');
  });

  it('re-reasons and matches Vegan meal when dietary preference is Vegan', async () => {
    const res = await evaluateAgentContext({
      freeMinutes: 40,
      distanceMeters: 250,
      dietary: 'Vegan',
    });

    expect(res.shouldTrigger).toBe(true);
    expect(res.item?.dietaryTags).toContain('Vegan');
    expect(res.item?.merchantName).toBe('Green & Grains');
  });

  it('re-reasons and matches Gluten-Free meal when dietary preference is Gluten-Free', async () => {
    const res = await evaluateAgentContext({
      freeMinutes: 35,
      distanceMeters: 100,
      dietary: 'Gluten-Free',
    });

    expect(res.shouldTrigger).toBe(true);
    expect(res.item?.dietaryTags).toContain('Gluten-Free');
  });
});
