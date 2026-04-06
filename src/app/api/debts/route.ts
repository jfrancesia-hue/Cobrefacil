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

const createSchema = z.object({
  debtorId: z.string().min(1),
  concept: z.string().min(1).max(200),
  amount: z.number().positive(),
  dueDate: z.string(),
  notes: z.string().optional(),
});

export async function GET() {
  const company = await getCompany();
  if (!company) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const debts = await prisma.debt.findMany({
    where: { companyId: company.id },
    include: { debtor: { select: { name: true, id: true } } },
    orderBy: { dueDate: "asc" },
    take: 500,
  });

  return NextResponse.json({ debts });
}

export async function POST(req: Request) {
  const company = await getCompany();
  if (!company) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { debtorId, concept, amount, dueDate, notes } = parsed.data;

  const debtor = await prisma.debtor.findFirst({
    where: { id: debtorId, companyId: company.id },
  });
  if (!debtor) return NextResponse.json({ error: "Deudor no encontrado" }, { status: 404 });

  const due = new Date(dueDate);
  const status = due < new Date() ? "OVERDUE" : "PENDING";

  const debt = await prisma.debt.create({
    data: {
      concept,
      amount,
      originalAmount: amount,
      dueDate: due,
      status,
      debtorId,
      companyId: company.id,
      metadata: notes ? { notes } : undefined,
    },
  });

  await prisma.debtor.update({
    where: { id: debtorId },
    data: { totalDebt: { increment: amount } },
  });

  return NextResponse.json({ debt }, { status: 201 });
}
