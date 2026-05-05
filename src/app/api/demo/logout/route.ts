import { NextResponse } from "next/server";
import { DEMO_COOKIE, isDemoModeEnabled } from "@/lib/demo-auth";

export async function POST() {
  if (!isDemoModeEnabled()) {
    return NextResponse.json({ ok: true });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEMO_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
