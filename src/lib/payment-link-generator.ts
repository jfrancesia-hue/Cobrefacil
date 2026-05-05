import { MercadoPagoConfig, Preference } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { createPaymentToken } from "@/lib/payment-token";

interface GeneratePaymentLinkParams {
  debtId: string;
  companyId: string;
}

export async function generatePaymentLink({
  debtId,
  companyId,
}: GeneratePaymentLinkParams): Promise<string> {
  const [debt, company] = await Promise.all([
    prisma.debt.findFirst({
      where: { id: debtId, companyId },
      include: { debtor: true },
    }),
    prisma.company.findUnique({ where: { id: companyId } }),
  ]);

  if (!debt || !company) throw new Error("Deuda o empresa no encontrada");
  if (debt.status === "PAID") throw new Error("Deuda ya pagada");

  // Si ya tiene link, retornar
  if (debt.mpPaymentLink) return debt.mpPaymentLink;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const token = createPaymentToken({ debtId, companyId });

  // Usar token MP del cliente si está configurado, sino el de la plataforma
  let accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN!;
  if (company.mpAccessToken) {
    try {
      accessToken = decrypt(company.mpAccessToken);
    } catch {
      // fallback a token de plataforma
    }
  }

  const client = new MercadoPagoConfig({ accessToken });
  const preference = new Preference(client);

  const amount = Number(debt.amount) + Number(debt.lateFee) - Number(debt.discount);

  const result = await preference.create({
    body: {
      items: [
        {
          id: debt.id,
          title: `${debt.concept} — ${company.name}`,
          description: `Pago de deuda: ${debt.concept}`,
          quantity: 1,
          unit_price: amount,
          currency_id: company.currency,
        },
      ],
      payer: {
        name: debt.debtor.name,
        email: debt.debtor.email ?? undefined,
      },
      external_reference: debtId,
      notification_url: `${appUrl}/api/mercadopago/webhook`,
      back_urls: {
        success: `${appUrl}/pay/${token}?status=success`,
        failure: `${appUrl}/pay/${token}?status=failure`,
        pending: `${appUrl}/pay/${token}?status=pending`,
      },
      auto_return: "approved",
    },
  });

  const paymentLink = result.init_point!;

  await prisma.debt.update({
    where: { id: debtId },
    data: {
      mpPreferenceId: result.id,
      mpPaymentLink: paymentLink,
    },
  });

  return paymentLink;
}
