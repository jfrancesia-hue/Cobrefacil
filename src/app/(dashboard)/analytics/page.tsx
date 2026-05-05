import { getCompanyOrRedirect } from "@/lib/get-company";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import AnalyticsCharts from "@/components/analytics/analytics-charts";

export default async function AnalyticsPage() {
  const { company } = await getCompanyOrRedirect();

  const [debts, messages, payments] = await Promise.all([
    prisma.debt.findMany({
      where: { companyId: company.id },
      select: { status: true, amount: true, paidAmount: true, dueDate: true, paidAt: true },
    }),
    prisma.collectionMessage.findMany({
      where: { companyId: company.id },
      select: { channel: true, status: true, createdAt: true },
    }),
    prisma.payment.findMany({
      where: { companyId: company.id, status: "APPROVED" },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Distribución por estado
  const statusDist = debts.reduce<Record<string, { count: number; amount: number }>>((acc, d) => {
    if (!acc[d.status]) acc[d.status] = { count: 0, amount: 0 };
    acc[d.status].count++;
    acc[d.status].amount += Number(d.amount);
    return acc;
  }, {});

  // Recupero por mes
  const monthlyData = payments.reduce<Record<string, number>>((acc, p) => {
    const month = new Date(p.createdAt).toLocaleString("es-AR", { month: "short", year: "2-digit" });
    acc[month] = (acc[month] ?? 0) + Number(p.amount);
    return acc;
  }, {});

  const recoveryByMonth = Object.entries(monthlyData)
    .slice(-12)
    .map(([month, amount]) => ({ month, amount }));

  // Efectividad por canal
  const channelStats = ["WHATSAPP", "EMAIL", "SMS"].map((channel) => {
    const total = messages.filter((m) => m.channel === channel).length;
    const read = messages.filter((m) => m.channel === channel && m.status === "READ").length;
    return {
      channel,
      total,
      readRate: total > 0 ? Math.round((read / total) * 100) : 0,
    };
  });

  const totalDebt = debts.reduce((s, d) => s + Number(d.amount), 0);
  const totalRecovered = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Métricas detalladas de cobranza</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Tasa de recupero</p>
          <p className="text-3xl font-bold text-blue-600">
            {totalDebt > 0 ? ((totalRecovered / totalDebt) * 100).toFixed(1) : "0"}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total cobrado</p>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(totalRecovered)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Mensajes enviados</p>
          <p className="text-3xl font-bold text-purple-600">
            {messages.filter((m) => m.status !== "FAILED").length.toLocaleString("es-AR")}
          </p>
        </div>
      </div>

      <AnalyticsCharts
        statusDist={Object.entries(statusDist).map(([status, data]) => ({ status, ...data }))}
        recoveryByMonth={recoveryByMonth}
        channelStats={channelStats}
      />
    </div>
  );
}
