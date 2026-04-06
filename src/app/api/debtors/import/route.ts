import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parse, isValid } from "date-fns";

const rowSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  whatsapp: z.string().optional(),
  phone: z.string().optional(),
  amount: z.number().positive(),
  dueDate: z.string(),
  concept: z.string().default("Deuda importada"),
});

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(5000),
});

function parseDate(dateStr: string): Date {
  const formats = ["yyyy-MM-dd", "dd/MM/yyyy", "d/M/yyyy", "MM/dd/yyyy"];
  for (const fmt of formats) {
    const parsed = parse(dateStr, fmt, new Date());
    if (isValid(parsed)) return parsed;
  }
  const d = new Date(dateStr);
  if (isValid(d)) return d;
  throw new Error(`Fecha inválida: ${dateStr}`);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { companies: { take: 1 } },
  });
  if (!dbUser?.companies[0]) {
    return NextResponse.json({ error: "Sin empresa" }, { status: 400 });
  }
  const company = dbUser.companies[0];

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  let created = 0;
  let debtsCreated = 0;

  for (const row of parsed.data.rows) {
    let dueDate: Date;
    try {
      dueDate = parseDate(row.dueDate);
    } catch {
      continue;
    }

    // Upsert debtor (email como identificador si hay)
    let debtor = row.email
      ? await prisma.debtor.findUnique({
          where: { companyId_email: { companyId: company.id, email: row.email } },
        })
      : null;

    if (!debtor) {
      debtor = await prisma.debtor.create({
        data: {
          name: row.name,
          email: row.email ?? null,
          whatsapp: row.whatsapp ?? null,
          phone: row.phone ?? null,
          companyId: company.id,
        },
      });
      created++;
    }

    const now = new Date();
    const status = dueDate < now ? "OVERDUE" : "PENDING";

    await prisma.debt.create({
      data: {
        concept: row.concept,
        amount: row.amount,
        originalAmount: row.amount,
        dueDate,
        status,
        debtorId: debtor.id,
        companyId: company.id,
      },
    });
    debtsCreated++;

    // Actualizar totalDebt del deudor
    await prisma.debtor.update({
      where: { id: debtor.id },
      data: { totalDebt: { increment: row.amount } },
    });
  }

  return NextResponse.json({ created, debtsCreated });
}
