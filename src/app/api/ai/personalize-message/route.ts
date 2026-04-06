import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { personalizeMessage } from "@/lib/ai-personalizer";
import { z } from "zod";

const schema = z.object({
  template: z.string().min(1),
  tone: z.string().default("profesional"),
  debtor: z.object({
    name: z.string(),
    riskScore: z.number(),
    avgPaymentDelay: z.number(),
    responseRate: z.number(),
    bestContactChannel: z.string().nullable().optional(),
    bestContactTime: z.string().nullable().optional(),
  }),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    const personalized = await personalizeMessage(parsed.data);
    return NextResponse.json({ message: personalized });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
