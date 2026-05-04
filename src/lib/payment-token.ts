import crypto from "crypto";

interface PaymentTokenPayload {
  debtId: string;
  companyId: string;
}

function getPaymentSecret(): string {
  const secret = process.env.PAYMENT_LINK_SECRET ?? process.env.ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("PAYMENT_LINK_SECRET debe tener al menos 32 caracteres");
  }
  return secret;
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", getPaymentSecret())
    .update(payload)
    .digest("base64url");
}

export function createPaymentToken(payload: PaymentTokenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyPaymentToken(token: string): PaymentTokenPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (
      typeof payload?.debtId !== "string" ||
      typeof payload?.companyId !== "string"
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
