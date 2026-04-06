import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, isAuthError } from "@/lib/api-auth";
import { z } from "zod";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, auth] = await Promise.all([params, requireCompany()]);
  if (isAuthError(auth)) return auth;
  const { company } = auth;

  const conversation = await prisma.agentConversation.findFirst({
    where: { id, companyId: company.id },
    include: {
      debtor: {
        select: {
          id: true,
          name: true,
          whatsapp: true,
          phone: true,
          riskScore: true,
        },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, auth] = await Promise.all([params, requireCompany()]);
  if (isAuthError(auth)) return auth;
  const { company } = auth;

  const body = await req.json();
  const parsed = z
    .object({ status: z.enum(["ACTIVE", "RESOLVED", "CLOSED"]) })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const conversation = await prisma.agentConversation.findFirst({
    where: { id, companyId: company.id },
  });
  if (!conversation) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const updated = await prisma.agentConversation.update({
    where: { id },
    data: {
      status: parsed.data.status,
      resolvedAt:
        parsed.data.status === "RESOLVED" ? new Date() : undefined,
    },
  });

  return NextResponse.json({ conversation: updated });
}
