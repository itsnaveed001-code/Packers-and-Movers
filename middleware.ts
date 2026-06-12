import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

type CookieSet = { name: string; value: string; options?: CookieOptions };

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export async function middleware(request: NextRequest) {
  // CSRF guard for the public APIs: browsers always attach an Origin
  // header to cross-origin POSTs — reject mutating requests whose Origin
  // doesn't match the site. Requests without an Origin (curl, server-to-
  // server, same-origin GET) pass through; routes still do their own auth.
  if (request.nextUrl.pathname.startsWith('/api')) {
    if (!SAFE_METHODS.has(request.method)) {
      const origin = request.headers.get('origin');
      if (origin) {
        let originHost: string | null = null;
        try {
          originHost = new URL(origin).host;
        } catch {
          // malformed Origin → treat as mismatch
        }
        const hostHeader = request.headers.get('host');
        if (originHost !== request.nextUrl.host && originHost !== hostHeader) {
          return NextResponse.json(
            { error: 'cross_origin_forbidden' },
            { status: 403 },
          );
        }
      }
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
