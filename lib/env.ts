import { z } from 'zod';

export const ENV_SCHEMA_KEYS = [
  'APP_ENV',
  'BITEPASS_MOCK_MODE',
  'NEXT_PUBLIC_DEMO_MODE',
  'STORAGE_DRIVER',
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'PAYPAL_ENV',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_WEBHOOK_ID',
  'PAYPAL_PARTNER_MERCHANT_ID',
  'BITEPASS_SESSION_SECRET',
  'MERCHANT_KDS_TOKEN',
  'SANDBOX_ADMIN_TOKEN',
  'GEOFENCE_HMAC_SECRET',
  'NEXT_PUBLIC_BASE_URL',
  'DATABASE_URL',
  'DIRECT_URL',
  'REDIS_URL',
  'BITEPASS_PG_PORT',
  'BITEPASS_REDIS_PORT',
] as const;

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PHASE: z.string().optional(),
  APP_ENV: z.enum(['local', 'ci', 'staging', 'production']).default('local'),
  BITEPASS_MOCK_MODE: z.enum(['true', 'false']).optional(),
  NEXT_PUBLIC_DEMO_MODE: z.enum(['true', 'false']).optional(),
  STORAGE_DRIVER: z.enum(['memory', 'postgres']).optional(),

  GEMINI_API_KEY: z.string().trim().optional(),
  GEMINI_MODEL: z.string().trim().default('gemini-4-argon'),

  PAYPAL_ENV: z.enum(['sandbox', 'live']).default('sandbox'),
  PAYPAL_CLIENT_ID: z.string().trim().optional(),
  PAYPAL_CLIENT_SECRET: z.string().trim().optional(),
  PAYPAL_WEBHOOK_ID: z.string().trim().optional(),
  PAYPAL_PARTNER_MERCHANT_ID: z.string().trim().optional(),

  BITEPASS_SESSION_SECRET: z
    .string()
    .trim()
    .default('dev-session-secret-change-in-production-32chars'),
  MERCHANT_KDS_TOKEN: z.string().trim().default('dev-merchant-kds-token'),
  SANDBOX_ADMIN_TOKEN: z.string().trim().default('dev-sandbox-admin-token'),
  GEOFENCE_HMAC_SECRET: z.string().trim().default('dev-geofence-ble-hmac-secret'),
  NEXT_PUBLIC_BASE_URL: z.string().trim().default('http://localhost:3000'),

  DATABASE_URL: z.string().trim().optional(),
  DIRECT_URL: z.string().trim().optional(),
  REDIS_URL: z.string().trim().optional(),
  BITEPASS_PG_PORT: z.string().trim().default('54329'),
  BITEPASS_REDIS_PORT: z.string().trim().default('63799'),
});

export interface ValidatedEnv extends z.infer<typeof baseEnvSchema> {
  isProductionTier: boolean;
  isDemoAllowed: boolean;
  isMockPayPal: boolean;
  isMockGemini: boolean;
  storageDriver: 'memory' | 'postgres';
  paypalBaseUrl: string;
}

