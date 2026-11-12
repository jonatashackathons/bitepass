import { NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';
import { resolveTraceId } from '@/lib/logger';
import { getKitchenRepository } from '@/lib/mock-db';
import { getTelemetrySummary } from '@/lib/telemetry';

export const dynamic = 'force-dynamic';

export function GET(): Promise<NextResponse>;
export function GET(req: Request): Promise<NextResponse>;
export async function GET(req?: Request): Promise<NextResponse> {
  const startMs = performance.now();
  const traceId = resolveTraceId(req);
  const env = getEnv();
  const repo = getKitchenRepository();

  try {
    const bayCapacity = await repo.getBayCapacity();
    const latencyMs = Number((performance.now() - startMs).toFixed(2));

    return NextResponse.json(
      {
        status: 'ok',
        db: 'up',
        service: 'bitepass-web',
        appEnv: env.APP_ENV,
        storageDriver: env.storageDriver,
        paypalEnv: env.PAYPAL_ENV,
        mockPayPal: env.isMockPayPal,
        mockGemini: env.isMockGemini,
        mockFallbackEnabled: env.isMockPayPal || env.isMockGemini,
        latencyMs,
        traceId,
        bayCapacity,
        telemetry: getTelemetrySummary(),
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          'X-Trace-Id': traceId,
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'degraded',
        db: 'down',
        service: 'bitepass-web',
        mockFallbackEnabled: false,
        detail: error instanceof Error ? error.message : 'Database health check failed',
        traceId,
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          'X-Trace-Id': traceId,
        },
      }
    );
  }
}
