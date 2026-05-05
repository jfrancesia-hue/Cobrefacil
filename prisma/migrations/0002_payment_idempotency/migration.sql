-- MercadoPago retries webhook notifications, so a payment provider ID must be
-- processed only once.
CREATE UNIQUE INDEX "Payment_mpPaymentId_key" ON "Payment"("mpPaymentId");
