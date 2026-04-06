import { getCompanyOrRedirect } from "@/lib/get-company";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Layers, CheckCircle } from "lucide-react";

export default async function SequencesPage() {
  const { company } = await getCompanyOrRedirect();

  const sequences = await prisma.collectionSequence.findMany({
    where: { companyId: company.id },
    include: { _count: { select: { steps: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Secuencias de cobranza</h1>
          <p className="text-gray-500 text-sm mt-1">
            Configurá cuándo y cómo contactar a cada deudor
          </p>
        </div>
        <Link
          href="/sequences/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Nueva secuencia
        </Link>
      </div>

      {sequences.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Sin secuencias configuradas</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sequences.map((seq) => (
            <div key={seq.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${seq.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{seq.name}</h3>
                    {seq.isDefault && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {seq._count.steps} paso{seq._count.steps !== 1 ? "s" : ""} •{" "}
                    {seq.isActive ? "Activa" : "Inactiva"}
                  </p>
                </div>
              </div>
              <Link
                href={`/sequences/${seq.id}`}
                className="px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Editar
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
