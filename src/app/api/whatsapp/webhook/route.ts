import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateDebtorScore } from "@/lib/debtor-scorer";

// Twilio envía webhook cuando el deudor responde
export async function POST(req: Request) {
  const formData = await req.formData();
  const from = formData.get("From") as string; // whatsapp:+549XXXXXXXXXX
  const body = (formData.get("Body") as string)?.toLowerCase().trim();

  if (!from) return new NextResponse("OK", { status: 200 });

  const phone = from.replace("whatsapp:", "").replace("+", "");

  // Buscar deudor por whatsapp
  const debtor = await prisma.debtor.findFirst({
    where: {
      OR: [
        { whatsapp: { contains: phone } },
        { whatsapp: `+${phone}` },
      ],
    },
  });

  if (debtor) {
    // Actualizar responseRate: marcó "READ" el último mensaje pendiente
    await prisma.collectionMessage.updateMany({
      where: {
        debtorId: debtor.id,
        status: { in: ["SENT", "DELIVERED"] },
        channel: "WHATSAPP",
      },
      data: { status: "READ", readAt: new Date() },
    });

    // Si responde palabras clave de pago, registrar interés
    const paymentKeywords = ["pago", "pagué", "pague", "pagate", "transferencia", "cuándo", "cuando", "plazo"];
    const isPaymentIntent = paymentKeywords.some((k) => body.includes(k));

    if (isPaymentIntent) {
      await prisma.collectionAnalytics.create({
        data: {
          type: "DEBTOR_PAYMENT_INTENT",
          metadata: { debtorId: debtor.id, message: body },
          companyId: debtor.companyId,
        },
      });
    }

    // Actualizar score
    await updateDebtorScore(debtor.id);
  }

  // Respuesta automática simple
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Gracias por tu respuesta. Un asesor se pondrá en contacto con vos pronto.</Message>
</Response>`;

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
