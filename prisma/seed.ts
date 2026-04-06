import { PrismaClient, DebtStatus, MessageStatus, StepChannel } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { subDays, addDays } from "date-fns";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const firstNames = ["Juan", "María", "Carlos", "Ana", "Pedro", "Laura", "Diego", "Valentina", "Matías", "Florencia", "Gonzalo", "Camila", "Sebastián", "Lucía", "Rodrigo", "Agustina", "Nicolás", "Sofía", "Andrés", "Martina", "Federico", "Micaela", "Facundo", "Natalia", "Ezequiel", "Paula", "Leandro", "Romina", "Hernán", "Verónica"];
const lastNames = ["González", "Rodríguez", "Gómez", "Fernández", "López", "Díaz", "Martínez", "Pérez", "García", "Sánchez", "Romero", "Sosa", "Torres", "Álvarez", "Ruiz", "Ramírez", "Flores", "Acosta", "Medina", "Castro"];
const concepts = ["Cuota Enero 2026", "Cuota Febrero 2026", "Cuota Marzo 2026", "Cuota Abril 2026", "Alquiler Marzo", "Alquiler Abril", "Factura #1234", "Factura #1567", "Honorarios Marzo", "Membresía mensual", "Cuota préstamo", "Servicio mensual"];

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(): string {
  return `+549${rnd(11, 11)}${rnd(1000, 9999)}${rnd(1000, 9999)}`;
}

