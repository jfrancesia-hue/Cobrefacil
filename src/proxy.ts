import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isDemoModeEnabled } from "@/lib/demo-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const apiRateLimitExemptPrefixes = [
  "/api/health",
  "/api/mercadopago/webhook",
  "/api/whatsapp/webhook",
  "/api/collection/cron",
];

function rateLimitApiRequest(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/")) return null;
  if (request.method === "GET" || request.method === "HEAD") return null;
  if (apiRateLimitExemptPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const isDemoLogin = pathname === "/api/demo/login";
  const result = checkRateLimit(
    `${pathname}:${getClientIp(request)}`,
    isDemoLogin ? 10 : 120,
    isDemoLogin ? 15 * 60 * 1000 : 60 * 1000
  );

  if (result.allowed) return null;

  return NextResponse.json(
    { error: "Demasiadas solicitudes. Intentá de nuevo en unos segundos." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    }
  );
}

export async function proxy(request: NextRequest) {
  const rateLimited = rateLimitApiRequest(request);
  if (rateLimited) return rateLimited;

  let supabaseResponse = NextResponse.next({ request });
  const demoEnabled = isDemoModeEnabled();
  const isDemoSession =
    demoEnabled && request.cookies.get("cobrefacil_demo")?.value === "1";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const publicPaths = [
    "/",
    "/login",
    "/register",
    "/onboarding",
    "/pay/",
    "/api/health",
    "/api/mercadopago/webhook",
    "/api/whatsapp/webhook",
    "/api/collection/cron",
    ...(demoEnabled ? ["/api/demo"] : []),
  ];
  const isPublic =
    pathname === "/" ||
    publicPaths.some((p) => p !== "/" && pathname.startsWith(p));

  if (!user && !isDemoSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if ((user || isDemoSession) && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
