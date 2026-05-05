import assert from "node:assert/strict";
import test from "node:test";
import { createPaymentToken, verifyPaymentToken } from "../src/lib/payment-token";

test("payment tokens round-trip when signed with the configured secret", () => {
  process.env.PAYMENT_LINK_SECRET = "0123456789abcdef0123456789abcdef";

  const token = createPaymentToken({
    debtId: "debt_123",
    companyId: "company_456",
  });

  assert.deepEqual(verifyPaymentToken(token), {
    debtId: "debt_123",
    companyId: "company_456",
  });
});

test("payment token verification rejects tampering", () => {
  process.env.PAYMENT_LINK_SECRET = "0123456789abcdef0123456789abcdef";

  const token = createPaymentToken({
    debtId: "debt_123",
    companyId: "company_456",
  });
  const [payload, signature] = token.split(".");
  const tamperedPayload = Buffer.from(
    JSON.stringify({ debtId: "debt_other", companyId: "company_456" }),
    "utf8"
  ).toString("base64url");

  assert.equal(verifyPaymentToken(`${tamperedPayload}.${signature}`), null);
  assert.equal(verifyPaymentToken(`${payload}.bad-signature`), null);
});
