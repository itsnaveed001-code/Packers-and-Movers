import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { isCrossOriginForbidden } from '@/lib/apiGuard';

type CookieSet = { name: string; value: string; options?: CookieOptions };

export async function middleware(request: NextRequest) {
  // CSRF guard for the public APIs — logic lives in lib/apiGuard.ts so
  // the self-test can assert it (incl. the Razorpay webhook exemption;
  // webhooks authenticate via X-Razorpay-Signature in the route instead).
  if (request.nextUrl.pathname.startsWith('/api')) {
    if (
      isCrossOriginForbidden({
        method: request.method,
        pathname: request.nextUrl.pathname,
        origin: request.headers.get('origin'),
        requestHost: request.nextUrl.host,
        hostHeader: request.headers.get('host'),
      })
    ) {
      return NextResponse.json(
        { error: 'cross_origin_forbidden' },
        { status: 403 },
      );
    }
    // No admin-session work needed on API paths.
    return NextResponse.next();
  }

  // Only run the auth logic on /admin/* (config below enforces this further).
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLogin = pathname === '/admin/login';

  if (!user && pathname.startsWith('/admin') && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Already logged in? Skip the login page.
  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
