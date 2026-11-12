import { NextResponse } from 'next/server';
import { parseJsonBody, toProblemResponse } from '@/lib/errors';
import { evaluateAgentContext } from '@/lib/gemini';
import { logger, resolveTraceId } from '@/lib/logger';
import {
  assertSameOrigin,
  checkRateLimit,
  hasExplicitDinerPrincipal,
  resolveDinerPrincipal,
} from '@/lib/security';
import { AgentEvaluateRequestSchema, validateSchema } from '@/lib/validation';

export async function POST(req: Request) {
  const traceId = resolveTraceId(req);
  try {
    assertSameOrigin(req);
    const principal = resolveDinerPrincipal(req);
    const explicitUser = hasExplicitDinerPrincipal(req);
    const forwardedIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const rateBucketKey = explicitUser ?? forwardedIp ?? principal.userId;

    // PROD-18: Enforce 10 req/min sliding-window rate limit on /api/agent
    checkRateLimit(`agent:${rateBucketKey}`, 10);

    const rawBody = await parseJsonBody(req);
    const input = validateSchema(AgentEvaluateRequestSchema, rawBody);

    const recommendation = await evaluateAgentContext({
      freeMinutes: input.freeMinutes,
      distanceMeters: input.distanceMeters,
      dietary: input.dietary,
      excludedAllergens: input.excludedAllergens,
      contextMode: input.contextMode,
      towerId: input.towerId,
    });

    logger.info('Evaluated proactive culinary context', {
      traceId,
      userId: principal.userId,
      event: 'agent.evaluate',
      triggered: recommendation.shouldTrigger,
    });

    const res = NextResponse.json(recommendation, {
      headers: { 'X-Trace-Id': traceId },
    });
    if (principal.setCookieHeader) {
      res.headers.append('Set-Cookie', principal.setCookieHeader);
    }
    return res;
  } catch (error) {
    return toProblemResponse(error, '/api/agent');
  }
}
