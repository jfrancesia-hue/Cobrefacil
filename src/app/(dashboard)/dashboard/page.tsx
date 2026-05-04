import { getCompanyOrRedirect } from "@/lib/get-company";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import RecoveryChart from "@/components/dashboard/recovery-chart";
import Link from "next/link";
import Image from "next/image";
import { DEMO_COMPANY_ID, demoDashboardData } from "@/lib/demo-data";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle,
  DollarSign,
  Megaphone,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

const channelStyles = {
  WHATSAPP: {
    label: "WhatsApp",
    bar: "bg-emerald-400",
    dot: "bg-emerald-400",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  EMAIL: {
    label: "Email",
    bar: "bg-indigo-400",
    dot: "bg-indigo-400",
    text: "text-indigo-700",
    bg: "bg-indigo-50",
  },
  SMS: {
    label: "SMS",
    bar: "bg-amber-400",
    dot: "bg-amber-400",
    text: "text-amber-700",
    bg: "bg-amber-50",
  },
} as const;

function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export default async function DashboardPage() {
  const { company } = await getCompanyOrRedirect();

  const [debts, messages, payments, debtors] =
    company.id === DEMO_COMPANY_ID
      ? [
          demoDashboardData.debts,
          demoDashboardData.messages,
          demoDashboardData.payments,
          demoDashboardData.debtors,
        ]
      : await Promise.all([
          prisma.debt.findMany({
            where: { companyId: company.id },
            select: {
              id: true,
              amount: true,
              paidAmount: true,
              status: true,
              dueDate: true,
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

  const totalDebt = debts.reduce((sum, debt) => sum + Number(debt.amount), 0);
  const totalRecovered = debts
    .filter((debt) => debt.status === "PAID" || debt.status === "PARTIAL")
    .reduce((sum, debt) => sum + Number(debt.paidAmount), 0);
  const recoveryRate = totalDebt > 0 ? (totalRecovered / totalDebt) * 100 : 0;

  const overdueDebts = debts.filter((debt) => debt.status === "OVERDUE");
  const pendingDebts = debts.filter(
    (debt) => debt.status === "PENDING" || debt.status === "DUE"
  );
  const totalOverdue = overdueDebts.reduce(
    (sum, debt) => sum + Number(debt.amount),
    0
  );

  const totalMessages = messages.length;
  const sentMessages = messages.filter(
    (message) => message.status !== "FAILED" && message.status !== "PENDING"
  ).length;
  const readMessages = messages.filter((message) => message.status === "READ").length;
  const failedMessages = messages.filter((message) => message.status === "FAILED").length;
  const readRate = percent(readMessages, sentMessages);
  const failedRate = percent(failedMessages, totalMessages);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const monthlyPayments = payments
    .filter((payment) => payment.createdAt >= sixMonthsAgo)
    .reduce<Record<string, number>>((acc, payment) => {
      const month = new Date(payment.createdAt).toLocaleString("es-AR", {
        month: "short",
        year: "2-digit",
      });
      acc[month] = (acc[month] ?? 0) + Number(payment.amount);
      return acc;
    }, {});

  const chartData = Object.entries(monthlyPayments)
    .map(([month, amount]) => ({ month, amount }))
    .slice(-6);

  const recentOverdue = overdueDebts.slice(0, 5);
  const strongestChannel = (["WHATSAPP", "EMAIL", "SMS"] as const)
    .map((channel) => ({
      channel,
      count: messages.filter((message) => message.channel === channel).length,
      read: messages.filter(
        (message) => message.channel === channel && message.status === "READ"
      ).length,
    }))
    .sort((a, b) => percent(b.read, b.count) - percent(a.read, a.count))[0];

  const stats = [
    {
      label: "Total a cobrar",
      value: formatCurrency(totalDebt),
      detail: `${debts.length} deudas activas`,
      icon: DollarSign,
      color: "text-sky-700",
      bg: "bg-sky-50",
      ring: "border-sky-200",
    },
    {
      label: "Recuperado",
      value: formatCurrency(totalRecovered),
      detail: `${recoveryRate.toFixed(1)}% de recupero`,
      icon: TrendingUp,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      ring: "border-emerald-200",
    },
    {
      label: "Vencido",
      value: formatCurrency(totalOverdue),
      detail: `${overdueDebts.length} requieren acción`,
      icon: AlertTriangle,
      color: "text-rose-700",
      bg: "bg-rose-50",
      ring: "border-rose-200",
    },
    {
      label: "Mensajes",
      value: sentMessages.toLocaleString("es-AR"),
      detail: `${readRate}% leídos`,
      icon: MessageSquare,
      color: "text-indigo-700",
      bg: "bg-indigo-50",
      ring: "border-indigo-200",
    },
    {
      label: "Deudores",
      value: debtors.toLocaleString("es-AR"),
      detail: `${pendingDebts.length} próximos`,
      icon: Users,
      color: "text-amber-700",
      bg: "bg-amber-50",
      ring: "border-amber-200",
    },
  ];

  const actionCards = [
    {
      title: "Priorizar vencidas",
      description: `${overdueDebts.length} deudas listas para una acción hoy.`,
      icon: Target,
      href: "/debts?status=OVERDUE",
      color: "bg-rose-500",
    },
    {
      title: "Enviar campaña",
      description: `Canal recomendado: ${channelStyles[strongestChannel.channel].label}.`,
      icon: Megaphone,
      href: "/campaigns/new",
      color: "bg-indigo-500",
    },
    {
      title: "Revisar pagos",
      description: `${formatCurrency(totalRecovered)} conciliados recientemente.`,
      icon: WalletCards,
      href: "/payments",
      color: "bg-emerald-500",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-y-0 right-0 hidden w-[42%] overflow-hidden lg:block">
          <Image
            src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80"
            alt="Mesa de trabajo con recibos y operaciones de pago"
            fill
            priority
            sizes="42vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-slate-950/70 via-slate-950/35 to-white" />
        </div>

        <div className="relative grid min-h-72 grid-cols-1 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-6 md:p-8">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Operación activa
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                {company.name}
              </span>
            </div>

            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Panel de recupero
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight text-slate-950 md:text-4xl">
              Priorizá cobros, medí respuesta y accioná antes de que se acumulen vencidas.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Una vista operativa para decidir qué contactar, qué cobrar y qué escalar.
            </p>

            <div className="mt-7 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ["Recuperado", formatCurrency(totalRecovered), "text-emerald-700"],
                ["Vencido", formatCurrency(totalOverdue), "text-rose-700"],
                ["Lectura", `${readRate}%`, "text-indigo-700"],
              ].map(([label, value, color]) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden items-center justify-center p-8 lg:flex">
            <div className="relative h-48 w-48" style={{ perspective: "900px" }}>
              <div
                className="absolute inset-4 rounded-lg border border-white/20 bg-white/15 shadow-2xl backdrop-blur"
                style={{ transform: "rotateX(58deg) rotateZ(-34deg)" }}
              />
              <div
                className="absolute inset-10 rounded-lg border border-emerald-200/50 bg-emerald-300/25 shadow-2xl backdrop-blur"
                style={{ transform: "rotateX(58deg) rotateZ(-34deg) translateZ(34px)" }}
              />
              <div className="absolute left-16 top-10 flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-white text-emerald-700 shadow-xl">
                <WalletCards className="h-7 w-7" />
              </div>
              <div className="absolute bottom-3 right-0 rounded-lg border border-white/20 bg-slate-950/85 px-3 py-2 text-xs font-semibold text-white shadow-xl">
                +{recoveryRate.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(({ label, value, detail, icon: Icon, color, bg, ring }) => (
          <article key={label} className={`rounded-lg border ${ring} bg-white p-4 shadow-sm`}>
            <div className="mb-4 flex items-center justify-between">
              <div className={`rounded-lg ${bg} p-2 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-slate-300" />
            </div>
            <p className="text-2xl font-bold leading-tight text-slate-950">{value}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
            <p className={`mt-2 text-xs font-semibold ${color}`}>{detail}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-950">Recupero mensual</h2>
              <p className="mt-1 text-xs text-slate-500">Últimos pagos aprobados por mes.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {recoveryRate.toFixed(1)}% recupero
            </span>
          </div>
          {chartData.length > 0 ? (
            <RecoveryChart data={chartData} />
          ) : (
            <div className="flex h-52 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-400">
              Sin datos de pagos aún
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">Acciones sugeridas</h2>
              <p className="mt-1 text-xs text-slate-400">Ordenadas por impacto operativo.</p>
            </div>
            <Sparkles className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="space-y-3">
            {actionCards.map(({ title, description, icon: Icon, href, color }) => (
              <Link
                key={title}
                href={href}
                className="group flex items-start gap-3 rounded-lg border border-white/10 bg-white/10 p-3 transition-colors hover:bg-white/15"
              >
                <span className={`mt-0.5 rounded-lg ${color} p-2 text-white`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-300">{description}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 text-slate-500 transition-colors group-hover:text-white" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-950">Canales</h2>
              <p className="mt-1 text-xs text-slate-500">Volumen y lectura por canal.</p>
            </div>
            <Send className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="space-y-4">
            {(["WHATSAPP", "EMAIL", "SMS"] as const).map((channel) => {
              const style = channelStyles[channel];
              const count = messages.filter((message) => message.channel === channel).length;
              const read = messages.filter(
                (message) => message.channel === channel && message.status === "READ"
              ).length;
              const channelReadRate = percent(read, count);
              return (
                <div key={channel}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-semibold text-slate-700">
                      <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                      {style.label}
                    </span>
                    <span className={`rounded-full ${style.bg} px-2 py-0.5 text-xs font-bold ${style.text}`}>
                      {channelReadRate}% leídos
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full ${style.bar}`} style={{ width: `${percent(count, totalMessages)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{count} mensajes enviados</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-950">Vencidas sin pagar</h2>
              <p className="mt-1 text-xs text-slate-500">Casos que necesitan contacto o escalamiento.</p>
            </div>
            <Link
              href="/debts?status=OVERDUE"
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              Ver todas
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentOverdue.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-lg bg-emerald-50">
              <div className="text-center">
                <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                <p className="text-sm font-semibold text-emerald-800">Sin deudas vencidas</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentOverdue.map((debt) => (
                <div key={debt.id} className="grid grid-cols-[1fr_auto] gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">{debt.debtor.name}</p>
                    <p className="truncate text-xs text-slate-500">{debt.concept}</p>
                    <p className="mt-1 text-xs text-slate-400">Venció {formatDate(debt.dueDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-rose-700">{formatCurrency(debt.amount)}</p>
                    <span className="mt-1 inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">
                      vencida
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <CheckCircle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-950">Estado de mensajes</h2>
              <p className="text-xs text-slate-500">{failedRate}% fallidos</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Enviados", sentMessages, "bg-sky-500"],
              ["Entregados", messages.filter((message) => message.status === "DELIVERED" || message.status === "READ").length, "bg-indigo-500"],
              ["Leídos", readMessages, "bg-emerald-500"],
              ["Fallidos", failedMessages, "bg-rose-500"],
            ].map(([label, count, color]) => (
              <div key={label} className="rounded-lg bg-slate-50 p-3">
                <div className={`mb-2 h-2 w-8 rounded-full ${color}`} />
                <p className="text-lg font-bold text-slate-950">{count}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <span className="rounded-lg bg-indigo-50 p-2 text-indigo-700">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-950">Lectura operativa</h2>
              <p className="text-xs text-slate-500">Resumen para decidir el próximo movimiento.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-700">Mejor señal</p>
              <p className="mt-2 text-sm font-bold text-slate-950">
                {channelStyles[strongestChannel.channel].label} concentra la mejor respuesta.
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-4">
              <p className="text-xs font-semibold text-amber-700">Riesgo</p>
              <p className="mt-2 text-sm font-bold text-slate-950">
                {overdueDebts.length} cuentas vencidas necesitan gestión prioritaria.
              </p>
            </div>
            <div className="rounded-lg bg-sky-50 p-4">
              <p className="text-xs font-semibold text-sky-700">Caja</p>
              <p className="mt-2 text-sm font-bold text-slate-950">
                {formatCurrency(totalRecovered)} ya recuperados en el período.
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
