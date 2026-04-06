import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Company } from "@prisma/client";

interface AuthResult {
  company: Company;
  userId: string;
}

/**
 * Valida auth y retorna la empresa del usuario.
 * Devuelve NextResponse 401/400 si falla, o { company, userId } si ok.
 */
export async function requireCompany(): Promise<AuthResult | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { companies: { take: 1, orderBy: { createdAt: "asc" } } },
  });

  if (!dbUser?.companies[0]) {
    return NextResponse.json({ error: "Sin empresa configurada" }, { status: 400 });
  }

  return { company: dbUser.companies[0], userId: dbUser.id };
}

/** Type guard para chequear si el resultado es un error de NextResponse */
export function isAuthError(result: AuthResult | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
