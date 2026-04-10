import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, isAuthError } from "@/lib/api-auth";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "EXECUTING", "COMPLETED", "CANCELLED"]).optional(),
  messageTemplate: z.string().min(1).optional(),
  useAI: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, auth] = await Promise.all([params, requireCompany()]);
  if (isAuthError(auth)) return auth;
  const { company } = auth;

  const campaign = await prisma.campaign.findFirst({
    where: { id, companyId: company.id },
  });

  if (!campaign) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json({ campaign });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, auth] = await Promise.all([params, requireCompany()]);
  if (isAuthError(auth)) return auth;
  const { company } = auth;

  const campaign = await prisma.campaign.findFirst({ where: { id, companyId: company.id } });
  if (!campaign) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ campaign: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, auth] = await Promise.all([params, requireCompany()]);
  if (isAuthError(auth)) return auth;
  const { company } = auth;

  const campaign = await prisma.campaign.findFirst({ where: { id, companyId: company.id } });
  if (!campaign) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (campaign.status === "EXECUTING") {
    return NextResponse.json({ error: "No se puede eliminar una campaña en ejecución" }, { status: 400 });
  }

  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
