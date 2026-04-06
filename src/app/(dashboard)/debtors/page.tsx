import { getCompanyOrRedirect } from "@/lib/get-company";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCurrency, getRiskLabel } from "@/lib/utils";
import { Users, Upload, Plus } from "lucide-react";

export default async function DebtorsPage() {
  const { company } = await getCompanyOrRedirect();

  const debtors = await prisma.debtor.findMany({
    where: { companyId: company.id },
    include: { _count: { select: { debts: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deudores</h1>
          <p className="text-gray-500 text-sm mt-1">{debtors.length} deudores registrados</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/debtors/import-csv"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4" />
            Importar CSV
          </Link>
          <Link
            href="/debtors/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo deudor
          </Link>
        </div>
      </div>

      {debtors.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sin deudores aún</h3>
          <p className="text-gray-500 mb-6">Importá un CSV o agregá deudores manualmente.</p>
          <Link
            href="/debtors/import-csv"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            Importar CSV
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email / WhatsApp</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Deuda total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Riesgo</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Deudas</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {debtors.map((d) => {
                const risk = getRiskLabel(d.riskScore);
                return (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                    <td className="px-4 py-3 text-gray-500">
                      <div>{d.email ?? "-"}</div>
                      <div className="text-xs">{d.whatsapp ?? d.phone ?? ""}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(d.totalDebt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium ${risk.color}`}>
                        {risk.label} ({d.riskScore})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {d._count.debts}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/debtors/${d.id}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
