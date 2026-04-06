import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, isAuthError } from "@/lib/api-auth";
import { z } from "zod";

const stepSchema = z.object({
  id: z.string(),
  sortOrder: z.number(),
  triggerDays: z.number(),
  channel: z.enum(["WHATSAPP", "EMAIL", "SMS"]),
  subject: z.string().optional().nullable(),
  messageTemplate: z.string().min(1),
  useAI: z.boolean().default(false),
  aiTone: z.string().optional().nullable(),
  onlyIfUnpaid: z.boolean().default(true),
  skipIfContacted: z.boolean().default(false),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  steps: z.array(stepSchema),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, auth] = await Promise.all([params, requireCompany()]);
  if (isAuthError(auth)) return auth;
  const { company } = auth;

  const sequence = await prisma.collectionSequence.findFirst({
    where: { id, companyId: company.id },
  });
  if (!sequence) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, isActive, steps } = parsed.data;

  // Usar transacción: borrar steps viejos y actualizar secuencia atómicamente
  const updated = await prisma.$transaction(async (tx) => {
    await tx.collectionStep.deleteMany({ where: { sequenceId: id } });
    return tx.collectionSequence.update({
      where: { id },
      data: {
        name: name ?? sequence.name,
        isActive: isActive ?? sequence.isActive,
        steps: {
          create: steps.map((step) => ({
            sortOrder: step.sortOrder,
            triggerDays: step.triggerDays,
            channel: step.channel,
            subject: step.subject ?? null,
            messageTemplate: step.messageTemplate,
            useAI: step.useAI,
            aiTone: step.aiTone ?? null,
            onlyIfUnpaid: step.onlyIfUnpaid,
            skipIfContacted: step.skipIfContacted,
          })),
        },
      },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    });
  });

  return NextResponse.json({ sequence: updated });
}
