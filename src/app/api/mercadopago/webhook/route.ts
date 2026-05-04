import { NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import crypto from "crypto";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

function parseSignature(signature: string): { ts?: string; v1?: string } {
  return signature.split(",").reduce<{ ts?: string; v1?: string }>((acc, part) => {
    const [key, value] = part.split("=");
    if (key?.trim() === "ts") acc.ts = value?.trim();
    if (key?.trim() === "v1") acc.v1 = value?.trim();
    return acc;
  }, {});
}

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) {
    return false;
  }

  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function isFreshTimestamp(ts: string): boolean {
  const timestamp = Number(ts);
  if (!Number.isFinite(timestamp)) return false;

  const timestampMs = timestamp > 10_000_000_000 ? timestamp : timestamp * 1000;
  const maxAgeSeconds = Number(process.env.MERCADOPAGO_WEBHOOK_MAX_AGE_SECONDS);
  const maxAgeMs =
    (Number.isFinite(maxAgeSeconds) && maxAgeSeconds > 0
      ? maxAgeSeconds
      : 86_400) * 1000;
  return Math.abs(Date.now() - timestampMs) <= maxAgeMs;
}

function isValidMercadoPagoWebhook(req: Request): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const signature = req.headers.get("x-signature") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";
  const { ts, v1 } = parseSignature(signature);
  if (!requestId || !ts || !v1) return false;
  if (!isFreshTimestamp(ts)) return false;

  const dataId = new URL(req.url).searchParams.get("data.id");
  const manifest = `${dataId ? `id:${dataId};` : ""}request-id:${requestId};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  return safeEqualHex(expected, v1);
}

function isDuplicatePaymentError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  );
}

export async function POST(req: Request) {
  if (!isValidMercadoPagoWebhook(req)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 403 });
  }

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
    const mpPaymentId = String(paymentId);

    if (status === "approved") {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.payment.create({
            data: {
              amount,
              method: "MERCADOPAGO",
              status: "APPROVED",
              mpPaymentId,
              mpStatus: status,
              debtId,
              companyId: debt.companyId,
              notes:
                debt.status === "PAID"
                  ? "Pago recibido cuando la deuda ya figuraba pagada"
                  : undefined,
            },
          });

          if (debt.status === "PAID") return;

          const newPaidAmount = Number(debt.paidAmount) + amount;
          const isFullyPaid = newPaidAmount >= Number(debt.amount);

          await tx.debt.update({
            where: { id: debtId },
            data: {
              paidAmount: newPaidAmount,
              paidAt: isFullyPaid ? new Date() : undefined,
              paymentMethod: "MERCADOPAGO",
              mpPaymentId,
              status: isFullyPaid ? "PAID" : "PARTIAL",
            },
          });

          await tx.debtor.update({
            where: { id: debt.debtorId },
            data: { totalPaid: { increment: amount } },
          });

          await tx.collectionAnalytics.create({
            data: {
              type: "PAYMENT_RECEIVED",
              metadata: { debtId, amount, mpPaymentId },
              companyId: debt.companyId,
            },
          });
        });
      } catch (err) {
        if (!isDuplicatePaymentError(err)) throw err;
      }
    } else if (status === "rejected") {
      try {
        await prisma.payment.create({
          data: {
            amount,
            method: "MERCADOPAGO",
            status: "REJECTED",
            mpPaymentId,
            mpStatus: status,
            debtId,
            companyId: debt.companyId,
          },
        });
      } catch (err) {
        if (!isDuplicatePaymentError(err)) throw err;
      }
    }
  } catch (err) {
    console.error("MP webhook error:", err);
    return NextResponse.json(
      { error: "No se pudo procesar el webhook" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
