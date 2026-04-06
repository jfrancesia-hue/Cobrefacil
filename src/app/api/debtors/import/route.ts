import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCompany, isAuthError } from "@/lib/api-auth";
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
  const auth = await requireCompany();
  if (isAuthError(auth)) return auth;
  const { company } = auth;

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date();
  let created = 0;
  let debtsCreated = 0;

  // Procesar en chunks de 50 para evitar saturar la DB
  const CHUNK_SIZE = 50;
  const rows = parsed.data.rows;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);

    await prisma.$transaction(async (tx) => {
      for (const row of chunk) {
        let dueDate: Date;
        try {
          dueDate = parseDate(row.dueDate);
        } catch {
          continue;
        }

        // Buscar deudor existente por email (si tiene)
        let debtor = row.email
          ? await tx.debtor.findUnique({
              where: { companyId_email: { companyId: company.id, email: row.email } },
            })
          : null;

        if (!debtor) {
          debtor = await tx.debtor.create({
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

        const status = dueDate < now ? "OVERDUE" : "PENDING";

        await tx.debt.create({
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

        await tx.debtor.update({
          where: { id: debtor.id },
          data: { totalDebt: { increment: row.amount } },
        });

        debtsCreated++;
      }
    });
  }

  return NextResponse.json({ created, debtsCreated });
}
