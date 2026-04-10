"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Megaphone,
  Play,
  Users,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SCHEDULED: "bg-yellow-100 text-yellow-700",
  EXECUTING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  SCHEDULED: "Programada",
  EXECUTING: "Ejecutando",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

interface Campaign {
  id: string;
  name: string;
  status: string;
  channel: string;
  messageTemplate: string;
  useAI: boolean;
  totalTargeted: number;
  totalSent: number;
  totalDelivered: number;
  totalPaid: number;
  amountRecovered: number | string;
  executedAt: string | null;
  createdAt: string;
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    fetch(`/api/campaigns/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.campaign) setCampaign(data.campaign);
        else toast.error("Campaña no encontrada");
        setLoading(false);
      })
      .catch(() => {
        toast.error("Error al cargar campaña");
        setLoading(false);
      });
  }, [params.id]);

  async function handleExecute() {
    if (!campaign) return;
    setExecuting(true);
    const res = await fetch(`/api/campaigns/${params.id}/execute`, {
      method: "POST",
    });
    if (res.ok) {
      toast.success("Campaña ejecutada correctamente");
      router.refresh();
      const data = await res.json();
      setCampaign((prev) => (prev ? { ...prev, ...data.campaign } : prev));
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Error al ejecutar campaña");
    }
    setExecuting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-sm">Cargando campaña...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Campaña no encontrada</p>
        <Link href="/campaigns" className="text-blue-600 hover:underline text-sm mt-2 block">
          Volver a campañas
        </Link>
      </div>
    );
  }

  const conversionRate =
    campaign.totalSent > 0
      ? ((campaign.totalPaid / campaign.totalSent) * 100).toFixed(1)
      : "0";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/campaigns" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                statusColors[campaign.status]
              }`}
            >
              {statusLabels[campaign.status]}
            </span>
          </div>
          <p className="text-gray-500 text-sm">
            {campaign.channel} ·{" "}
            {campaign.executedAt
              ? `Ejecutada el ${formatDate(campaign.executedAt)}`
              : `Creada el ${formatDate(campaign.createdAt)}`}
          </p>
        </div>
        {campaign.status === "DRAFT" && (
          <button
            onClick={handleExecute}
            disabled={executing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            {executing ? "Ejecutando..." : "Ejecutar campaña"}
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-gray-500">Destinatarios</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{campaign.totalTargeted}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-indigo-500" />
            <p className="text-xs text-gray-500">Enviados</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{campaign.totalSent}</p>
          <p className="text-xs text-gray-400">{campaign.totalDelivered} entregados</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <p className="text-xs text-gray-500">Pagaron</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{campaign.totalPaid}</p>
          <p className="text-xs text-green-600">{conversionRate}% conversión</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="w-4 h-4 text-purple-500" />
            <p className="text-xs text-gray-500">Recuperado</p>
          </div>
          <p className="text-xl font-bold text-green-600">
            {formatCurrency(campaign.amountRecovered)}
          </p>
        </div>
      </div>

      {/* Mensaje */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Mensaje de campaña</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
            {campaign.messageTemplate}
          </p>
        </div>
        {campaign.useAI && (
          <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
            ✦ Personalizado con IA para cada deudor
          </p>
        )}
      </div>

      {campaign.status === "DRAFT" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800 font-medium mb-1">Campaña en borrador</p>
          <p className="text-xs text-amber-700">
            Al ejecutarla, se enviarán mensajes a los deudores que cumplan los filtros configurados.
            Esta acción no se puede deshacer.
          </p>
        </div>
      )}
    </div>
  );
}
