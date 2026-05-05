-- Query indexes for company-scoped dashboards, lists, webhooks, and operational views.
CREATE INDEX "Debtor_companyId_name_idx" ON "Debtor"("companyId", "name");
CREATE INDEX "Debt_companyId_status_dueDate_idx" ON "Debt"("companyId", "status", "dueDate");
CREATE INDEX "Debt_debtorId_status_idx" ON "Debt"("debtorId", "status");
CREATE INDEX "CollectionMessage_companyId_createdAt_idx" ON "CollectionMessage"("companyId", "createdAt");
CREATE INDEX "CollectionMessage_companyId_channel_status_idx" ON "CollectionMessage"("companyId", "channel", "status");
CREATE INDEX "Payment_companyId_createdAt_idx" ON "Payment"("companyId", "createdAt");
CREATE INDEX "Payment_debtId_status_idx" ON "Payment"("debtId", "status");
CREATE INDEX "Campaign_companyId_status_createdAt_idx" ON "Campaign"("companyId", "status", "createdAt");
CREATE INDEX "CollectionAnalytics_companyId_createdAt_idx" ON "CollectionAnalytics"("companyId", "createdAt");
CREATE INDEX "AgentConversation_companyId_status_updatedAt_idx" ON "AgentConversation"("companyId", "status", "updatedAt");
