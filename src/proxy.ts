import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isDemoModeEnabled } from "@/lib/demo-auth";

export async function proxy(request: NextRequest) {
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
    "/api/mercadopago",
    "/api/whatsapp",
    "/api/collection",
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
