import { getKitchenRepository } from '@/lib/mock-db';
import { realtimeBus } from '@/lib/realtime';
import { assertMerchantOrDemoAccess } from '@/lib/security';
import { toProblemResponse } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    assertMerchantOrDemoAccess(req);
    const repo = getKitchenRepository();
    const initialOrders = await repo.listOrders();
    const initialCapacity = await repo.getBayCapacity();

    const encoder = new TextEncoder();
    let cleanup: (() => void) | null = null;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        send('snapshot', {
          orders: initialOrders,
          bayCapacity: initialCapacity,
          timestamp: Date.now(),
        });

        const unsubscribe = realtimeBus.subscribe((evt) => {
          send('update', evt);
        });

        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          } catch {
            // Stream closed
          }
        }, 15_000);

        cleanup = () => {
          clearInterval(heartbeat);
          unsubscribe();
        };

        req.signal.addEventListener('abort', () => {
          if (cleanup) cleanup();
          try {
            controller.close();
          } catch {
            // Already closed
          }
        });
      },
      cancel() {
        if (cleanup) cleanup();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return toProblemResponse(error, '/api/events');
  }
}

