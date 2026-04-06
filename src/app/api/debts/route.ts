import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, isAuthError } from "@/lib/api-auth";
import { z } from "zod";

const createSchema = z.object({
  debtorId: z.string().min(1),
  concept: z.string().min(1).max(200),
  amount: z.number().positive(),
  dueDate: z.string(),
  notes: z.string().optional(),
});

export async function GET() {
  const auth = await requireCompany();
  if (isAuthError(auth)) return auth;
  const { company } = auth;

  const debts = await prisma.debt.findMany({
    where: { companyId: company.id },
    include: { debtor: { select: { name: true, id: true } } },
    orderBy: { dueDate: "asc" },
    take: 500,
  });

  return NextResponse.json({ debts });
}

export async function POST(req: Request) {
  const auth = await requireCompany();
  if (isAuthError(auth)) return auth;
  const { company } = auth;

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

  const [debt] = await prisma.$transaction([
    prisma.debt.create({
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
    }),
    prisma.debtor.update({
      where: { id: debtorId },
      data: { totalDebt: { increment: amount } },
    }),
  ]);

  return NextResponse.json({ debt }, { status: 201 });
}
