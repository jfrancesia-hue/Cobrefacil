import { getCompanyOrRedirect } from "@/lib/get-company";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

const statusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  SENT: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-indigo-100 text-indigo-700",
  READ: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-600",
  BOUNCED: "bg-orange-100 text-orange-700",
};

const channelColors: Record<string, string> = {
  WHATSAPP: "bg-green-100 text-green-700",
  EMAIL: "bg-blue-100 text-blue-700",
  SMS: "bg-orange-100 text-orange-700",
};

export default async function MessagesPage() {
  const { company } = await getCompanyOrRedirect();

  const messages = await prisma.collectionMessage.findMany({
    where: { companyId: company.id },
    include: { debtor: { select: { name: true, id: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mensajes</h1>
        <p className="text-gray-500 text-sm mt-1">{messages.length} mensajes enviados</p>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Sin mensajes aún. El motor de cobranza los enviará automáticamente.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Deudor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Canal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mensaje</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {messages.map((msg) => (
                <tr key={msg.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{msg.debtor.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${channelColors[msg.channel]}`}>
                      {msg.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-gray-600">{msg.content}</p>
                    {msg.aiPersonalized && (
                      <span className="text-xs text-purple-600">✦ IA</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[msg.status]}`}>
                      {msg.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(msg.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
