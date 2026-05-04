import { NextResponse } from "next/server";
import { DEMO_COOKIE, isDemoModeEnabled } from "@/lib/demo-auth";

export async function POST() {
  if (!isDemoModeEnabled()) {
    return NextResponse.json({ error: "Demo deshabilitada" }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEMO_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
