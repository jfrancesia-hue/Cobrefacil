import { Company, User } from "@/generated/prisma/client";
import { DEMO_COOKIE, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo-auth";

export const DEMO_COMPANY_ID = "demo-company";
export { DEMO_COOKIE, DEMO_EMAIL, DEMO_PASSWORD };

export const demoUser = {
  id: "demo-user",
  email: DEMO_EMAIL,
  name: "Usuario Demo",
  supabaseId: "demo-supabase-user",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
} as User;

export const demoCompany = {
  id: DEMO_COMPANY_ID,
  name: "Demo Fintech S.A.",
  slug: "demo-fintech",
  logo: null,
  phone: "+54 11 5555-0100",
  whatsapp: "+54 9 11 5555-0100",
  email: "cobranzas@demo-fintech.com",
  website: "https://demo-fintech.com",
  industry: "Fintech",
  currency: "ARS",
  timezone: "America/Argentina/Buenos_Aires",
  defaultGraceDays: 5,
  defaultLateFeePercent: null,
  mpAccessToken: null,
  mpPublicKey: null,
  plan: "GROWTH",
  planExpiresAt: null,
  commissionRate: 0.03,
  userId: demoUser.id,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
} as unknown as Company;

const today = new Date();

function daysAgo(days: number): Date {
  const date = new Date(today);
  date.setDate(date.getDate() - days);
  return date;
}

export const demoDashboardData = {
  debtors: 128,
  debts: [
    {
      id: "demo-debt-1",
      amount: 185000,
      paidAmount: 0,
      status: "OVERDUE",
      dueDate: daysAgo(18),
      paidAt: null,
      concept: "Factura #1567",
      debtor: { name: "María González" },
    },
    {
      id: "demo-debt-2",
      amount: 92000,
      paidAmount: 46000,
      status: "PARTIAL",
      dueDate: daysAgo(10),
      paidAt: null,
      concept: "Cuota préstamo",
      debtor: { name: "Carlos Medina" },
    },
    {
      id: "demo-debt-3",
      amount: 240000,
      paidAmount: 240000,
      status: "PAID",
      dueDate: daysAgo(24),
      paidAt: daysAgo(3),
      concept: "Servicio mensual",
      debtor: { name: "Lucía Ramírez" },
    },
    {
      id: "demo-debt-4",
      amount: 76000,
      paidAmount: 0,
      status: "OVERDUE",
      dueDate: daysAgo(7),
      paidAt: null,
      concept: "Alquiler Abril",
      debtor: { name: "Nicolás Torres" },
    },
    {
      id: "demo-debt-5",
      amount: 318000,
      paidAmount: 318000,
      status: "PAID",
      dueDate: daysAgo(42),
      paidAt: daysAgo(12),
      concept: "Honorarios Marzo",
      debtor: { name: "Sofía Castro" },
    },
    {
      id: "demo-debt-6",
      amount: 132000,
      paidAmount: 0,
      status: "PENDING",
      dueDate: daysAgo(-8),
      paidAt: null,
      concept: "Cuota Mayo",
      debtor: { name: "Andrés López" },
    },
  ],
  messages: [
    { status: "READ", channel: "WHATSAPP", createdAt: daysAgo(1) },
    { status: "READ", channel: "WHATSAPP", createdAt: daysAgo(2) },
    { status: "DELIVERED", channel: "EMAIL", createdAt: daysAgo(2) },
    { status: "SENT", channel: "SMS", createdAt: daysAgo(3) },
    { status: "FAILED", channel: "EMAIL", createdAt: daysAgo(4) },
    { status: "READ", channel: "WHATSAPP", createdAt: daysAgo(5) },
    { status: "DELIVERED", channel: "SMS", createdAt: daysAgo(6) },
    { status: "READ", channel: "EMAIL", createdAt: daysAgo(7) },
  ],
  payments: [
    { amount: 420000, createdAt: daysAgo(152) },
    { amount: 610000, createdAt: daysAgo(122) },
    { amount: 770000, createdAt: daysAgo(93) },
    { amount: 690000, createdAt: daysAgo(62) },
    { amount: 920000, createdAt: daysAgo(31) },
    { amount: 558000, createdAt: daysAgo(8) },
  ],
};
