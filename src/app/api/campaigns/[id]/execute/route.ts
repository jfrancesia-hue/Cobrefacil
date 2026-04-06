import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { personalizeMessage } from "@/lib/ai-personalizer";
import { generatePaymentLink } from "@/lib/payment-link-generator";
import { formatCurrency, formatDate, getDaysOverdue } from "@/lib/utils";
import twilio from "twilio";
import { Resend } from "resend";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const resend = new Resend(process.env.RESEND_API_KEY);

function replaceVars(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (msg, [key, val]) => msg.replace(new RegExp(`\\{${key}\\}`, "g"), val),
    template
  );
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { companies: { take: 1 } },
  });
  if (!dbUser?.companies[0]) return NextResponse.json({ error: "Sin empresa" }, { status: 400 });

  const company = dbUser.companies[0];

  const campaign = await prisma.campaign.findFirst({
    where: { id, companyId: company.id, status: "DRAFT" },
  });
  if (!campaign) return NextResponse.json({ error: "Campaña no encontrada o ya ejecutada" }, { status: 404 });

  const filters = campaign.filters as {
    minDaysOverdue?: number;
    maxDaysOverdue?: number;
    minAmount?: number;
    maxAmount?: number;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filtrar deudas según criterios
  const debtWhere: Record<string, unknown> = {
    companyId: company.id,
    status: { notIn: ["PAID", "CANCELLED", "WRITTEN_OFF"] },
  };
  if (filters.minAmount) debtWhere.amount = { gte: filters.minAmount };
  if (filters.maxAmount) {
    debtWhere.amount = { ...(debtWhere.amount as object ?? {}), lte: filters.maxAmount };
  }

  const debts = await prisma.debt.findMany({
    where: debtWhere,
    include: { debtor: true },
  });

  // Filtrar por días de atraso
  const filtered = debts.filter((debt) => {
    const daysOverdue = getDaysOverdue(debt.dueDate);
    if (filters.minDaysOverdue !== undefined && daysOverdue < filters.minDaysOverdue) return false;
    if (filters.maxDaysOverdue !== undefined && daysOverdue > filters.maxDaysOverdue) return false;
    return true;
  });

  await prisma.campaign.update({
    where: { id },
    data: { status: "EXECUTING", totalTargeted: filtered.length, executedAt: new Date() },
  });

  let totalSent = 0;
  let totalDelivered = 0;

  for (const debt of filtered) {
    const debtor = debt.debtor;
    if (campaign.channel === "WHATSAPP" && !debtor.whatsapp) continue;
    if (campaign.channel === "EMAIL" && !debtor.email) continue;

    let paymentLink = debt.mpPaymentLink ?? "";
    if (!paymentLink) {
      try {
        paymentLink = await generatePaymentLink({ debtId: debt.id, companyId: company.id });
      } catch {
        paymentLink = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${Buffer.from(`${debt.id}:${company.id}`).toString("base64url")}`;
      }
    }

    const vars: Record<string, string> = {
      nombre: debtor.name,
      monto: formatCurrency(debt.amount),
      concepto: debt.concept,
      link_pago: paymentLink,
      empresa: company.name,
      dias_atraso: String(getDaysOverdue(debt.dueDate)),
      fecha: formatDate(debt.dueDate),
    };

    let content = replaceVars(campaign.messageTemplate, vars);
    let aiPersonalized = false;

    if (campaign.useAI) {
      try {
        const personalized = await personalizeMessage({
          template: campaign.messageTemplate,
          tone: "profesional",
          debtor: {
            name: debtor.name,
            riskScore: debtor.riskScore,
            avgPaymentDelay: debtor.avgPaymentDelay,
            responseRate: Number(debtor.responseRate),
            bestContactChannel: debtor.bestContactChannel,
            bestContactTime: debtor.bestContactTime,
          },
        });
        content = replaceVars(personalized, vars);
        aiPersonalized = true;
      } catch {
        // fallback to template
      }
    }

    try {
      if (campaign.channel === "WHATSAPP") {
        const normalized = debtor.whatsapp!.startsWith("+") ? debtor.whatsapp! : `+${debtor.whatsapp}`;
        await twilioClient.messages.create({
          from: process.env.TWILIO_WHATSAPP_FROM!,
          to: `whatsapp:${normalized}`,
          body: content,
        });
      } else if (campaign.channel === "EMAIL") {
        await resend.emails.send({
          from: `${company.name} <noreply@cobrarfacil.com>`,
          to: debtor.email!,
          subject: `Aviso de cobro — ${debt.concept}`,
          html: content.replace(/\n/g, "<br>"),
        });
      }

      await prisma.collectionMessage.create({
        data: {
          channel: campaign.channel,
          content,
          status: "SENT",
          sentAt: new Date(),
          aiPersonalized,
          debtorId: debtor.id,
          debtId: debt.id,
          companyId: company.id,
        },
      });

      totalSent++;
      totalDelivered++;
    } catch {
      await prisma.collectionMessage.create({
        data: {
          channel: campaign.channel,
          content,
          status: "FAILED",
          debtorId: debtor.id,
          debtId: debt.id,
          companyId: company.id,
        },
      });
    }
  }

  await prisma.campaign.update({
    where: { id },
    data: {
      status: "COMPLETED",
      totalSent,
      totalDelivered,
    },
  });

  return NextResponse.json({ ok: true, totalSent, totalTargeted: filtered.length });
}
