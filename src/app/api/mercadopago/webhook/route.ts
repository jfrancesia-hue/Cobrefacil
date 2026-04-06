import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { prisma } from "@/lib/prisma";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export async function POST(req: Request) {
  const body = await req.json();

  if (body.type !== "payment") {
    return NextResponse.json({ ok: true });
  }

  const paymentId = body.data?.id;
  if (!paymentId) return NextResponse.json({ ok: true });

  try {
    const paymentApi = new Payment(client);
    const mpPayment = await paymentApi.get({ id: paymentId });

    const debtId = mpPayment.external_reference;
    if (!debtId) return NextResponse.json({ ok: true });

    const debt = await prisma.debt.findUnique({ where: { id: debtId } });
    if (!debt) return NextResponse.json({ ok: true });

    const amount = mpPayment.transaction_amount ?? 0;
    const status = mpPayment.status;

    if (status === "approved") {
      const newPaidAmount = Number(debt.paidAmount) + amount;
      const isFullyPaid = newPaidAmount >= Number(debt.amount);

      await prisma.debt.update({
        where: { id: debtId },
        data: {
          paidAmount: newPaidAmount,
          paidAt: isFullyPaid ? new Date() : undefined,
          paymentMethod: "MERCADOPAGO",
          mpPaymentId: String(paymentId),
          status: isFullyPaid ? "PAID" : "PARTIAL",
        },
      });

      // Registrar pago
      await prisma.payment.create({
        data: {
          amount,
          method: "MERCADOPAGO",
          status: "APPROVED",
          mpPaymentId: String(paymentId),
          mpStatus: status,
          debtId,
          companyId: debt.companyId,
        },
      });

      // Actualizar totalPaid del deudor
      await prisma.debtor.update({
        where: { id: debt.debtorId },
        data: { totalPaid: { increment: amount } },
      });

      // Analytics
      await prisma.collectionAnalytics.create({
        data: {
          type: "PAYMENT_RECEIVED",
          metadata: { debtId, amount, mpPaymentId: paymentId },
          companyId: debt.companyId,
        },
      });
    } else if (status === "rejected") {
      await prisma.payment.create({
        data: {
          amount,
          method: "MERCADOPAGO",
          status: "REJECTED",
          mpPaymentId: String(paymentId),
          mpStatus: status,
          debtId,
          companyId: debt.companyId,
        },
      });
    }
  } catch (err) {
    console.error("MP webhook error:", err);
  }

  return NextResponse.json({ ok: true });
}
