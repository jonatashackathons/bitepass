import { BayCapacity, OrderTicket } from './types';

export interface RealtimeOrderEvent {
  type: 'ORDER_CREATED' | 'ORDER_UPDATED' | 'CAPACITY_UPDATED' | 'QUEUE_RESET';
  order?: OrderTicket;
  bayCapacity?: BayCapacity;
  timestamp: number;
}

type Subscriber = (event: RealtimeOrderEvent) => void;

class RealtimeEventBus {
  private subscribers = new Set<Subscriber>();

  public subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  public publish(event: RealtimeOrderEvent): void {
    for (const sub of this.subscribers) {
      try {
        sub(event);
      } catch {
        // Ignore broken stream subscriber
      }
    }
  }
}

const globalForRealtime = globalThis as unknown as {
  bitepassRealtimeBus?: RealtimeEventBus;
};

// Unconditional globalThis binding across dev and production single/container workers
export const realtimeBus =
  globalForRealtime.bitepassRealtimeBus ?? new RealtimeEventBus();
globalForRealtime.bitepassRealtimeBus = realtimeBus;

