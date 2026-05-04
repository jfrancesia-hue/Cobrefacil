import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard, CheckCircle, Building2, ShieldCheck } from "lucide-react";
import { generatePaymentLink } from "@/lib/payment-link-generator";
import { verifyPaymentToken } from "@/lib/payment-token";

export default async function PayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const payload = verifyPaymentToken(token);
  if (!payload) notFound();
  const { debtId, companyId } = payload;

  const debt = await prisma.debt.findFirst({
    where: { id: debtId, companyId },
    include: {
      debtor: true,
      company: { select: { name: true, logo: true, email: true } },
    },
  });

  if (!debt) notFound();

  if (debt.status === "PAID") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
          <h1 className="mb-2 text-2xl font-bold text-slate-950">Pago recibido</h1>
          <p className="text-slate-500">
            Esta deuda ya fue pagada el {formatDate(debt.paidAt)}.
          </p>
        </div>
      </div>
    );
  }

  const amount = Number(debt.amount) + Number(debt.lateFee) - Number(debt.discount);

  let paymentLink = debt.mpPaymentLink;
  if (!paymentLink) {
    try {
      paymentLink = await generatePaymentLink({ debtId, companyId });
    } catch {
      // Si MercadoPago no está configurado, dejamos visible el contacto manual.
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#d1fae5,transparent_32%),linear-gradient(135deg,#f8fafc,#e2e8f0)] p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl md:grid-cols-[0.9fr_1.1fr]">
        <div className="relative hidden bg-slate-950 p-8 text-white md:block">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(16,185,129,0.35),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.45),transparent_28%)]" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-400 text-slate-950">
                <Building2 className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-slate-300">Cobro emitido por</p>
              <h2 className="mt-2 text-2xl font-bold">{debt.company.name}</h2>
              {debt.company.email && (
                <p className="mt-1 text-sm text-slate-400">{debt.company.email}</p>
              )}
            </div>

            <div className="relative mx-auto h-44 w-44" style={{ perspective: "760px" }}>
              <div
                className="absolute inset-4 rounded-lg border border-white/20 bg-white/10 shadow-2xl"
                style={{ transform: "rotateX(58deg) rotateZ(-34deg)" }}
              />
              <div
                className="absolute inset-10 rounded-lg border border-emerald-200/50 bg-emerald-300/25 shadow-2xl"
                style={{ transform: "rotateX(58deg) rotateZ(-34deg) translateZ(34px)" }}
              />
              <div className="absolute left-14 top-11 flex h-16 w-16 items-center justify-center rounded-full bg-white text-emerald-700 shadow-xl">
                <CreditCard className="h-7 w-7" />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Link firmado y verificado
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-6 md:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-slate-950">{debt.company.name}</p>
              {debt.company.email && (
                <p className="text-xs text-slate-500">{debt.company.email}</p>
              )}
            </div>
          </div>

          <h1 className="mb-1 text-2xl font-bold text-slate-950">Pagá tu deuda</h1>
          <p className="mb-6 text-sm leading-6 text-slate-500">
            Hola {debt.debtor.name}, este enlace te permite resolver el pago de forma simple y segura.
          </p>

          <div className="mb-6 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-slate-500">Concepto</span>
              <span className="text-right font-medium text-slate-950">{debt.concept}</span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-slate-500">Vencimiento</span>
              <span className="font-medium text-slate-950">{formatDate(debt.dueDate)}</span>
            </div>
            {Number(debt.lateFee) > 0 && (
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">Recargo</span>
                <span className="font-medium text-red-600">+{formatCurrency(debt.lateFee)}</span>
              </div>
            )}
            {Number(debt.discount) > 0 && (
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">Descuento pronto pago</span>
                <span className="font-medium text-emerald-600">-{formatCurrency(debt.discount)}</span>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-base font-bold">
              <span>Total a pagar</span>
              <span className="text-emerald-700">{formatCurrency(amount)}</span>
            </div>
          </div>

          {paymentLink ? (
            <a
              href={paymentLink}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-slate-950 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-700"
            >
              <CreditCard className="h-5 w-5" />
              Pagar con MercadoPago
            </a>
          ) : (
            <div className="rounded-lg bg-slate-100 p-4 text-center text-sm text-slate-500">
              Contactá a {debt.company.name} para coordinar el pago.
            </div>
          )}

          <p className="mt-4 text-center text-xs text-slate-400">
            Pago seguro procesado por MercadoPago
          </p>
        </div>
      </div>
    </div>
  );
}
