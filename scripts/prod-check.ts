import "dotenv/config";

const required = [
  "DATABASE_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "ENCRYPTION_KEY",
  "PAYMENT_LINK_SECRET",
  "CRON_SECRET",
  "MERCADOPAGO_ACCESS_TOKEN",
  "MERCADOPAGO_WEBHOOK_SECRET",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_WHATSAPP_FROM",
  "TWILIO_SMS_FROM",
  "RESEND_API_KEY",
] as const;

const optionalAi = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY"] as const;

const placeholderPatterns = [
  /change-me/i,
  /dummy/i,
  /example\.com/i,
  /USER:PASSWORD/i,
  /PROJECT\.supabase\.co/i,
  /SUPABASE_ANON_KEY/i,
  /APP_USR_OR_TEST_TOKEN/i,
  /WEBHOOK_SIGNATURE_SECRET/i,
  /TWILIO_AUTH_TOKEN/i,
];

function isMissing(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}

function isPlaceholder(value: string): boolean {
  return placeholderPatterns.some((pattern) => pattern.test(value));
}

function requireUrl(name: string, errors: string[]) {
  const value = process.env[name];
  if (!value) return;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && name !== "DATABASE_URL") {
      errors.push(`${name} debe usar https`);
    }
  } catch {
    errors.push(`${name} no es una URL valida`);
  }
}

const errors: string[] = [];
const warnings: string[] = [];

for (const name of required) {
  const value = process.env[name] ?? "";
  if (isMissing(value)) {
    errors.push(`Falta ${name}`);
    continue;
  }
  if (isPlaceholder(value)) {
    errors.push(`${name} parece ser placeholder`);
  }
}

for (const name of ["ENCRYPTION_KEY", "PAYMENT_LINK_SECRET", "CRON_SECRET"]) {
  const value = process.env[name];
  if (value && value.length < 32) {
    errors.push(`${name} debe tener al menos 32 caracteres`);
  }
}

requireUrl("NEXT_PUBLIC_APP_URL", errors);
requireUrl("NEXT_PUBLIC_SUPABASE_URL", errors);

if (process.env.NEXT_PUBLIC_APP_URL?.startsWith("http://localhost")) {
  errors.push("NEXT_PUBLIC_APP_URL no debe apuntar a localhost");
}

if (
  process.env.ENABLE_DEMO_MODE === "true" ||
  process.env.NEXT_PUBLIC_ENABLE_DEMO === "true"
) {
  errors.push("El modo demo debe estar deshabilitado para produccion");
}

if (!optionalAi.some((name) => !isMissing(process.env[name]))) {
  warnings.push("No hay proveedor IA configurado: OPENAI_API_KEY o ANTHROPIC_API_KEY");
}

if (errors.length) {
  console.error("Production check failed:");
  for (const error of errors) console.error(`- ${error}`);
  if (warnings.length) {
    console.warn("\nWarnings:");
    for (const warning of warnings) console.warn(`- ${warning}`);
  }
  process.exit(1);
}

console.log("Production check passed.");
if (warnings.length) {
  console.warn("Warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}
