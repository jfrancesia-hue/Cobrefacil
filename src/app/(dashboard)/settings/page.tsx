"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface CompanySettings {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  industry: string;
  currency: string;
  timezone: string;
  defaultGraceDays: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    website: "",
    industry: "",
    currency: "ARS",
    timezone: "America/Argentina/Buenos_Aires",
    defaultGraceDays: 5,
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetch("/api/company")
      .then((r) => r.json())
      .then((data) => {
        if (data.company) {
          setSettings({
            name: data.company.name ?? "",
            email: data.company.email ?? "",
            phone: data.company.phone ?? "",
            whatsapp: data.company.whatsapp ?? "",
            website: data.company.website ?? "",
            industry: data.company.industry ?? "",
            currency: data.company.currency ?? "ARS",
            timezone: data.company.timezone ?? "America/Argentina/Buenos_Aires",
            defaultGraceDays: data.company.defaultGraceDays ?? 5,
          });
        }
        setFetching(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/company", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      toast.success("Configuración guardada");
    } else {
      toast.error("Error al guardar");
    }
    setLoading(false);
  }

  if (fetching) return <div className="text-gray-500">Cargando...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configuración de empresa</h1>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de empresa *</label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => setSettings((s) => ({ ...s, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              type="tel"
              value={settings.phone}
              onChange={(e) => setSettings((s) => ({ ...s, phone: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
            <input
              type="text"
              value={settings.whatsapp}
              onChange={(e) => setSettings((s) => ({ ...s, whatsapp: e.target.value }))}
              placeholder="+5491112345678"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sitio web</label>
            <input
              type="url"
              value={settings.website}
              onChange={(e) => setSettings((s) => ({ ...s, website: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industria</label>
            <select
              value={settings.industry}
              onChange={(e) => setSettings((s) => ({ ...s, industry: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar...</option>
              <option value="fintech">Fintech / Préstamos</option>
              <option value="inmobiliaria">Inmobiliaria</option>
              <option value="salud">Salud</option>
              <option value="educacion">Educación</option>
              <option value="servicios">Servicios</option>
              <option value="comercio">Comercio</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
            <select
              value={settings.currency}
              onChange={(e) => setSettings((s) => ({ ...s, currency: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ARS">ARS — Peso argentino</option>
              <option value="USD">USD — Dólar</option>
              <option value="CLP">CLP — Peso chileno</option>
              <option value="COP">COP — Peso colombiano</option>
              <option value="MXN">MXN — Peso mexicano</option>
              <option value="BRL">BRL — Real brasileño</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Días de gracia por defecto</label>
            <input
              type="number"
              min={0}
              max={30}
              value={settings.defaultGraceDays}
              onChange={(e) => setSettings((s) => ({ ...s, defaultGraceDays: parseInt(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
