import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, isAuthError } from "@/lib/api-auth";
import { z } from "zod";

export async function POST(req: Request) {
  const auth = await requireCompany();
  if (isAuthError(auth)) return auth;
  const { company } = auth;

  const body = await req.json();
  const parsed = z.object({ name: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const sequence = await prisma.collectionSequence.create({
    data: { name: parsed.data.name, companyId: company.id },
  });

  return NextResponse.json({ sequence }, { status: 201 });
}
