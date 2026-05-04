import { DebtStatus } from "@/generated/prisma/client";

const statusConfig: Record<DebtStatus, { label: string; className: string }> = {
  PENDING: { label: "Pendiente", className: "bg-yellow-100 text-yellow-700" },
  DUE: { label: "Vence hoy", className: "bg-orange-100 text-orange-700" },
  OVERDUE: { label: "Vencida", className: "bg-red-100 text-red-700" },
  PAID: { label: "Pagada", className: "bg-green-100 text-green-700" },
  PARTIAL: { label: "Pago parcial", className: "bg-blue-100 text-blue-700" },
  WRITTEN_OFF: { label: "Incobrable", className: "bg-gray-100 text-gray-500" },
  CANCELLED: { label: "Cancelada", className: "bg-gray-100 text-gray-400" },
};

export default function DebtStatusBadge({ status }: { status: DebtStatus | string }) {
  const config = statusConfig[status as DebtStatus] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
