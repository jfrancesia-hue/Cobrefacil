import { getCompanyOrRedirect } from "@/lib/get-company";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Megaphone } from "lucide-react";

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

export default async function CampaignsPage() {
  const { company } = await getCompanyOrRedirect();

  const campaigns = await prisma.campaign.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campañas</h1>
          <p className="text-gray-500 text-sm mt-1">Envíos masivos one-shot a segmentos de deudores</p>
        </div>
        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Nueva campaña
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sin campañas</h3>
          <p className="text-gray-500 mb-6">Creá una campaña para contactar masivamente a un segmento.</p>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Nueva campaña
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{c.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[c.status]}`}>
                      {statusLabels[c.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {c.channel} •{" "}
                    {c.executedAt ? `Ejecutada el ${formatDate(c.executedAt)}` : "Sin ejecutar"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {c.totalSent}/{c.totalTargeted} enviados
                  </p>
                  <p className="text-sm font-semibold text-green-600">
                    {formatCurrency(c.amountRecovered)} recuperados
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Link
                  href={`/campaigns/${c.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Ver detalle
                </Link>
                {c.status === "DRAFT" && (
                  <Link
                    href={`/campaigns/${c.id}`}
                    className="text-sm text-green-600 hover:underline"
                  >
                    Ejecutar
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
