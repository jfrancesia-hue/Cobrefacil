"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  DUE: "#f97316",
  OVERDUE: "#ef4444",
  PAID: "#22c55e",
  PARTIAL: "#3b82f6",
  WRITTEN_OFF: "#9ca3af",
  CANCELLED: "#d1d5db",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  DUE: "Vence hoy",
  OVERDUE: "Vencida",
  PAID: "Pagada",
  PARTIAL: "Parcial",
  WRITTEN_OFF: "Incobrable",
  CANCELLED: "Cancelada",
};

function formatK(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

export default function AnalyticsCharts({
  statusDist,
  recoveryByMonth,
  channelStats,
}: {
  statusDist: { status: string; count: number; amount: number }[];
  recoveryByMonth: { month: string; amount: number }[];
  channelStats: { channel: string; total: number; readRate: number }[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recupero por mes */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Recupero mensual</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={recoveryByMonth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatK(Number(v))} width={50} />
            <Tooltip formatter={(v) => formatK(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Recuperado" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Distribución por estado (donut) */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Distribución de deudas</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={statusDist}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
            >
              {statusDist.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#9ca3af"} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, name) => [v, STATUS_LABELS[String(name)] ?? name]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend
              formatter={(value) => STATUS_LABELS[value] ?? value}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Efectividad por canal */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Efectividad por canal</h3>
        <div className="grid grid-cols-3 gap-6">
          {channelStats.map(({ channel, total, readRate }) => (
            <div key={channel} className="text-center">
              <p className="text-2xl font-bold text-gray-900">{total}</p>
              <p className="text-sm text-gray-500 mb-2">mensajes — {channel}</p>
              <div className="h-2 bg-gray-100 rounded-full">
                <div
                  className="h-2 bg-blue-500 rounded-full"
                  style={{ width: `${readRate}%` }}
                />
              </div>
              <p className="text-xs text-blue-600 font-medium mt-1">{readRate}% leídos</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
