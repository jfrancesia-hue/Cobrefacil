import { getCompanyOrRedirect } from "@/lib/get-company";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate, getDaysOverdue } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, CreditCard, CheckCircle } from "lucide-react";
import DebtStatusBadge from "@/components/debts/debt-status-badge";
import MarkPaidButton from "@/components/debts/mark-paid-button";

export default async function DebtDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { company } = await getCompanyOrRedirect();

  const debt = await prisma.debt.findFirst({
    where: { id, companyId: company.id },
    include: {
      debtor: { select: { id: true, name: true, email: true, whatsapp: true, phone: true } },
      payments: { orderBy: { createdAt: "desc" } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, channel: true, content: true, status: true, createdAt: true },
      },
    },
  });

  if (!debt) notFound();

  const totalPagado = debt.payments
    .filter((p) => p.status === "APPROVED")
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/debts" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{debt.concept}</h1>
          <p className="text-gray-500 text-sm">
            Deudor:{" "}
            <Link href={`/debtors/${debt.debtor.id}`} className="text-blue-600 hover:underline">
              {debt.debtor.name}
            </Link>
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Monto original</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(debt.originalAmount)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">A cobrar</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(debt.amount)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Cobrado</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalPagado)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Vencimiento</p>
          <p className="text-sm font-bold text-gray-900">{formatDate(debt.dueDate)}</p>
          {debt.status === "OVERDUE" && (
            <p className="text-xs text-red-500">{getDaysOverdue(debt.dueDate)} días vencida</p>
          )}
        </div>
      </div>

      {/* Estado + Acciones */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DebtStatusBadge status={debt.status} />
            {debt.mpPaymentLink && (
              <a
                href={debt.mpPaymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
              >
                <CreditCard className="w-4 h-4" />
                Link de pago MP
              </a>
            )}
          </div>
          <div className="flex gap-2">
            {debt.status !== "PAID" && debt.status !== "CANCELLED" && (
              <MarkPaidButton debtId={debt.id} />
            )}
          </div>
        </div>
        {debt.paidAt && (
          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Pagado el {formatDate(debt.paidAt)}
            {debt.paymentMethod && ` — ${debt.paymentMethod}`}
          </p>
        )}
      </div>

      {/* Historial de pagos */}
      {debt.payments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Historial de pagos</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-xs text-gray-500">Monto</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500">Método</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500">Estado</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {debt.payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{p.method}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.status === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : p.status === "REJECTED"
                          ? "bg-red-100 text-red-600"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mensajes relacionados */}
      {debt.messages.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Mensajes enviados</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {debt.messages.map((msg) => (
              <div key={msg.id} className="px-4 py-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {msg.channel}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(msg.createdAt)}</span>
                  <span
                    className={`text-xs ${
                      msg.status === "READ"
                        ? "text-green-600"
                        : msg.status === "FAILED"
                        ? "text-red-500"
                        : "text-gray-400"
                    }`}
                  >
                    {msg.status}
                  </span>
                </div>
                <p className="text-gray-600 truncate">{msg.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
