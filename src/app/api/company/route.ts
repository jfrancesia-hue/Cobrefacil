import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2).max(100),
  industry: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  defaultGraceDays: z.number().min(0).max(90).optional(),
});

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { companies: { take: 1, orderBy: { createdAt: "asc" } } },
  });

  if (!dbUser?.companies[0]) {
    return NextResponse.json({ company: null });
  }

  return NextResponse.json({ company: dbUser.companies[0] });
}

export async function POST(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { name, industry } = parsed.data;

  let dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        supabaseId: user.id,
        email: user.email!,
        name: user.user_metadata?.name ?? null,
      },
    });
  }

  const existingCompany = await prisma.company.findFirst({ where: { userId: dbUser.id } });
  if (existingCompany) {
    return NextResponse.json({ error: "Ya tenés una empresa creada" }, { status: 400 });
  }

  let slug = slugify(name);
  const existing = await prisma.company.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const company = await prisma.company.create({
    data: {
      name,
      slug,
      industry: industry ?? null,
      userId: dbUser.id,
    },
  });

  // Secuencia default
  await prisma.collectionSequence.create({
    data: {
      name: "Secuencia Estándar",
      isDefault: true,
      isActive: true,
      companyId: company.id,
      steps: {
        create: [
          { sortOrder: 1, triggerDays: -3, channel: "WHATSAPP", messageTemplate: "Hola {nombre}, te recordamos que tu pago de {concepto} por ${monto} vence el {fecha}. Pagá fácil acá: {link_pago}. {empresa}", onlyIfUnpaid: true },
          { sortOrder: 2, triggerDays: 0, channel: "EMAIL", subject: "Vence hoy tu pago - {concepto}", messageTemplate: "Estimado/a {nombre},\n\nHoy vence su pago de {concepto} por ${monto}.\n\nPague acá: {link_pago}\n\nSaludos,\n{empresa}", onlyIfUnpaid: true },
          { sortOrder: 3, triggerDays: 3, channel: "WHATSAPP", messageTemplate: "Hola {nombre}, tu pago de {concepto} por ${monto} está vencido hace {dias_atraso} días. Evitá recargos: {link_pago}", onlyIfUnpaid: true },
          { sortOrder: 4, triggerDays: 7, channel: "WHATSAPP", messageTemplate: "Hola {nombre}, notamos que tu deuda de {concepto} por ${monto} lleva {dias_atraso} días sin pagar. Podés pagar acá: {link_pago}", useAI: true, aiTone: "urgente", onlyIfUnpaid: true },
          { sortOrder: 5, triggerDays: 15, channel: "WHATSAPP", messageTemplate: "ÚLTIMO AVISO: {nombre}, tu deuda de ${monto} lleva {dias_atraso} días de atraso. Regularizá urgente: {link_pago}", onlyIfUnpaid: true },
        ],
      },
    },
  });

  return NextResponse.json({ company });
}

export async function PATCH(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { companies: { take: 1 } },
  });
  if (!dbUser?.companies[0]) {
    return NextResponse.json({ error: "Sin empresa" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const company = await prisma.company.update({
    where: { id: dbUser.companies[0].id },
    data: parsed.data,
  });

  return NextResponse.json({ company });
}
