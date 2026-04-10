import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, isAuthError } from "@/lib/api-auth";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["PENDING", "DUE", "OVERDUE", "PAID", "PARTIAL", "WRITTEN_OFF", "CANCELLED"]).optional(),
  paymentMethod: z.string().optional(),
  concept: z.string().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  dueDate: z.string().optional(),
  discount: z.number().min(0).optional(),
  lateFee: z.number().min(0).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, auth] = await Promise.all([params, requireCompany()]);
  if (isAuthError(auth)) return auth;
  const { company } = auth;

  const debt = await prisma.debt.findFirst({
    where: { id, companyId: company.id },
    include: {
      debtor: { select: { id: true, name: true, email: true, whatsapp: true } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!debt) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ debt });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, auth] = await Promise.all([params, requireCompany()]);
  if (isAuthError(auth)) return auth;
  const { company } = auth;

  const debt = await prisma.debt.findFirst({ where: { id, companyId: company.id } });
  if (!debt) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { status, paymentMethod, concept, amount, dueDate, discount, lateFee } = parsed.data;

  const now = new Date();
  const updateData: Record<string, unknown> = {};

  if (concept) updateData.concept = concept;
  if (amount !== undefined) {
    updateData.amount = amount;
    updateData.originalAmount = amount;
  }
  if (dueDate) updateData.dueDate = new Date(dueDate);
  if (discount !== undefined) updateData.discount = discount;
  if (lateFee !== undefined) updateData.lateFee = lateFee;
  if (status) {
    updateData.status = status;
    if (status === "PAID") {
      updateData.paidAt = now;
      updateData.paidAmount = Number(debt.amount);
      if (paymentMethod) updateData.paymentMethod = paymentMethod;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedDebt = await tx.debt.update({ where: { id }, data: updateData });

    // Si se marcó como PAID, registrar pago en tabla Payment y actualizar totalPaid del deudor
    if (status === "PAID" && debt.status !== "PAID") {
      await tx.payment.create({
        data: {
          amount: Number(debt.amount),
          method: (paymentMethod as "CASH") ?? "CASH",
          status: "APPROVED",
          debtId: id,
          companyId: company.id,
        },
      });
      await tx.debtor.update({
        where: { id: debt.debtorId },
        data: { totalPaid: { increment: Number(debt.amount) } },
      });
    }

    return updatedDebt;
  });

  return NextResponse.json({ debt: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, auth] = await Promise.all([params, requireCompany()]);
  if (isAuthError(auth)) return auth;
  const { company } = auth;

  const debt = await prisma.debt.findFirst({ where: { id, companyId: company.id } });
  if (!debt) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await prisma.$transaction([
    prisma.debt.delete({ where: { id } }),
    prisma.debtor.update({
      where: { id: debt.debtorId },
      data: { totalDebt: { decrement: Number(debt.amount) } },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
