import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard, CheckCircle, Building2 } from "lucide-react";
import { generatePaymentLink } from "@/lib/payment-link-generator";

export default async function PayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let debtId: string;
  let companyId: string;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    [debtId, companyId] = decoded.split(":");
  } catch {
    notFound();
  }

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Pago recibido!</h1>
          <p className="text-gray-500">Esta deuda ya fue pagada el {formatDate(debt.paidAt)}.</p>
        </div>
      </div>
    );
  }

  const amount = Number(debt.amount) + Number(debt.lateFee) - Number(debt.discount);

  // Generar/reusar link de MercadoPago
  let paymentLink = debt.mpPaymentLink;
  if (!paymentLink) {
    try {
      paymentLink = await generatePaymentLink({ debtId, companyId });
    } catch {
      // Sin token MP configurado, mostrar datos bancarios
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header empresa */}
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{debt.company.name}</p>
            {debt.company.email && (
              <p className="text-xs text-gray-500">{debt.company.email}</p>
            )}
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-1">Pagá tu deuda</h1>
        <p className="text-gray-500 text-sm mb-6">Hola {debt.debtor.name}, te enviamos este link para que puedas pagar fácilmente.</p>

        {/* Detalle de deuda */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Concepto</span>
            <span className="font-medium text-gray-900">{debt.concept}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Vencimiento</span>
            <span className="font-medium text-gray-900">{formatDate(debt.dueDate)}</span>
          </div>
          {Number(debt.lateFee) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Recargo</span>
              <span className="font-medium text-red-600">+{formatCurrency(debt.lateFee)}</span>
            </div>
          )}
          {Number(debt.discount) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Descuento pronto pago</span>
              <span className="font-medium text-green-600">-{formatCurrency(debt.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
            <span>Total a pagar</span>
            <span className="text-blue-600">{formatCurrency(amount)}</span>
          </div>
        </div>

        {paymentLink ? (
          <a
            href={paymentLink}
            className="flex items-center justify-center gap-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors text-base"
          >
            <CreditCard className="w-5 h-5" />
            Pagar con MercadoPago
          </a>
        ) : (
          <div className="text-center text-gray-500 text-sm p-4 bg-gray-50 rounded-xl">
            Contactá a {debt.company.name} para coordinar el pago.
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          Pago seguro procesado por MercadoPago
        </p>
      </div>
    </div>
  );
}
