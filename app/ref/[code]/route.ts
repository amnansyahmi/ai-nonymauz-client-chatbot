import { NextRequest, NextResponse } from 'next/server';
import { recordClick } from '../../../lib/affiliate/queries';
import {
  ATTRIBUTION_COOKIE,
  cookieMaxAgeSeconds,
  parseUserAgent,
  clientIpFromHeaders
} from '../../../lib/affiliate/tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Referral entry point: majlismate.ai/ref/AMNAN10
 *
 * Logs a click (device, browser, IP, utm_source), sets a 90-day attribution
 * cookie, then redirects to the landing page. Unknown codes redirect silently
 * with no cookie. Click logging never blocks the redirect.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { searchParams, origin } = request.nextUrl;
  const utmSource = searchParams.get('utm_source');
  const { device, browser } = parseUserAgent(request.headers.get('user-agent'));
  const ip = clientIpFromHeaders(request.headers);

  let matched = null;
  try {
    matched = await recordClick(code, { ip, device, browser, utmSource });
  } catch (error) {
    console.error('[ref] click logging failed', error);
  }

  const response = NextResponse.redirect(new URL('/', origin));
  if (matched) {
    response.cookies.set(ATTRIBUTION_COOKIE, matched.code, {
      maxAge: cookieMaxAgeSeconds(),
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
  }
  return response;
}
