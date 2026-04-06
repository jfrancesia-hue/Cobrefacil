import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, isAuthError } from "@/lib/api-auth";

export async function GET(req: Request) {
  const auth = await requireCompany();
  if (isAuthError(auth)) return auth;
  const { company } = auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;

  const where = {
    companyId: company.id,
    ...(status ? { status: status as "ACTIVE" | "RESOLVED" | "ESCALATED" | "CLOSED" } : {}),
  };

  const [conversations, total] = await Promise.all([
    prisma.agentConversation.findMany({
      where,
      include: {
        debtor: { select: { id: true, name: true, whatsapp: true, phone: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.agentConversation.count({ where }),
  ]);

  return NextResponse.json({ conversations, total, page, pages: Math.ceil(total / limit) });
}
