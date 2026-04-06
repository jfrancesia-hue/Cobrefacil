import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generatePaymentLink } from "@/lib/payment-link-generator";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { companies: { take: 1 } },
  });
  if (!dbUser?.companies[0]) return NextResponse.json({ error: "Sin empresa" }, { status: 400 });

  try {
    const link = await generatePaymentLink({
      debtId: id,
      companyId: dbUser.companies[0].id,
    });
    return NextResponse.json({ link });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
