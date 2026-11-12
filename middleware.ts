import { NextRequest, NextResponse } from 'next/server';

const UNVERSIONED_SUNSET_HTTP_DATE = 'Wed, 30 Jun 2027 23:59:59 GMT';

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const traceId =
    req.headers.get('x-trace-id')?.trim() ||
    `trc_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

  const appEnv = process.env.APP_ENV ?? 'local';
  const isProductionTier = appEnv === 'production' || appEnv === 'staging';

  // Enforce Merchant KDS RBAC gate on /merchant when running in staging/production
  if (pathname.startsWith('/merchant') && isProductionTier) {
    const kdsToken = process.env.MERCHANT_KDS_TOKEN;
    const cookieToken = req.cookies.get('bp_merchant_token')?.value;
    const headerToken =
      req.headers.get('x-merchant-kds-token') ??
      (req.headers.get('authorization')?.startsWith('Bearer ')
        ? req.headers.get('authorization')?.slice(7)
        : undefined);
    const provided = headerToken ?? cookieToken;

    if (!kdsToken || provided !== kdsToken) {
      return NextResponse.json(
        {
          type: 'https://docs.bitepass.ai/problems/unauthorized',
          title: 'UnauthorizedError',
          status: 401,
          detail: 'Valid Merchant KDS authentication token required to open /merchant in production.',
          code: 'UNAUTHORIZED',
          retryable: false,
        },
        {
          status: 401,
          headers: {
            'Content-Type': 'application/problem+json',
            'X-Trace-Id': traceId,
          },
        }
      );
    }
  }

  const reqHeaders = new Headers(req.headers);
  reqHeaders.set('x-trace-id', traceId);

  const response = NextResponse.next({
    request: { headers: reqHeaders },
  });

  // Standard OWASP security headers
  response.headers.set('X-Trace-Id', traceId);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self)'
  );

  // RFC 9745 / RFC 8594 Deprecation & Sunset headers on unversioned /api/* routes (exempting /api/v1/*)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/v1/')) {
    const v1Equivalent = pathname.replace(/^\/api\//, '/api/v1/');
    response.headers.set('Deprecation', '@1767225600');
    response.headers.set('Sunset', UNVERSIONED_SUNSET_HTTP_DATE);
    response.headers.set(
      'Link',
      `<${v1Equivalent}>; rel="successor-version", </openapi/openapi.v1.json>; rel="service-desc"`
    );
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/|videos/).*)'],
};