async function main() {
  console.log("🌱 Iniciando seed...");

  // 1. Crear usuario
  const user = await prisma.user.upsert({
    where: { email: "admin@cobrarfacil.com" },
    update: {},
    create: {
      email: "admin@cobrarfacil.com",
      name: "Admin CobrarFácil",
      supabaseId: "seed-user-id-" + Date.now(),
    },
  });

  // 2. Crear empresa
  const company = await prisma.company.upsert({
    where: { slug: "demo-fintech" },
    update: {},
    create: {
      name: "Demo Fintech S.A.",
      slug: "demo-fintech",
      industry: "fintech",
      email: "admin@demo.com",
      currency: "ARS",
      timezone: "America/Argentina/Buenos_Aires",
      defaultGraceDays: 5,
      userId: user.id,
    },
  });

  console.log(`✅ Empresa: ${company.name}`);

  // 3. Secuencia default
  const existingSeq = await prisma.collectionSequence.findFirst({
    where: { companyId: company.id, isDefault: true },
  });

  let sequence;
  if (!existingSeq) {
    sequence = await prisma.collectionSequence.create({
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
      include: { steps: true },
    });
    console.log("✅ Secuencia default creada");
  } else {
    sequence = existingSeq;
  }

  // 4. Crear 100 deudores
  console.log("👥 Creando 100 deudores...");
  const debtors = [];

  for (let i = 0; i < 100; i++) {
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    const whatsapp = generatePhone();

    // Distribuir risk scores: 30% bajo, 40% medio, 30% alto
    let riskScore: number;
    if (i < 30) riskScore = rnd(5, 29);       // buen pagador
    else if (i < 70) riskScore = rnd(30, 60);  // intermedio
    else riskScore = rnd(61, 95);              // alto riesgo

    const avgPaymentDelay = riskScore < 30 ? rnd(0, 5) : riskScore < 60 ? rnd(5, 20) : rnd(15, 60);

    const debtor = await prisma.debtor.upsert({
      where: { companyId_email: { companyId: company.id, email } },
      update: {},
      create: {
        name,
        email,
        whatsapp,
        phone: whatsapp,
        riskScore,
        avgPaymentDelay,
        responseRate: rnd(10, 80),
        bestContactChannel: randomItem(["whatsapp", "email", null, null]) as string | null,
        bestContactTime: randomItem(["morning", "afternoon", "evening", null]) as string | null,
        companyId: company.id,
      },
    });
    debtors.push(debtor);
  }

  console.log("✅ 100 deudores creados");

  // 5. Crear 200 deudas (2 por deudor aprox)
  console.log("💸 Creando 200 deudas...");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let debtCount = 0;
  let paidCount = 0;
  let overdueCount = 0;

  for (const debtor of debtors) {
    // Cada deudor tiene 2 deudas
    for (let j = 0; j < 2; j++) {
      const amount = rnd(5000, 150000);
      const concept = randomItem(concepts);

      // Distribuir fechas: pasadas, presentes, futuras
      let dueDate: Date;
      let status: DebtStatus;
      let paidAt: Date | null = null;
      let paidAmount = 0;

      const scenario = rnd(1, 10);

      if (scenario <= 3) {
        // Pagada
        dueDate = subDays(today, rnd(5, 60));
        status = "PAID";
        paidAt = subDays(today, rnd(0, 5));
        paidAmount = amount;
      } else if (scenario <= 6) {
        // Vencida sin pagar
        dueDate = subDays(today, rnd(1, 45));
        status = "OVERDUE";
        overdueCount++;
      } else if (scenario <= 8) {
        // Pendiente (futura)
        dueDate = addDays(today, rnd(1, 30));
        status = "PENDING";
      } else {
        // Pago parcial
        dueDate = subDays(today, rnd(3, 20));
        status = "PARTIAL";
        paidAmount = amount * 0.5;
      }

      const debt = await prisma.debt.create({
        data: {
          concept,
          amount,
          originalAmount: amount,
          dueDate,
          status,
          paidAt,
          paidAmount,
          paymentMethod: paidAt ? "MERCADOPAGO" : null,
          debtorId: debtor.id,
          companyId: company.id,
        },
      });

      // Pago aprobado si está pagada
      if (status === "PAID" || status === "PARTIAL") {
        await prisma.payment.create({
          data: {
            amount: paidAmount,
            method: "MERCADOPAGO",
            status: "APPROVED",
            mpPaymentId: `mp_seed_${debt.id}`,
            mpStatus: "approved",
            debtId: debt.id,
            companyId: company.id,
            createdAt: paidAt ?? subDays(today, 1),
          },
        });
        paidCount++;
      }

      debtCount++;
    }
  }

  console.log(`✅ ${debtCount} deudas creadas (${paidCount} pagadas, ${overdueCount} vencidas)`);

  // 6. Actualizar totals de deudores
  for (const debtor of debtors) {
    const debts = await prisma.debt.findMany({ where: { debtorId: debtor.id } });
    const totalDebt = debts.reduce((s, d) => s + Number(d.amount), 0);
    const totalPaid = debts.reduce((s, d) => s + Number(d.paidAmount), 0);
    await prisma.debtor.update({
      where: { id: debtor.id },
      data: { totalDebt, totalPaid },
    });
  }

  // 7. Crear mensajes simulados (100 mensajes)
  console.log("📨 Creando mensajes de ejemplo...");
  const channels: StepChannel[] = ["WHATSAPP", "EMAIL", "SMS"];
  const statuses: MessageStatus[] = ["SENT", "DELIVERED", "READ", "FAILED", "SENT", "READ", "READ"];

  const debtsList = await prisma.debt.findMany({
    where: { companyId: company.id, status: { in: ["OVERDUE", "PARTIAL"] } },
    take: 50,
  });

  for (const debt of debtsList.slice(0, 50)) {
    const channel = randomItem(channels);
    const status = randomItem(statuses);
    await prisma.collectionMessage.create({
      data: {
        channel,
        content: `Hola, este es un recordatorio de pago. Tu deuda de $${Number(debt.amount).toLocaleString("es-AR")} está pendiente.`,
        status,
        sentAt: subDays(today, rnd(1, 30)),
        deliveredAt: status !== "SENT" && status !== "FAILED" ? subDays(today, rnd(1, 29)) : null,
        readAt: status === "READ" ? subDays(today, rnd(1, 28)) : null,
        aiPersonalized: Math.random() > 0.7,
        debtorId: debt.debtorId,
        debtId: debt.id,
        companyId: company.id,
        createdAt: subDays(today, rnd(1, 30)),
      },
    });
  }

  console.log("✅ Mensajes creados");

  // 8. Analytics de ejemplo
  await prisma.collectionAnalytics.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      type: "CRON_RUN",
      metadata: { processed: rnd(10, 50), sent: rnd(5, 30), errors: rnd(0, 3) },
      companyId: company.id,
      createdAt: subDays(today, i),
    })),
    skipDuplicates: true,
  });

  const totals = await prisma.debt.aggregate({
    where: { companyId: company.id },
    _sum: { amount: true, paidAmount: true },
    _count: true,
  });

  console.log("\n🎉 Seed completado!");
  console.log(`  📊 Total deudas: $${Number(totals._sum.amount ?? 0).toLocaleString("es-AR")}`);
  console.log(`  💚 Total cobrado: $${Number(totals._sum.paidAmount ?? 0).toLocaleString("es-AR")}`);
  console.log(`  📈 Tasa recupero: ${((Number(totals._sum.paidAmount ?? 0) / Number(totals._sum.amount ?? 1)) * 100).toFixed(1)}%`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
