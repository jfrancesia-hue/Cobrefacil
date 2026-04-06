import { getCompanyOrRedirect } from "@/lib/get-company";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import RecoveryChart from "@/components/dashboard/recovery-chart";
import {
  TrendingUp,
  DollarSign,
  Users,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

export default async function DashboardPage() {
  const { company } = await getCompanyOrRedirect();

  const [debts, messages, payments, debtors] = await Promise.all([
    prisma.debt.findMany({
      where: { companyId: company.id },
      select: {
        id: true,
        amount: true,
        paidAmount: true,
        status: true,
        dueDate: true,
        paidAt: true,
        concept: true,
        debtor: { select: { name: true } },
      },
    }),
    prisma.collectionMessage.findMany({
      where: { companyId: company.id },
      select: { status: true, channel: true, createdAt: true },
    }),
    prisma.payment.findMany({
      where: { companyId: company.id, status: "APPROVED" },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.debtor.count({ where: { companyId: company.id } }),
  ]);

  // Métricas
  const totalDebt = debts.reduce((s, d) => s + Number(d.amount), 0);
  const totalRecovered = debts
    .filter((d) => d.status === "PAID" || d.status === "PARTIAL")
    .reduce((s, d) => s + Number(d.paidAmount), 0);
  const recoveryRate = totalDebt > 0 ? (totalRecovered / totalDebt) * 100 : 0;

  const overdueDebts = debts.filter((d) => d.status === "OVERDUE");
  const totalOverdue = overdueDebts.reduce((s, d) => s + Number(d.amount), 0);

  const totalMessages = messages.length;
  const sentMessages = messages.filter((m) => m.status !== "FAILED" && m.status !== "PENDING").length;
  const readMessages = messages.filter((m) => m.status === "READ").length;
  const readRate = sentMessages > 0 ? (readMessages / sentMessages) * 100 : 0;

  // Datos para el gráfico: recupero por mes (últimos 6 meses)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const monthlyPayments = payments
    .filter((p) => p.createdAt >= sixMonthsAgo)
    .reduce<Record<string, number>>((acc, p) => {
      const month = new Date(p.createdAt).toLocaleString("es-AR", {
        month: "short",
        year: "2-digit",
      });
      acc[month] = (acc[month] ?? 0) + Number(p.amount);
      return acc;
    }, {});

  const chartData = Object.entries(monthlyPayments)
    .map(([month, amount]) => ({ month, amount }))
    .slice(-6);

  // Últimas deudas vencidas
  const recentOverdue = overdueDebts.slice(0, 5);

  const stats = [
    {
      label: "Monto total a cobrar",
      value: formatCurrency(totalDebt),
      icon: DollarSign,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Recuperado",
      value: formatCurrency(totalRecovered),
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
      sub: `Tasa: ${recoveryRate.toFixed(1)}%`,
    },
    {
      label: "Vencidas sin pagar",
      value: formatCurrency(totalOverdue),
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      sub: `${overdueDebts.length} deudas`,
    },
    {
      label: "Mensajes enviados",
      value: sentMessages.toLocaleString("es-AR"),
      icon: MessageSquare,
      color: "text-purple-600",
      bg: "bg-purple-50",
      sub: `${readRate.toFixed(1)}% leídos`,
    },
    {
      label: "Deudores activos",
      value: debtors.toLocaleString("es-AR"),
      icon: Users,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de recupero</h1>
        <p className="text-gray-500 text-sm mt-1">{company.name}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
            {sub && <p className={`text-xs font-medium mt-0.5 ${color}`}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* Tasa de recupero prominente */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">TASA DE RECUPERO</p>
            <p className="text-5xl font-bold">{recoveryRate.toFixed(1)}%</p>
            <p className="text-blue-200 text-sm mt-2">
              {formatCurrency(totalRecovered)} recuperados de {formatCurrency(totalDebt)} totales
            </p>
          </div>
          <div className="text-right">
            <div className="w-24 h-24 relative">
              <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeDasharray={`${recoveryRate * 0.942} 94.2`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de recupero mensual */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recupero mensual</h3>
          {chartData.length > 0 ? (
            <RecoveryChart data={chartData} />
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
              Sin datos de pagos aún
            </div>
          )}
        </div>

        {/* Deudas vencidas recientes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Vencidas sin pagar</h3>
            <a href="/debts?status=OVERDUE" className="text-xs text-blue-600 hover:underline">
              Ver todas
            </a>
          </div>
          {recentOverdue.length === 0 ? (
            <div className="h-40 flex items-center justify-center">
              <div className="text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Sin deudas vencidas</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOverdue.map((debt) => (
                <div key={debt.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{debt.debtor.name}</p>
                    <p className="text-xs text-gray-500">{debt.concept}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{formatCurrency(debt.amount)}</p>
                    <p className="text-xs text-gray-400">{formatDate(debt.dueDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estado de mensajes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Estado de mensajes</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Enviados", count: sentMessages, color: "bg-blue-500" },
              { label: "Entregados", count: messages.filter((m) => m.status === "DELIVERED" || m.status === "READ").length, color: "bg-indigo-500" },
              { label: "Leídos", count: readMessages, color: "bg-green-500" },
              { label: "Fallidos", count: messages.filter((m) => m.status === "FAILED").length, color: "bg-red-500" },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                <div>
                  <p className="text-lg font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Canal breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Mensajes por canal</h3>
          <div className="space-y-3">
            {(["WHATSAPP", "EMAIL", "SMS"] as const).map((channel) => {
              const count = messages.filter((m) => m.channel === channel).length;
              const pct = totalMessages > 0 ? (count / totalMessages) * 100 : 0;
              return (
                <div key={channel}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{channel}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div
                      className="h-2 bg-blue-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
