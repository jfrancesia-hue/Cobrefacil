"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

export default function MarkPaidButton({ debtId }: { debtId: string }) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  async function handleMarkPaid() {
    setLoading(true);
    const res = await fetch(`/api/debts/${debtId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID", paymentMethod: "CASH" }),
    });
    if (res.ok) {
      toast.success("Deuda marcada como pagada");
      router.refresh();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Error al marcar como pagada");
    }
    setLoading(false);
    setShowConfirm(false);
  }

  if (showConfirm) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleMarkPaid}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          {loading ? "Guardando..." : "Confirmar"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="flex items-center gap-1.5 px-3 py-1.5 border border-green-300 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors"
    >
      <CheckCircle className="w-4 h-4" />
      Marcar pagada
    </button>
  );
}
