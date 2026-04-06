"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    channel: "WHATSAPP",
    messageTemplate: "",
    useAI: false,
    minDaysOverdue: 0,
    maxDaysOverdue: 90,
    minAmount: "",
    maxAmount: "",
  });

  function update(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        channel: form.channel,
        messageTemplate: form.messageTemplate,
        useAI: form.useAI,
        filters: {
          minDaysOverdue: form.minDaysOverdue,
          maxDaysOverdue: form.maxDaysOverdue,
          minAmount: form.minAmount ? parseFloat(form.minAmount) : undefined,
          maxAmount: form.maxAmount ? parseFloat(form.maxAmount) : undefined,
        },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success("Campaña creada");
      router.push(`/campaigns/${data.campaign.id}`);
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Error");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/campaigns" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nueva campaña</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Configuración</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Campaña fin de mes"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Canal</label>
            <select
              value={form.channel}
              onChange={(e) => update("channel", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Segmento de deudores</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mínimo días vencida</label>
              <input
                type="number"
                min={0}
                value={form.minDaysOverdue}
                onChange={(e) => update("minDaysOverdue", parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Máximo días vencida</label>
              <input
                type="number"
                min={0}
                value={form.maxDaysOverdue}
                onChange={(e) => update("maxDaysOverdue", parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto mínimo ($)</label>
              <input
                type="number"
                value={form.minAmount}
                onChange={(e) => update("minAmount", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Sin límite"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto máximo ($)</label>
              <input
                type="number"
                value={form.maxAmount}
                onChange={(e) => update("maxAmount", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Sin límite"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Mensaje</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template{" "}
              <span className="text-gray-400 font-normal text-xs">
                Variables: {"{nombre} {monto} {concepto} {link_pago} {empresa} {dias_atraso}"}
              </span>
            </label>
            <textarea
              value={form.messageTemplate}
              onChange={(e) => update("messageTemplate", e.target.value)}
              required
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Hola {nombre}, te contactamos desde {empresa}..."
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.useAI}
              onChange={(e) => update("useAI", e.target.checked)}
              className="rounded"
            />
            <Sparkles className="w-4 h-4 text-purple-500" />
            Personalizar con IA según perfil de cada deudor
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
        >
          {loading ? "Creando..." : "Crear campaña"}
        </button>
      </form>
    </div>
  );
}
