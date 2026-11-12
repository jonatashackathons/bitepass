import { randomUUID } from 'node:crypto';
import { getEnv } from './env';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogContext {
  traceId?: string;
  orderId?: string;
  userId?: string;
  merchantId?: string;
  event?: string;
  latencyMs?: number;
  [key: string]: unknown;
}

export function resolveTraceId(req?: Request): string {
  const incoming =
    req?.headers.get('x-trace-id')?.trim() ||
    req?.headers.get('x-request-id')?.trim();
  if (incoming && incoming.length <= 128) {
    return incoming;
  }
  return `trc_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function emitLog(level: LogLevel, msg: string, context: LogContext = {}): void {
  const env = getEnv();
  if (env.NODE_ENV === 'test' && level !== 'error') {
    return;
  }

  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'bitepass-web',
    traceId: context.traceId ?? resolveTraceId(),
    msg,
    ...context,
  });

  if (level === 'error') {
    console.error(payload);
  } else if (level === 'warn') {
    console.warn(payload);
  } else {
    console.info(payload);
  }
}

export const logger = {
  info: (msg: string, context?: LogContext) => emitLog('info', msg, context),
  warn: (msg: string, context?: LogContext) => emitLog('warn', msg, context),
  error: (msg: string, context?: LogContext) => emitLog('error', msg, context),
};
