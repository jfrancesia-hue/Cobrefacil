import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processCollections } from "@/lib/collection-engine";

export async function POST(req: Request) {
  // Verificar secret del cron
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Procesar todas las empresas activas
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
    where: {
      debtors: { some: {} },
    },
  });

  const results: Record<string, unknown> = {};

  for (const company of companies) {
    try {
      const result = await processCollections(company.id);
      results[company.id] = { name: company.name, ...result };
    } catch (err) {
      results[company.id] = {
        name: company.name,
        error: err instanceof Error ? err.message : "Error",
      };
    }
  }

  return NextResponse.json({
    ok: true,
    companiesProcessed: companies.length,
    results,
    timestamp: new Date().toISOString(),
  });
}

// También permite GET para testing
export async function GET() {
  return NextResponse.json(
    { error: "Usa POST con Authorization Bearer" },
    { status: 405 }
  );
}
