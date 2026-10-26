import { NextResponse } from 'next/server';
import { evaluateAgentContext } from '@/lib/gemini';
import { DietaryPreference } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const freeMinutes = Number(body.freeMinutes ?? 35);
    const distanceMeters = Number(body.distanceMeters ?? 200);
    const dietary = (body.dietary ?? 'Omnivore') as DietaryPreference;

    const recommendation = await evaluateAgentContext({
      freeMinutes,
      distanceMeters,
      dietary,
    });

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error('Agent route error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate agent context' },
      { status: 500 }
    );
  }
}
