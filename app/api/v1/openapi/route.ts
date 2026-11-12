import { NextResponse } from 'next/server';
import { buildOpenApiV1Spec } from '@/lib/openapi-spec';

export async function GET() {
  return NextResponse.json(buildOpenApiV1Spec(), {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}

