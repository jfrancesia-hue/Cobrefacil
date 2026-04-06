import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getCompany() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { companies: { take: 1 } },
  });
  return dbUser?.companies[0] ?? null;
}

export async function POST(req: Request) {
  const company = await getCompany();
  if (!company) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = z.object({ name: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const sequence = await prisma.collectionSequence.create({
    data: { name: parsed.data.name, companyId: company.id },
  });

  return NextResponse.json({ sequence }, { status: 201 });
}