export function parseRuntimeEnv(
  rawEnv: NodeJS.ProcessEnv = process.env,
  options: { enforceRuntimeSecrets?: boolean } = {}
): ValidatedEnv {
  const isBuildPhase = rawEnv.NEXT_PHASE === 'phase-production-build';
  const parsed = baseEnvSchema.safeParse(rawEnv);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`[BitePass Startup Error] Invalid environment format:\n${details}`);
  }

  const val = parsed.data;
  const isProductionTier = val.APP_ENV === 'production' || val.APP_ENV === 'staging';
  const enforceSecrets = options.enforceRuntimeSecrets ?? (!isBuildPhase && isProductionTier);

  const issues: string[] = [];

  const cleanPayPalId =
    val.PAYPAL_CLIENT_ID &&
    !val.PAYPAL_CLIENT_ID.startsWith('your_')
      ? val.PAYPAL_CLIENT_ID
      : undefined;
  const cleanPayPalSecret =
    val.PAYPAL_CLIENT_SECRET &&
    !val.PAYPAL_CLIENT_SECRET.startsWith('your_')
      ? val.PAYPAL_CLIENT_SECRET
      : undefined;
  const cleanGeminiKey =
    val.GEMINI_API_KEY && !val.GEMINI_API_KEY.startsWith('your_')
      ? val.GEMINI_API_KEY
      : undefined;

  if (Boolean(cleanPayPalId) !== Boolean(cleanPayPalSecret)) {
    issues.push(
      'PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must both be provided together (or both omitted in local mock mode).'
    );
  }

  if (val.PAYPAL_ENV === 'live' && val.BITEPASS_MOCK_MODE === 'true') {
    issues.push('BITEPASS_MOCK_MODE=true is strictly forbidden when PAYPAL_ENV=live.');
  }

  if (enforceSecrets) {
    if (val.BITEPASS_MOCK_MODE === 'true') {
      issues.push(`BITEPASS_MOCK_MODE=true is strictly forbidden when APP_ENV=${val.APP_ENV}.`);
    }
    if (val.STORAGE_DRIVER === 'memory') {
      issues.push(
        `STORAGE_DRIVER=memory is forbidden when APP_ENV=${val.APP_ENV}; use STORAGE_DRIVER=postgres.`
      );
    }
    if (!cleanPayPalId || !cleanPayPalSecret) {
      issues.push(`PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required when APP_ENV=${val.APP_ENV}.`);
    }
    if (!val.PAYPAL_WEBHOOK_ID) {
      issues.push(`PAYPAL_WEBHOOK_ID is required when APP_ENV=${val.APP_ENV}.`);
    }
    if (!cleanGeminiKey) {
      issues.push(`GEMINI_API_KEY is required when APP_ENV=${val.APP_ENV}.`);
    }
    if (!val.DATABASE_URL) {
      issues.push(`DATABASE_URL is required when APP_ENV=${val.APP_ENV}.`);
    }
    if (
      val.BITEPASS_SESSION_SECRET === 'dev-session-secret-change-in-production-32chars' ||
      val.BITEPASS_SESSION_SECRET.length < 32
    ) {
      issues.push('BITEPASS_SESSION_SECRET must be a strong >=32-character secret in production.');
    }
  }

  const resolvedStorageDriver: 'memory' | 'postgres' =
    val.STORAGE_DRIVER ?? (isProductionTier ? 'postgres' : 'memory');

  if (!isBuildPhase && resolvedStorageDriver === 'postgres' && !val.DATABASE_URL) {
    issues.push(
      'STORAGE_DRIVER=postgres requires DATABASE_URL (run `npm run dx:up` or set STORAGE_DRIVER=memory for offline dev).'
    );
  }

  if (issues.length > 0) {
    throw new Error(
      `\n[BitePass Startup Error] Environment validation failed:\n` +
        issues.map((m) => `  ✖ ${m}`).join('\n') +
        `\n  → Tip: Run 'cp .env.example .env.local' for offline mock mode.\n`
    );
  }

  const isMockPayPal =
    !isProductionTier &&
    val.PAYPAL_ENV !== 'live' &&
    val.BITEPASS_MOCK_MODE !== 'false' &&
    (!cleanPayPalId || val.BITEPASS_MOCK_MODE === 'true');

  const isMockGemini =
    !isProductionTier &&
    val.BITEPASS_MOCK_MODE !== 'false' &&
    (!cleanGeminiKey || val.BITEPASS_MOCK_MODE === 'true');

  return {
    ...val,
    PAYPAL_CLIENT_ID: cleanPayPalId,
    PAYPAL_CLIENT_SECRET: cleanPayPalSecret,
    GEMINI_API_KEY: cleanGeminiKey,
    isProductionTier,
    isDemoAllowed: !isProductionTier && val.NEXT_PUBLIC_DEMO_MODE !== 'false',
    isMockPayPal,
    isMockGemini,
    storageDriver: resolvedStorageDriver,
    paypalBaseUrl:
      val.PAYPAL_ENV === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com',
  };
}

let cachedEnv: ValidatedEnv | null = null;

export function getEnv(): ValidatedEnv {
  if (process.env.NODE_ENV === 'test') {
    return parseRuntimeEnv(process.env);
  }
  if (!cachedEnv) {
    cachedEnv = parseRuntimeEnv(process.env);
  }
  return cachedEnv;
}

export function resetEnvCache(): void {
  cachedEnv = null;
}

export function assertServerRuntimeEnv(): ValidatedEnv {
  return parseRuntimeEnv(process.env, {
    enforceRuntimeSecrets:
      process.env.APP_ENV === 'production' || process.env.APP_ENV === 'staging',
  });
}

