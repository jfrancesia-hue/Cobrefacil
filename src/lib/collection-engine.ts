import { prisma } from "@/lib/prisma";
import { generatePaymentLink } from "@/lib/payment-link-generator";
import { personalizeMessage } from "@/lib/ai-personalizer";
import { updateDebtorScore } from "@/lib/debtor-scorer";
import { createPaymentToken } from "@/lib/payment-token";
import { logger } from "@/lib/logger";
import twilio from "twilio";
import { Resend } from "resend";
import { formatCurrency, formatDate } from "@/lib/utils";

let twilioClient: ReturnType<typeof twilio> | null = null;
let resend: Resend | null = null;

function getTwilioClient(): ReturnType<typeof twilio> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error("Credenciales de Twilio no configuradas");
  }
  twilioClient ??= twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  return twilioClient;
}

function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no está configurada");
  }
  resend ??= new Resend(process.env.RESEND_API_KEY);
  return resend;
}

function replaceVars(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (msg, [key, val]) => msg.replace(new RegExp(`\\{${key}\\}`, "g"), val),
    template
  );
}

function isWithinSendHours(timezone: string): boolean {
  try {
    const hour = parseInt(
      new Date().toLocaleString("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: timezone,
      }),
      10
    );
    return hour >= 9 && hour < 21;
  } catch {
    return true;
  }
}

async function sendWhatsApp(to: string, message: string): Promise<void> {
  const normalized = to.startsWith("+") ? to : `+${to}`;
  await getTwilioClient().messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM!,
    to: `whatsapp:${normalized}`,
    body: message,
  });
}

async function sendSms(to: string, message: string): Promise<void> {
  const from = process.env.TWILIO_SMS_FROM;
  if (!from) {
    throw new Error("TWILIO_SMS_FROM no esta configurado");
  }

  const normalized = to.startsWith("+") ? to : `+${to}`;
  await getTwilioClient().messages.create({
    from,
    to: normalized,
    body: message,
  });
}

async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  await getResend().emails.send({
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
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - step.triggerDays);

      const targetStart = new Date(targetDate);
      targetStart.setHours(0, 0, 0, 0);
      const targetEnd = new Date(targetDate);
      targetEnd.setHours(23, 59, 59, 999);

      const debts = await prisma.debt.findMany({
        where: {
          companyId,
          dueDate: { gte: targetStart, lte: targetEnd },
          status: step.onlyIfUnpaid
            ? { notIn: ["PAID", "CANCELLED", "WRITTEN_OFF"] }
            : undefined,
          // Excluir deudas que ya tienen este step enviado (anti-duplicado en query)
          messages: {
            none: { stepId: step.id },
          },
        },
        include: { debtor: true },
      });

      processed += debts.length;

      // Obtener deudas con contacto reciente en un solo batch
      const recentContactDebtIds = step.skipIfContacted
        ? new Set(
            (
              await prisma.collectionMessage.findMany({
                where: {
                  debtId: { in: debts.map((d) => d.id) },
                  status: { in: ["SENT", "DELIVERED", "READ"] },
                  createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
                select: { debtId: true },
                distinct: ["debtId"],
              })
            ).map((m) => m.debtId)
          )
        : new Set<string>();

      for (const debt of debts) {
        if (recentContactDebtIds.has(debt.id)) continue;

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
            paymentLink = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${createPaymentToken({
              debtId: debt.id,
              companyId,
            })}`;
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
        let aiPersonalized = false;

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
            logger.error("AI personalization failed", err, {
              companyId,
              debtId: debt.id,
              stepId: step.id,
            });
          }
        }

        const message = await prisma.collectionMessage.create({
          data: {
            channel: step.channel,
            content,
            subject: step.subject ? replaceVars(step.subject, vars) : null,
            status: "PENDING",
            aiPersonalized,
            originalTemplate: aiPersonalized ? step.messageTemplate : null,
            debtorId: debtor.id,
            debtId: debt.id,
            stepId: step.id,
            companyId,
          },
        });

        try {
          if (step.channel === "WHATSAPP") {
            await sendWhatsApp(debtor.whatsapp!, content);
          } else if (step.channel === "EMAIL") {
            const subject =
              step.subject
                ? replaceVars(step.subject, vars)
                : `Aviso de cobro — ${debt.concept}`;
            await sendEmail(debtor.email!, subject, content);
          } else if (step.channel === "SMS") {
            await sendSms(debtor.phone!, content);
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

  // Actualizar estado de deudas vencidas + analytics en paralelo
  await Promise.all([
    prisma.debt.updateMany({
      where: { companyId, status: "PENDING", dueDate: { lt: today } },
      data: { status: "OVERDUE" },
    }),
    prisma.collectionAnalytics.create({
      data: {
        type: "CRON_RUN",
        metadata: { processed, sent, errors, date: today.toISOString() },
        companyId,
      },
    }),
  ]);

  // Actualizar scores en paralelo (con límite para no saturar)
  const activeDebtors = await prisma.debtor.findMany({
    where: { companyId, debts: { some: { status: "OVERDUE" } } },
    select: { id: true },
    take: 50,
  });
  await Promise.allSettled(activeDebtors.map((d) => updateDebtorScore(d.id)));

  return { processed, sent, errors };
}
