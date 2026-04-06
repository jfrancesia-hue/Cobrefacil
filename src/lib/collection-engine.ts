import { prisma } from "@/lib/prisma";
import { generatePaymentLink } from "@/lib/payment-link-generator";
import { personalizeMessage } from "@/lib/ai-personalizer";
import { updateDebtorScore } from "@/lib/debtor-scorer";
import twilio from "twilio";
import { Resend } from "resend";
import { formatCurrency, formatDate } from "@/lib/utils";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const resend = new Resend(process.env.RESEND_API_KEY);

function replaceVars(
  template: string,
  vars: Record<string, string>
): string {
  return Object.entries(vars).reduce(
    (msg, [key, val]) => msg.replace(new RegExp(`\\{${key}\\}`, "g"), val),
    template
  );
}

function isWithinSendHours(timezone: string): boolean {
  try {
    const now = new Date();
    const hour = parseInt(
      now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: timezone }),
      10
    );
    return hour >= 9 && hour < 21;
  } catch {
    return true; // fallback
  }
}

async function sendWhatsApp(to: string, message: string): Promise<void> {
  const normalized = to.startsWith("+") ? to : `+${to}`;
  await twilioClient.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM!,
    to: `whatsapp:${normalized}`,
    body: message,
  });
}

async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<void> {
  await resend.emails.send({
    from: `CobrarFácil <noreply@cobrarfacil.com>`,
    to,
    subject,
    html: body.replace(/\n/g, "<br>"),
  });
}

export async function processCollections(companyId: string): Promise<{
  processed: number;
  sent: number;
  errors: number;
}> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return { processed: 0, sent: 0, errors: 0 };

  if (!isWithinSendHours(company.timezone)) {
    return { processed: 0, sent: 0, errors: 0 };
  }

  const sequences = await prisma.collectionSequence.findMany({
    where: { companyId, isActive: true },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });

  let processed = 0;
  let sent = 0;
  let errors = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const sequence of sequences) {
    for (const step of sequence.steps) {
      // Calcular la fecha objetivo para este step
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - step.triggerDays);

      const targetStart = new Date(targetDate);
      targetStart.setHours(0, 0, 0, 0);
      const targetEnd = new Date(targetDate);
      targetEnd.setHours(23, 59, 59, 999);

      // Buscar deudas que coincidan
      const debts = await prisma.debt.findMany({
        where: {
          companyId,
          dueDate: { gte: targetStart, lte: targetEnd },
          status: step.onlyIfUnpaid
            ? { notIn: ["PAID", "CANCELLED", "WRITTEN_OFF"] }
            : undefined,
        },
        include: { debtor: true },
      });

      for (const debt of debts) {
        processed++;

        // Verificar si ya se envió este step para esta deuda
        const alreadySent = await prisma.collectionMessage.findFirst({
          where: {
            debtId: debt.id,
            stepId: step.id,
          },
        });
        if (alreadySent) continue;

        // Verificar si ya fue contactado recientemente (skipIfContacted)
        if (step.skipIfContacted) {
          const recentContact = await prisma.collectionMessage.findFirst({
            where: {
              debtId: debt.id,
              status: { in: ["SENT", "DELIVERED", "READ"] },
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          });
          if (recentContact) continue;
        }

        // Verificar que el canal esté disponible
        const debtor = debt.debtor;
        if (step.channel === "WHATSAPP" && !debtor.whatsapp) continue;
        if (step.channel === "EMAIL" && !debtor.email) continue;
        if (step.channel === "SMS" && !debtor.phone) continue;

        // Generar link de pago si no existe
        let paymentLink = debt.mpPaymentLink ?? "";
        if (!paymentLink) {
          try {
            paymentLink = await generatePaymentLink({ debtId: debt.id, companyId });
          } catch {
            paymentLink = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${Buffer.from(`${debt.id}:${companyId}`).toString("base64url")}`;
          }
        }

        const daysOverdue = Math.max(
          0,
          Math.floor((today.getTime() - new Date(debt.dueDate).getTime()) / (1000 * 60 * 60 * 24))
        );

        const vars: Record<string, string> = {
          nombre: debtor.name,
          monto: formatCurrency(debt.amount),
          concepto: debt.concept,
          link_pago: paymentLink,
          empresa: company.name,
          dias_atraso: String(daysOverdue),
          fecha: formatDate(debt.dueDate),
        };

        let content = replaceVars(step.messageTemplate, vars);
        let originalTemplate = step.messageTemplate;
        let aiPersonalized = false;

        // Personalización con IA
        if (step.useAI && step.aiTone) {
          try {
            const personalized = await personalizeMessage({
              template: step.messageTemplate,
              tone: step.aiTone,
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
          } catch (err) {
            console.error("AI personalization failed:", err);
          }
        }

        // Crear registro pendiente
        const message = await prisma.collectionMessage.create({
          data: {
            channel: step.channel,
            content,
            subject: step.subject ? replaceVars(step.subject, vars) : null,
            status: "PENDING",
            aiPersonalized,
            originalTemplate: aiPersonalized ? originalTemplate : null,
            debtorId: debtor.id,
            debtId: debt.id,
            stepId: step.id,
            companyId,
          },
        });

        // Enviar
        try {
          if (step.channel === "WHATSAPP") {
            await sendWhatsApp(debtor.whatsapp!, content);
          } else if (step.channel === "EMAIL") {
            const subject = step.subject ? replaceVars(step.subject, vars) : `Aviso de cobro — ${debt.concept}`;
            await sendEmail(debtor.email!, subject, content);
          } else if (step.channel === "SMS") {
            await sendWhatsApp(debtor.phone!, content); // SMS via Twilio también
          }

          await prisma.collectionMessage.update({
            where: { id: message.id },
            data: { status: "SENT", sentAt: new Date() },
          });

          sent++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Error desconocido";
          await prisma.collectionMessage.update({
            where: { id: message.id },
            data: { status: "FAILED", error: errorMsg },
          });
          errors++;
        }
      }
    }
  }

  // Actualizar status de deudas vencidas
  await prisma.debt.updateMany({
    where: {
      companyId,
      status: "PENDING",
      dueDate: { lt: today },
    },
    data: { status: "OVERDUE" },
  });

  // Analytics del run
  await prisma.collectionAnalytics.create({
    data: {
      type: "CRON_RUN",
      metadata: { processed, sent, errors, date: today.toISOString() },
      companyId,
    },
  });

  // Actualizar scores de deudores activos
  const activeDebtors = await prisma.debtor.findMany({
    where: { companyId, debts: { some: { status: "OVERDUE" } } },
    select: { id: true },
    take: 100,
  });
  await Promise.allSettled(activeDebtors.map((d) => updateDebtorScore(d.id)));

  return { processed, sent, errors };
}
