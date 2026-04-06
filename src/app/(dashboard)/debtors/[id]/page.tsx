import { getCompanyOrRedirect } from "@/lib/get-company";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate, getRiskLabel, getDaysOverdue } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MessageSquare } from "lucide-react";
import DebtStatusBadge from "@/components/debts/debt-status-badge";

export default async function DebtorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { company } = await getCompanyOrRedirect();

  const debtor = await prisma.debtor.findFirst({
    where: { id, companyId: company.id },
    include: {
      debts: { orderBy: { dueDate: "asc" } },
      messages: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!debtor) notFound();

  const risk = getRiskLabel(debtor.riskScore);
  const pendingDebts = debtor.debts.filter((d) => d.status !== "PAID" && d.status !== "CANCELLED");

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/debtors" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{debtor.name}</h1>
          <p className={`text-sm font-medium ${risk.color}`}>
            {risk.label} — Score: {debtor.riskScore}/100
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Deuda total</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(debtor.totalDebt)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total pagado</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(debtor.totalPaid)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Atraso promedio</p>
          <p className="text-2xl font-bold text-orange-500">{debtor.avgPaymentDelay} días</p>
        </div>
      </div>

      {/* Contacto */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Datos de contacto</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          {debtor.email && (
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-4 h-4" /> {debtor.email}
            </div>
          )}
          {debtor.whatsapp && (
            <div className="flex items-center gap-2 text-gray-600">
              <MessageSquare className="w-4 h-4" /> {debtor.whatsapp}
            </div>
          )}
          {debtor.phone && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-4 h-4" /> {debtor.phone}
            </div>
          )}
        </div>
      </div>

      {/* Deudas */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">
            Deudas ({debtor.debts.length})
          </h3>
          <Link
            href={`/debts/new?debtorId=${debtor.id}`}
            className="text-xs text-blue-600 hover:underline"
          >
            + Agregar deuda
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 text-xs text-gray-500">Concepto</th>
              <th className="text-right px-4 py-2 text-xs text-gray-500">Monto</th>
              <th className="text-left px-4 py-2 text-xs text-gray-500">Vencimiento</th>
              <th className="text-left px-4 py-2 text-xs text-gray-500">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {debtor.debts.map((debt) => (
              <tr key={debt.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{debt.concept}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(debt.amount)}</td>
                <td className="px-4 py-3 text-gray-500">
                  {formatDate(debt.dueDate)}
                  {debt.status === "OVERDUE" && (
                    <span className="text-red-500 text-xs ml-2">
                      ({getDaysOverdue(debt.dueDate)}d)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <DebtStatusBadge status={debt.status} />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/debts/${debt.id}`} className="text-blue-600 hover:underline text-xs">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mensajes recientes */}
      {debtor.messages.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Últimos mensajes</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {debtor.messages.map((msg) => (
              <div key={msg.id} className="px-4 py-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {msg.channel}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(msg.createdAt)}</span>
                  <span className={`text-xs ${msg.status === "READ" ? "text-green-600" : msg.status === "FAILED" ? "text-red-500" : "text-gray-400"}`}>
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
