# Production checklist

Use this before promoting CobrarFacil from staging to production.

## Required commands

```bash
npm run lint
npm run typecheck
npm run prod:check
npm run build
npm run db:migrate:deploy
```

## Environment

- Set every variable in `.env.example` in the production platform.
- Keep `ENABLE_DEMO_MODE=false` and `NEXT_PUBLIC_ENABLE_DEMO=false`.
- Use 32+ character random values for `ENCRYPTION_KEY`, `PAYMENT_LINK_SECRET`, and `CRON_SECRET`.
- Set `NEXT_PUBLIC_APP_URL` to the final HTTPS app URL before running `next build`.
- Configure production Supabase URLs/keys, MercadoPago credentials, Twilio WhatsApp, and Resend.
- Store MercadoPago webhook secret from the production webhook configuration.

## Payments

- Run the migration `0002_payment_idempotency` before processing real payments.
- Verify MercadoPago webhooks are delivered with valid `x-signature` and `x-request-id` headers.
- Send the same MercadoPago notification twice in staging and confirm only one `Payment` row is created.
- Confirm approved payments update `Debt.paidAmount`, `Debt.status`, `Debtor.totalPaid`, and analytics once.

## Auth and access

- Confirm `/api/demo/login` returns 404 in production.
- Confirm unauthenticated visits to dashboard routes redirect to `/login`.
- Confirm API writes cannot access another company's debtors, debts, campaigns, or sequences.

## Operations

- Protect `/api/collection/cron` with `Authorization: Bearer $CRON_SECRET`.
- Configure error logging for route handlers and webhook failures.
- Run a full staging flow: register, onboard, create debtor, create debt, generate payment link, pay in sandbox, receive webhook.
