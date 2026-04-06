import { getCompanyOrRedirect } from "@/lib/get-company";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCurrency, formatDate, getDaysOverdue } from "@/lib/utils";
import { Plus, FileText } from "lucide-react";
import DebtStatusBadge from "@/components/debts/debt-status-badge";

export default async function DebtsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const { company } = await getCompanyOrRedirect();

  const where: Record<string, unknown> = { companyId: company.id };
  if (status) where.status = status;

  const debts = await prisma.debt.findMany({
    where,
    include: { debtor: { select: { name: true, id: true } } },
    orderBy: { dueDate: "asc" },
    take: 200,
  });

  const totals = {
    pending: debts.filter((d) => d.status === "PENDING" || d.status === "DUE" || d.status === "OVERDUE").length,
    paid: debts.filter((d) => d.status === "PAID").length,
    total: debts.reduce((sum, d) => sum + Number(d.amount), 0),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deudas</h1>
          <p className="text-gray-500 text-sm mt-1">{debts.length} deudas</p>
        </div>
        <Link
          href="/debts/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Nueva deuda
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { label: "Todas", value: "" },
          { label: "Pendientes", value: "PENDING" },
          { label: "Vencidas", value: "OVERDUE" },
          { label: "Pagadas", value: "PAID" },
          { label: "Parcial", value: "PARTIAL" },
        ].map(({ label, value }) => (
          <Link
            key={value}
            href={value ? `/debts?status=${value}` : "/debts"}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              (status ?? "") === value
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {debts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Sin deudas {status ? `con estado "${status}"` : "aún"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Deudor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Concepto</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Monto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vencimiento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {debts.map((debt) => (
                <tr key={debt.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/debtors/${debt.debtor.id}`} className="text-blue-600 hover:underline">
                      {debt.debtor.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{debt.concept}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(debt.amount)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(debt.dueDate)}
                    {debt.status === "OVERDUE" && (
                      <span className="text-red-500 text-xs ml-1">
                        +{getDaysOverdue(debt.dueDate)}d
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
      )}
    </div>
  );
}
