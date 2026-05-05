import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
  Zap,
} from "lucide-react";

const lanes = [
  { label: "Vencidas", value: "$2.1M", color: "bg-rose-400" },
  { label: "En gestión", value: "$4.8M", color: "bg-indigo-400" },
  { label: "Recuperado", value: "$8.4M", color: "bg-emerald-300" },
];

const features = [
  {
    title: "Cobranza multicanal",
    description: "WhatsApp, email y SMS con historial por deudor, deuda y campaña.",
    icon: MessageSquare,
  },
  {
    title: "Pagos conectados",
    description: "Links firmados, MercadoPago y conciliación automática del estado.",
    icon: CreditCard,
  },
  {
    title: "IA operativa",
    description: "Mensajes personalizados y agente para responder sin perder tono humano.",
    icon: Bot,
  },
];

const steps = [
  "Importá deudores",
  "Activá secuencias",
  "Cobrale por link",
  "Medí recupero",
];

function ProductPreview() {
  return (
    <div className="relative mx-auto h-[520px] w-full max-w-[620px]" style={{ perspective: "1200px" }}>
      <div
        className="absolute inset-x-0 top-12 rounded-lg border border-white/15 bg-slate-950/70 p-4 shadow-2xl backdrop-blur-xl"
        style={{ transform: "rotateX(51deg) rotateZ(-28deg)" }}
      >
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-300 text-slate-950">
              <Zap className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-white">Panel de recupero</p>
              <p className="text-xs text-slate-400">Demo Fintech S.A.</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-300/15 px-3 py-1 text-xs font-semibold text-emerald-200">
            activo
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {lanes.map((lane) => (
            <div key={lane.label} className="rounded-lg border border-white/10 bg-white/10 p-3">
              <div className={`mb-3 h-1.5 w-10 rounded-full ${lane.color}`} />
              <p className="text-xs text-slate-300">{lane.label}</p>
              <p className="mt-1 text-lg font-bold text-white">{lane.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-[1.1fr_0.9fr] gap-3">
          <div className="rounded-lg border border-white/10 bg-white/10 p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-300">Recupero mensual</p>
              <TrendingUp className="h-4 w-4 text-emerald-300" />
            </div>
            <div className="flex h-28 items-end gap-2">
              {[42, 58, 38, 78, 64, 92].map((height, index) => (
                <div key={index} className="flex-1 rounded-t bg-emerald-300/25">
                  <div className="rounded-t bg-emerald-300" style={{ height: `${height}%` }} />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/10 p-4">
            <p className="mb-3 text-xs font-semibold text-slate-300">Canales</p>
            {[
              ["WhatsApp", 72],
              ["Email", 54],
              ["SMS", 31],
            ].map(([label, value]) => (
              <div key={label} className="mb-3">
                <div className="mb-1 flex justify-between text-xs text-slate-300">
                  <span>{label}</span>
                  <span>{value}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10">
                  <div className="h-1.5 rounded-full bg-indigo-300" style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute left-0 top-6 rounded-lg border border-white/15 bg-white/95 p-4 text-slate-950 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold">Pago confirmado</p>
            <p className="text-xs text-slate-500">Factura #1567</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 right-4 rounded-lg border border-white/15 bg-slate-950/85 p-4 shadow-2xl backdrop-blur">
        <div className="mb-3 flex items-center gap-2 text-emerald-200">
          <Bot className="h-4 w-4" />
          <p className="text-xs font-bold">Agente IA</p>
        </div>
        <p className="max-w-48 text-sm leading-6 text-white">
          Respuesta lista para enviar con tono profesional.
        </p>
      </div>

      <div className="absolute bottom-20 left-8 flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-emerald-300 text-slate-950 shadow-2xl">
        <WalletCards className="h-7 w-7" />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative min-h-[92svh] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1554224154-22dec7ec8818?auto=format&fit=crop&w=1900&q=85"
          alt="Planilla financiera, tarjetas y operación de pagos"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-42"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/88 to-slate-950/45" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-300 text-slate-950">
              <Zap className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold tracking-wide">CobrarFácil</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:text-white"
            >
              Ingresar
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-300"
            >
              Crear cuenta
            </Link>
          </nav>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-6 pb-16 pt-10 lg:grid-cols-[0.9fr_1.1fr] lg:pt-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Cobranzas automatizadas con pagos e IA
            </div>
            <h1 className="max-w-3xl text-5xl font-bold leading-tight md:text-7xl">
              CobrarFácil
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-200">
              Un panel operativo para seguir deuda por deuda, activar mensajes inteligentes y cobrar con links seguros.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-300 px-5 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-200"
              >
                Empezar ahora
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                Ver mi panel
              </Link>
            </div>

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              {lanes.map((metric) => (
                <div key={metric.label} className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xl font-bold text-white">{metric.value}</p>
                  <p className="mt-1 text-xs text-slate-300">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>

          <ProductPreview />
        </div>
      </section>

      <section className="bg-slate-100 px-6 py-14 text-slate-950">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Flujo de trabajo
            </p>
            <h2 className="mt-2 max-w-lg text-3xl font-bold leading-tight">
              De una deuda vencida a un pago confirmado, sin perder contexto.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {features.map(({ title, description, icon: Icon }) => (
              <article key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <Icon className="mb-4 h-5 w-5 text-emerald-700" />
                <h3 className="font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
            <article className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
              <Sparkles className="mb-4 h-5 w-5 text-emerald-300" />
              <h3 className="font-bold">Listo para producción</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Auth, webhooks, cron seguro, Prisma 7 y build validado.
              </p>
            </article>
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-7xl gap-3 md:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-800">
                {index + 1}
              </p>
              <p className="font-bold">{step}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 overflow-hidden rounded-lg bg-slate-950 text-white shadow-xl">
          <div className="grid max-w-7xl grid-cols-1 items-center gap-6 px-6 py-8 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-semibold text-emerald-300">Siguiente paso</p>
              <h2 className="mt-2 text-2xl font-bold">Entrá al panel y mirá el dashboard nuevo.</h2>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-300"
            >
              Ingresar
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
