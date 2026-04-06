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
  if (!dbUser) return null;
  return { company: dbUser.companies[0] ?? null, user: dbUser };
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  whatsapp: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const ctx = await getCompany();
  if (!ctx?.company) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { company } = ctx;

  const debtors = await prisma.debtor.findMany({
    where: { companyId: company.id },
    select: { id: true, name: true, email: true, whatsapp: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ debtors });
}

export async function POST(req: Request) {
  const ctx = await getCompany();
  if (!ctx?.company) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { company } = ctx;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { name, email, whatsapp, phone, notes } = parsed.data;

  if (email) {
    const existing = await prisma.debtor.findUnique({
      where: { companyId_email: { companyId: company.id, email } },
    });
    if (existing) {
      return NextResponse.json({ error: "Ya existe un deudor con ese email" }, { status: 400 });
    }
  }

  const debtor = await prisma.debtor.create({
    data: {
      name,
      email: email || null,
      whatsapp: whatsapp || null,
      phone: phone || null,
      notes: notes || null,
      companyId: company.id,
    },
  });

  return NextResponse.json({ debtor }, { status: 201 });
}
