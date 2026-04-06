import { prisma } from "@/lib/prisma";

export async function updateDebtorScore(debtorId: string): Promise<void> {
  const debtor = await prisma.debtor.findUnique({
    where: { id: debtorId },
    include: {
      debts: {
        where: { status: { in: ["PAID", "PARTIAL", "OVERDUE"] } },
        orderBy: { paidAt: "desc" },
        take: 20,
      },
      messages: {
        where: { status: { in: ["READ", "DELIVERED"] } },
        take: 50,
      },
    },
  });

  if (!debtor) return;

  const paidDebts = debtor.debts.filter((d) => d.status === "PAID" || d.status === "PARTIAL");
  const overdueDebts = debtor.debts.filter((d) => d.status === "OVERDUE");

  // Calcular días promedio de atraso en deudas pagadas
  let avgDelay = 0;
  if (paidDebts.length > 0) {
    const delays = paidDebts
      .filter((d) => d.paidAt && d.dueDate)
      .map((d) => {
        const days = Math.floor(
          (new Date(d.paidAt!).getTime() - new Date(d.dueDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return Math.max(0, days);
      });
    avgDelay = delays.length > 0 ? Math.round(delays.reduce((a, b) => a + b, 0) / delays.length) : 0;
  }

  // Score: base 50
  let score = 50;

  // Buen historial de pago → bajar score (menos riesgo)
  if (paidDebts.length > 0) {
    const payRate = paidDebts.length / (paidDebts.length + overdueDebts.length);
    score -= payRate * 30;
  }

  // Deudas vencidas sin pagar → subir score
  score += Math.min(overdueDebts.length * 10, 40);

  // Promedio de atraso
  if (avgDelay > 30) score += 20;
  else if (avgDelay > 15) score += 10;
  else if (avgDelay < 5) score -= 10;

  // Response rate
  const totalMessages = debtor.messages.length;
  const readMessages = debtor.messages.filter((m) => m.status === "READ").length;
  const responseRate = totalMessages > 0 ? (readMessages / totalMessages) * 100 : 0;
  if (responseRate > 70) score -= 10;
  else if (responseRate < 20) score += 10;

  score = Math.max(0, Math.min(100, Math.round(score)));

  await prisma.debtor.update({
    where: { id: debtorId },
    data: {
      riskScore: score,
      avgPaymentDelay: avgDelay,
      responseRate,
    },
  });
}
