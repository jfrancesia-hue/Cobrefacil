import { prisma } from "@/lib/prisma";
import { generatePaymentLink } from "@/lib/payment-link-generator";
import { createPaymentToken } from "@/lib/payment-token";
import { formatCurrency, toNumber } from "@/lib/utils";

export interface ToolContext {
  debtorId: string;
  companyId: string;
}

// ── Tool definitions for Claude ──────────────────────────────────────────────

export const toolDefinitions = [
  {
    name: "consultar_deuda",
    description:
      "Consulta las deudas pendientes del deudor. Devuelve monto, concepto, fecha de vencimiento y estado.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "generar_link_pago",
    description:
      "Genera o recupera el link de pago de MercadoPago para una deuda específica.",
    input_schema: {
      type: "object" as const,
      properties: {
        debtId: {
          type: "string",
          description: "ID de la deuda para la que se genera el link",
        },
      },
      required: ["debtId"],
    },
  },
  {
    name: "registrar_pago_manual",
    description:
      "Registra un pago manual cuando el deudor confirma que ya pagó por transferencia u otro medio.",
    input_schema: {
      type: "object" as const,
      properties: {
        debtId: { type: "string", description: "ID de la deuda pagada" },
        amount: { type: "number", description: "Monto pagado" },
        method: {
          type: "string",
          enum: ["TRANSFER", "CASH", "DEBIT", "OTHER"],
          description: "Método de pago utilizado",
        },
        notes: { type: "string", description: "Notas adicionales opcionales" },
      },
      required: ["debtId", "amount", "method"],
    },
  },
  {
    name: "crear_plan_cuotas",
    description:
      "Propone un plan de pago en cuotas para el deudor y lo registra como notas en la deuda.",
    input_schema: {
      type: "object" as const,
      properties: {
        debtId: { type: "string", description: "ID de la deuda a cuotificar" },
        installments: {
          type: "number",
          description: "Cantidad de cuotas (2-12)",
          minimum: 2,
          maximum: 12,
        },
      },
      required: ["debtId", "installments"],
    },
  },
  {
    name: "escalar_a_humano",
    description:
      "Escala la conversación a un agente humano cuando el deudor no puede ser atendido automáticamente.",
    input_schema: {
      type: "object" as const,
      properties: {
        reason: {
          type: "string",
          description: "Motivo del escalamiento",
        },
      },
      required: ["reason"],
    },
  },
] as const;

export type ToolName = (typeof toolDefinitions)[number]["name"];

// ── Tool implementations ──────────────────────────────────────────────────────

export async function consultarDeuda(ctx: ToolContext): Promise<string> {
  const debts = await prisma.debt.findMany({
    where: {
      debtorId: ctx.debtorId,
      companyId: ctx.companyId,
      status: { notIn: ["PAID", "CANCELLED", "WRITTEN_OFF"] },
    },
    orderBy: { dueDate: "asc" },
  });

  if (debts.length === 0) {
    return "No se encontraron deudas pendientes para este deudor.";
  }

  const lines = debts.map((d) => {
    const overdueDays = Math.max(
      0,
      Math.floor((Date.now() - new Date(d.dueDate).getTime()) / 86400000)
    );
    return [
      `• ID: ${d.id}`,
      `  Concepto: ${d.concept}`,
      `  Monto: ${formatCurrency(d.amount)}`,
      `  Vencimiento: ${new Date(d.dueDate).toLocaleDateString("es-AR")}`,
      `  Estado: ${d.status}${overdueDays > 0 ? ` (${overdueDays} días de atraso)` : ""}`,
    ].join("\n");
  });

  return `Deudas encontradas:\n${lines.join("\n\n")}`;
}

