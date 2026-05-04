import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { toolDefinitions, executeTool, ToolContext } from "./agent-tools";

const MAX_TURNS = 10;

let anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY no está configurada");
  }
  anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic;
}

const SYSTEM_PROMPT = `Eres un agente de cobranza amable, empático y profesional para CobrarFácil.
Tu objetivo es ayudar al deudor a resolver su deuda de la manera más cómoda posible.

Directrices:
- Siempre sé respetuoso y comprensivo con la situación del deudor.
- Primero consulta la deuda antes de hablar de montos específicos.
- Ofrece opciones de pago: link de pago online, transferencia, o plan de cuotas.
- Si el deudor dice que ya pagó, registra el pago manual y agradece.
- Si el deudor solicita hablar con una persona, escala inmediatamente.
- Si el deudor tiene una situación especial (desempleo, emergencia), escala con empatía.
- Nunca amenaces ni uses lenguaje agresivo.
- Responde siempre en español, de forma concisa (máximo 3 oraciones por mensaje).
- Si después de ${MAX_TURNS} turnos no se resuelve, escala a humano.`;

export interface AgentResponse {
  message: string;
  escalated: boolean;
  escalationReason?: string;
  conversationId: string;
}

export async function runCollectionAgent(
  incomingMessage: string,
  debtorPhone: string,
  companyId: string
): Promise<AgentResponse> {
  // Buscar deudor por teléfono/whatsapp
  const debtor = await prisma.debtor.findFirst({
    where: {
      companyId,
      OR: [{ whatsapp: debtorPhone }, { phone: debtorPhone }],
    },
  });

  if (!debtor) {
    return {
      message:
        "Hola, no encontramos tu número en nuestro sistema. Por favor comunícate con nosotros directamente.",
      escalated: false,
      conversationId: "",
    };
  }

  const ctx: ToolContext = { debtorId: debtor.id, companyId };

  // Buscar conversación activa o crear una nueva
  let conversation = await prisma.agentConversation.findFirst({
    where: {
      debtorId: debtor.id,
      companyId,
      status: "ACTIVE",
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) {
    conversation = await prisma.agentConversation.create({
      data: {
        channel: "WHATSAPP",
        debtorId: debtor.id,
        companyId,
      },
      include: { messages: true },
    });
  }

  // Guardar mensaje entrante
  await prisma.agentMessage.create({
    data: {
      role: "USER",
      content: incomingMessage,
      conversationId: conversation.id,
    },
  });

  // Verificar límite de turnos
  if (conversation.turnCount >= MAX_TURNS) {
    await escalateConversation(
      conversation.id,
      "Límite de turnos alcanzado sin resolución"
    );
    return {
      message:
        "Te comunico con un representante para ayudarte mejor. Gracias por tu paciencia.",
      escalated: true,
      escalationReason: "Límite de turnos alcanzado",
      conversationId: conversation.id,
    };
  }

  // Construir historial de mensajes para Claude
  const history: Anthropic.MessageParam[] = conversation.messages.map((m) => ({
    role: m.role === "USER" ? "user" : "assistant",
    content: m.content,
  }));

  // Agregar el mensaje actual
  history.push({ role: "user", content: incomingMessage });

  // Agentic loop
  let escalated = false;
  let escalationReason: string | undefined;
  let finalMessage = "";

  const messages: Anthropic.MessageParam[] = history;

  while (true) {
    const response = await getAnthropic().messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      tools: toolDefinitions as unknown as Anthropic.Tool[],
      messages,
    });

    // Agregar respuesta al historial
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      // Extraer texto final
      const textBlock = response.content.find((b) => b.type === "text");
      finalMessage = textBlock ? (textBlock as Anthropic.TextBlock).text : "";
      break;
    }

    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        const toolResult = await executeTool(
          block.name,
          block.input as Record<string, unknown>,
          ctx
        );

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: toolResult.result,
        });

        if (toolResult.escalated) {
          escalated = true;
          escalationReason = toolResult.escalationReason;
        }
      }

      messages.push({ role: "user", content: toolResults });

      if (escalated) {
        // Dar una última respuesta antes de escalar
        const finalResp = await getAnthropic().messages.create({
          model: "claude-opus-4-6",
          max_tokens: 256,
          system: SYSTEM_PROMPT,
          messages,
        });
        const textBlock = finalResp.content.find((b) => b.type === "text");
        finalMessage = textBlock
          ? (textBlock as Anthropic.TextBlock).text
          : "Te comunico con un representante de inmediato.";
        break;
      }

      continue;
    }

    // Cualquier otro stop_reason termina el loop
    break;
  }

  // Guardar respuesta del agente
  await prisma.agentMessage.create({
    data: {
      role: "ASSISTANT",
      content: finalMessage,
      conversationId: conversation.id,
    },
  });

  // Actualizar contador de turnos
  await prisma.agentConversation.update({
    where: { id: conversation.id },
    data: { turnCount: { increment: 1 } },
  });

  if (escalated && escalationReason) {
    await escalateConversation(conversation.id, escalationReason);
  }

  return {
    message: finalMessage,
    escalated,
    escalationReason,
    conversationId: conversation.id,
  };
}

async function escalateConversation(
  conversationId: string,
  reason: string
): Promise<void> {
  await prisma.agentConversation.update({
    where: { id: conversationId },
    data: {
      status: "ESCALATED",
      escalated: true,
      escalationReason: reason,
    },
  });
}
