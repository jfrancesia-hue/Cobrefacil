import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, isAuthError } from "@/lib/api-auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, auth] = await Promise.all([params, requireCompany()]);
  if (isAuthError(auth)) return auth;
  const { company } = auth;

  const campaign = await prisma.campaign.findFirst({
    where: { id, companyId: company.id },
  });

  if (!campaign) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (campaign.status !== "DRAFT") {
    return NextResponse.json({ error: "Solo se pueden ejecutar campañas en borrador" }, { status: 400 });
  }

  // Obtener deudores con deudas pendientes/vencidas
  const debtors = await prisma.debtor.findMany({
    where: {
      companyId: company.id,
      debts: {
        some: {
          status: { in: ["PENDING", "DUE", "OVERDUE"] },
        },
      },
    },
    select: { id: true, name: true, whatsapp: true, email: true, phone: true },
  });

  const targeted = debtors.length;

  // Crear mensajes para cada deudor
  if (targeted > 0) {
    await prisma.collectionMessage.createMany({
      data: debtors.map((d) => ({
        channel: campaign.channel,
        content: campaign.messageTemplate
          .replace(/\{nombre\}/g, d.name)
          .replace(/\{empresa\}/g, company.name),
        status: "PENDING",
        debtorId: d.id,
        companyId: company.id,
      })),
    });
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: {
      status: "COMPLETED",
      totalTargeted: targeted,
      totalSent: targeted,
      executedAt: new Date(),
    },
  });

  return NextResponse.json({ campaign: updated, sent: targeted });
}
