import { getCompanyOrRedirect } from "@/lib/get-company";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard } from "lucide-react";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
  REFUNDED: "bg-gray-100 text-gray-600",
};

export default async function PaymentsPage() {
  const { company } = await getCompanyOrRedirect();

  const payments = await prisma.payment.findMany({
    where: { companyId: company.id },
    include: {
      debt: { select: { concept: true, debtor: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const totalApproved = payments
    .filter((p) => p.status === "APPROVED")
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
          <p className="text-gray-500 text-sm mt-1">{payments.length} pagos registrados</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2">
          <p className="text-xs text-green-600">Total cobrado</p>
          <p className="text-xl font-bold text-green-700">{formatCurrency(totalApproved)}</p>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Sin pagos registrados aún</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Deudor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Concepto</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Monto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Método</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.debt.debtor.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.debt.concept}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.method}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[p.status]}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
