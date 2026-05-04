"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, LogIn, ShieldCheck, Zap } from "lucide-react";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo-auth";

const demoEnabled =
  process.env.NEXT_PUBLIC_ENABLE_DEMO === "true" ||
  process.env.NODE_ENV !== "production";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function enterDemo() {
    setLoading(true);
    const res = await fetch("/api/demo/login", { method: "POST" });
    if (!res.ok) {
      toast.error("No se pudo iniciar el modo demo");
      setLoading(false);
      return;
    }
    toast.success("Ingresando en modo demo");
    router.push("/dashboard");
    router.refresh();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (
      demoEnabled &&
      email.trim().toLowerCase() === DEMO_EMAIL &&
      password === DEMO_PASSWORD
    ) {
      await enterDemo();
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <main className="grid min-h-screen bg-slate-100 text-slate-950 lg:grid-cols-[1fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 text-white lg:block">
        <Image
          src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1400&q=85"
          alt="Persona revisando pagos en una notebook"
          fill
          priority
          sizes="50vw"
          className="object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950/78 to-emerald-950/50" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 text-slate-950">
              <Zap className="h-4 w-4" />
            </span>
            CobrarFácil
          </Link>

          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Acceso seguro al panel
            </div>
            <h1 className="max-w-xl text-5xl font-bold leading-tight">
              Volvé a tu operación de cobranza.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
              Revisá vencidas, mensajes, pagos y conversaciones desde un panel preparado para trabajo diario.
            </p>
          </div>

          <div className="relative h-28 w-56" style={{ perspective: "720px" }}>
            <div
              className="absolute inset-0 rounded-lg border border-white/15 bg-white/10 shadow-2xl backdrop-blur"
              style={{ transform: "rotateX(58deg) rotateZ(-32deg)" }}
            />
            <div
              className="absolute inset-x-8 inset-y-5 rounded-lg bg-emerald-300/30"
              style={{ transform: "rotateX(58deg) rotateZ(-32deg) translateZ(30px)" }}
            />
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Inicio
          </Link>

          <div className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
            <div className="mb-7">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-emerald-300">
                <Zap className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold">Ingresar</h2>
              <p className="mt-2 text-sm text-slate-500">
                Entrá con tu cuenta para continuar gestionando cobranzas.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {demoEnabled && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                  <p className="font-bold">Acceso demo</p>
                  <p className="mt-1">
                    Usuario: <span className="font-semibold">{DEMO_EMAIL}</span>
                  </p>
                  <p>
                    Contraseña: <span className="font-semibold">{DEMO_PASSWORD}</span>
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="tu@empresa.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                <LogIn className="h-4 w-4" />
                {loading ? "Ingresando..." : "Ingresar al panel"}
              </button>
              {demoEnabled && (
                <button
                  type="button"
                  onClick={enterDemo}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Entrar como demo
                </button>
              )}
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              ¿No tenés cuenta?{" "}
              <Link href="/register" className="font-semibold text-emerald-700 hover:text-emerald-800">
                Crear cuenta
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
