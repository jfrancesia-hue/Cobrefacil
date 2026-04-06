import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, isAuthError } from "@/lib/api-auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  channel: z.enum(["WHATSAPP", "EMAIL", "SMS"]),
  messageTemplate: z.string().min(1),
  useAI: z.boolean().default(false),
  filters: z.object({
    minDaysOverdue: z.number().min(0).optional(),
    maxDaysOverdue: z.number().min(0).optional(),
    minAmount: z.number().positive().optional(),
    maxAmount: z.number().positive().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export async function GET() {
  const auth = await requireCompany();
  if (isAuthError(auth)) return auth;
  const { company } = auth;

  const campaigns = await prisma.campaign.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  const auth = await requireCompany();
  if (isAuthError(auth)) return auth;
  const { company } = auth;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const campaign = await prisma.campaign.create({
    data: {
      name: parsed.data.name,
      channel: parsed.data.channel,
      messageTemplate: parsed.data.messageTemplate,
      useAI: parsed.data.useAI,
      filters: parsed.data.filters,
      companyId: company.id,
    },
  });

  return NextResponse.json({ campaign }, { status: 201 });
}
