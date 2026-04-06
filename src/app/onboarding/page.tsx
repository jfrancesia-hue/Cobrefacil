"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function OnboardingPage() {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, industry }),
    });
    if (res.ok) {
      toast.success("¡Empresa creada! Bienvenido a CobrarFácil.");
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Error al crear empresa");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Configurá tu empresa</h1>
        <p className="text-gray-500 mb-6">Un solo paso para empezar a cobrar.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la empresa *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mi Empresa S.A."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Industria
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar...</option>
              <option value="fintech">Fintech / Préstamos</option>
              <option value="inmobiliaria">Inmobiliaria / Alquileres</option>
              <option value="salud">Salud / Medicina</option>
              <option value="educacion">Educación</option>
              <option value="servicios">Servicios profesionales</option>
              <option value="comercio">Comercio / Retail</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {loading ? "Creando..." : "Crear empresa y continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
