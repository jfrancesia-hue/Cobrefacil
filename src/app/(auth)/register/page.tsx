"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Sparkles, UserPlus, Zap } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Cuenta creada. Revisá tu email para confirmar.");
      router.push("/login");
    }
    setLoading(false);
  }

  return (
    <main className="grid min-h-screen bg-slate-100 text-slate-950 lg:grid-cols-[0.95fr_1fr]">
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
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400 text-slate-950">
                <UserPlus className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold">Crear cuenta</h1>
              <p className="mt-2 text-sm text-slate-500">
                Prepará tu empresa para cobrar con seguimiento, pagos y mensajes.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Juan Pérez"
                />
              </div>
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
                  minLength={6}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {loading ? "Creando cuenta..." : "Crear cuenta gratis"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              ¿Ya tenés cuenta?{" "}
              <Link href="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
                Ingresá
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="relative hidden overflow-hidden bg-slate-950 text-white lg:block">
        <Image
          src="https://images.unsplash.com/photo-1554224154-22dec7ec8818?auto=format&fit=crop&w=1400&q=85"
          alt="Planilla financiera y tarjetas de pago"
          fill
          priority
          sizes="50vw"
          className="object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-bl from-slate-950 via-slate-950/78 to-emerald-950/50" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 text-slate-950">
              <Zap className="h-4 w-4" />
            </span>
            CobrarFácil
          </Link>
          <div>
            <h2 className="max-w-xl text-5xl font-bold leading-tight">
              Una operación de cobro más ordenada desde el primer día.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
              Cargá deudores, generá links de pago y activá secuencias por canal.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["Pagos", "Mensajes", "IA"].map((item) => (
              <div key={item} className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-sm font-bold">{item}</p>
                <p className="mt-1 text-xs text-slate-400">listo</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