export async function generarLinkPago(
  ctx: ToolContext,
  debtId: string
): Promise<string> {
  const debt = await prisma.debt.findFirst({
    where: { id: debtId, debtorId: ctx.debtorId, companyId: ctx.companyId },
  });
  if (!debt) return "No se encontró la deuda indicada.";

  if (debt.mpPaymentLink) {
    return `Link de pago ya disponible: ${debt.mpPaymentLink}`;
  }

  try {
    const link = await generatePaymentLink({
      debtId,
      companyId: ctx.companyId,
    });
    return `Link de pago generado: ${link}`;
  } catch {
    const fallback = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${createPaymentToken({
      debtId,
      companyId: ctx.companyId,
    })}`;
    return `Link de pago: ${fallback}`;
  }
}

export async function registrarPagoManual(
  ctx: ToolContext,
  debtId: string,
  amount: number,
  method: "TRANSFER" | "CASH" | "DEBIT" | "OTHER",
  notes?: string
): Promise<string> {
  const debt = await prisma.debt.findFirst({
    where: { id: debtId, debtorId: ctx.debtorId, companyId: ctx.companyId },
  });
  if (!debt) return "No se encontró la deuda indicada.";

  const currentAmount = toNumber(debt.amount);
  const isPaid = amount >= currentAmount;

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        amount,
        method,
        status: "APPROVED",
        notes: notes ?? "Pago registrado por agente IA vía WhatsApp",
        debtId,
        companyId: ctx.companyId,
      },
    }),
    prisma.debt.update({
      where: { id: debtId },
      data: {
        paidAmount: { increment: amount },
        status: isPaid ? "PAID" : "PARTIAL",
        paidAt: isPaid ? new Date() : undefined,
      },
    }),
    prisma.debtor.update({
      where: { id: ctx.debtorId },
      data: { totalPaid: { increment: amount } },
    }),
  ]);

  return isPaid
    ? `Pago de ${formatCurrency(amount)} registrado correctamente. Deuda marcada como PAGADA.`
    : `Pago parcial de ${formatCurrency(amount)} registrado. Saldo restante: ${formatCurrency(currentAmount - amount)}.`;
}

export async function crearPlanCuotas(
  ctx: ToolContext,
  debtId: string,
  installments: number
): Promise<string> {
  const debt = await prisma.debt.findFirst({
    where: { id: debtId, debtorId: ctx.debtorId, companyId: ctx.companyId },
  });
  if (!debt) return "No se encontró la deuda indicada.";

  const total = toNumber(debt.amount);
  const monthly = total / installments;
  const today = new Date();

  const schedule = Array.from({ length: installments }, (_, i) => {
    const due = new Date(today);
    due.setMonth(due.getMonth() + i + 1);
    return `  Cuota ${i + 1}: ${formatCurrency(monthly)} — vence ${due.toLocaleDateString("es-AR")}`;
  }).join("\n");

  const planText = `Plan ${installments} cuotas de ${formatCurrency(monthly)}:\n${schedule}`;

  await prisma.debt.update({
    where: { id: debtId },
    data: {
      metadata: {
        ...(typeof debt.metadata === "object" && debt.metadata !== null
          ? debt.metadata
          : {}),
        installmentPlan: { installments, monthly, createdAt: today.toISOString() },
      },
    },
  });

  return planText;
}

export async function escalarAHumano(reason: string): Promise<string> {
  return `ESCALADO: ${reason}`;
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<{ result: string; escalated: boolean; escalationReason?: string }> {
  switch (name) {
    case "consultar_deuda":
      return { result: await consultarDeuda(ctx), escalated: false };

    case "generar_link_pago":
      return {
        result: await generarLinkPago(ctx, input.debtId as string),
        escalated: false,
      };

    case "registrar_pago_manual":
      return {
        result: await registrarPagoManual(
          ctx,
          input.debtId as string,
          input.amount as number,
          input.method as "TRANSFER" | "CASH" | "DEBIT" | "OTHER",
          input.notes as string | undefined
        ),
        escalated: false,
      };

    case "crear_plan_cuotas":
      return {
        result: await crearPlanCuotas(
          ctx,
          input.debtId as string,
          input.installments as number
        ),
        escalated: false,
      };

    case "escalar_a_humano": {
      const reason = input.reason as string;
      return {
        result: await escalarAHumano(reason),
        escalated: true,
        escalationReason: reason,
      };
    }

    default:
      return { result: `Herramienta desconocida: ${name}`, escalated: false };
  }
}
