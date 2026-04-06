"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Debtor {
  id: string;
  name: string;
  email?: string;
}

export default function NewDebtPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedDebtorId = searchParams.get("debtorId");

  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    debtorId: preselectedDebtorId ?? "",
    concept: "",
    amount: "",
    dueDate: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/debtors")
      .then((r) => r.json())
      .then((d) => setDebtors(d.debtors ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.debtorId) { toast.error("Seleccioná un deudor"); return; }
    setLoading(true);
    const res = await fetch("/api/debts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: parseFloat(form.amount),
      }),
    });
    if (res.ok) {
      toast.success("Deuda creada");
      router.push("/debts");
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Error al crear");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/debts" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nueva deuda</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deudor *</label>
          <select
            value={form.debtorId}
            onChange={(e) => setForm((f) => ({ ...f, debtorId: e.target.value }))}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar deudor...</option>
            {debtors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.email ? `(${d.email})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
          <input
            type="text"
            value={form.concept}
            onChange={(e) => setForm((f) => ({ ...f, concept: e.target.value }))}
            required
            placeholder="Cuota Marzo 2026, Factura #1234..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
              placeholder="15000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vencimiento *</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
          >
            {loading ? "Creando..." : "Crear deuda"}
          </button>
        </div>
      </form>
    </div>
  );
}
