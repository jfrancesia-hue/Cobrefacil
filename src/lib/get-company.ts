import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DEMO_COOKIE } from "@/lib/demo-auth";
import { demoCompany, demoUser } from "@/lib/demo-data";

export async function getCompanyOrRedirect() {
  const cookieStore = await cookies();
  if (cookieStore.get(DEMO_COOKIE)?.value === "1") {
    return { user: demoUser, company: demoCompany, isDemo: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { companies: { take: 1, orderBy: { createdAt: "asc" } } },
  });

  if (!dbUser) redirect("/login");
  if (!dbUser.companies.length) redirect("/onboarding");

  return { user: dbUser, company: dbUser.companies[0], isDemo: false };
}

export async function getCompanyFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  // Implementado en API routes via supabase server client
  return null;
}
