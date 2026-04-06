"use client";

import { useEffect, useState } from "react";
import { Bot, CheckCircle, AlertTriangle, Clock, XCircle } from "lucide-react";

type ConversationStatus = "ACTIVE" | "RESOLVED" | "ESCALATED" | "CLOSED";

interface Conversation {
  id: string;
  status: ConversationStatus;
  channel: string;
  turnCount: number;
  escalated: boolean;
  escalationReason: string | null;
  updatedAt: string;
  debtor: {
    id: string;
    name: string;
    whatsapp: string | null;
    phone: string | null;
  };
  messages: Array<{
    role: string;
    content: string;
    createdAt: string;
  }>;
}

interface ConversationDetail extends Omit<Conversation, "messages"> {
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
}

const STATUS_CONFIG: Record<
  ConversationStatus,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  ACTIVE: { label: "Activa", color: "bg-blue-100 text-blue-700", icon: Clock },
  RESOLVED: { label: "Resuelta", color: "bg-green-100 text-green-700", icon: CheckCircle },
  ESCALATED: { label: "Escalada", color: "bg-red-100 text-red-700", icon: AlertTriangle },
  CLOSED: { label: "Cerrada", color: "bg-gray-100 text-gray-600", icon: XCircle },
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<ConversationDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function fetchConversations() {
    setLoading(true);
    const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
    const res = await fetch(`/api/conversations${params}`);
    const data = await res.json();
    setConversations(data.conversations ?? []);
    setLoading(false);
  }

  async function fetchDetail(id: string) {
    const res = await fetch(`/api/conversations/${id}`);
    const data = await res.json();
    setSelected(data.conversation);
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchConversations();
    if (selected?.id === id) fetchDetail(id);
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0">
      {/* Lista lateral */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">Agente IA</h1>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas</option>
            <option value="ACTIVE">Activas</option>
            <option value="ESCALATED">Escaladas</option>
            <option value="RESOLVED">Resueltas</option>
            <option value="CLOSED">Cerradas</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {loading ? (
            <p className="text-sm text-gray-500 p-4">Cargando...</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-gray-500 p-4">No hay conversaciones.</p>
          ) : (
            conversations.map((c) => {
              const cfg = STATUS_CONFIG[c.status];
              const StatusIcon = cfg.icon;
              return (
                <button
                  key={c.id}
                  onClick={() => fetchDetail(c.id)}
                  className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                    selected?.id === c.id ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {c.debtor.name}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${cfg.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {c.messages[0]?.content ?? "Sin mensajes"}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">{c.turnCount} turnos</span>
                    <span className="text-xs text-gray-400">
                      {new Date(c.updatedAt).toLocaleDateString("es-AR")}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Panel de detalle */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selected ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{selected.debtor.name}</h2>
                <p className="text-xs text-gray-500">
                  {selected.debtor.whatsapp ?? selected.debtor.phone}
                  {selected.escalated && selected.escalationReason && (
                    <span className="ml-2 text-red-600 font-medium">
                      Escalado: {selected.escalationReason}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                {(selected.status === "ACTIVE" || selected.status === "ESCALATED") && (
                  <>
                    <button
                      onClick={() => updateStatus(selected.id, "RESOLVED")}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Resolver
                    </button>
                    <button
                      onClick={() => updateStatus(selected.id, "CLOSED")}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Cerrar
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {selected.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "USER" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "USER"
                        ? "bg-white border border-gray-200 text-gray-800"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.role === "USER" ? "text-gray-400" : "text-blue-200"
                      }`}
                    >
                      {msg.role === "USER" ? "Deudor" : "Agente IA"} ·{" "}
                      {new Date(msg.createdAt).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <Bot className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm">Seleccioná una conversación para ver el detalle</p>
          </div>
        )}
      </div>
    </div>
  );
}
