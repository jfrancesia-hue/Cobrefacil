import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateDebtorScore } from "@/lib/debtor-scorer";
import { runCollectionAgent } from "@/lib/agents/collection-agent";
import twilio from "twilio";

// Verificar firma de Twilio para seguridad
function isTwilioRequest(req: Request, body: string): boolean {
  const signature = req.headers.get("x-twilio-signature") ?? "";
  const url = req.url;
  if (!process.env.TWILIO_AUTH_TOKEN || !signature) return false;
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    Object.fromEntries(new URLSearchParams(body))
  );
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  // Validar que viene de Twilio (en producción)
  if (
    process.env.NODE_ENV === "production" &&
    !isTwilioRequest(req, rawBody)
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const formData = new URLSearchParams(rawBody);
  const from = formData.get("From") ?? ""; // whatsapp:+549XXXXXXXXXX
  const body = (formData.get("Body") ?? "").trim();
  const messageSid = formData.get("MessageSid") ?? "";

  if (!from || !body) {
    return new NextResponse("OK", { status: 200 });
  }

  // Normalizar número: quitar "whatsapp:" y "+"
  const rawPhone = from.replace("whatsapp:", "");
  const phone = rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`;

  // Buscar deudor para obtener companyId
  const debtor = await prisma.debtor.findFirst({
    where: {
      OR: [
        { whatsapp: phone },
        { whatsapp: rawPhone.replace("+", "") },
        { phone },
      ],
    },
  });

  if (debtor) {
    // Marcar mensajes anteriores como leídos
    await prisma.collectionMessage.updateMany({
      where: {
        debtorId: debtor.id,
        status: { in: ["SENT", "DELIVERED"] },
        channel: "WHATSAPP",
      },
      data: { status: "READ", readAt: new Date() },
    });

    // Actualizar score en background (no await para no bloquear respuesta)
    updateDebtorScore(debtor.id).catch(console.error);

    // Correr el agente IA
    let agentReply: string;
    try {
      const result = await runCollectionAgent(body, phone, debtor.companyId);
      agentReply = result.message;

      // Analytics si hay intención de pago
      const paymentKeywords = ["pago", "pagué", "pague", "transferencia", "cuándo", "plazo"];
      if (paymentKeywords.some((k) => body.toLowerCase().includes(k))) {
        prisma.collectionAnalytics
          .create({
            data: {
              type: "DEBTOR_PAYMENT_INTENT",
              metadata: {
                debtorId: debtor.id,
                message: body,
                messageSid,
                conversationId: result.conversationId,
              },
              companyId: debtor.companyId,
            },
          })
          .catch(console.error);
      }
    } catch (err) {
      console.error("Agent error:", err);
      agentReply =
        "Gracias por tu mensaje. Un asesor se comunicará con vos en breve.";
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(agentReply)}</Message>
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  // Deudor no encontrado — respuesta genérica
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Hola, no encontramos tu número en nuestro sistema. Comunicate con nosotros directamente.</Message>
</Response>`;

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
