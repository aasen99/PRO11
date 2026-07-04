-- Payment accounting / reconciliation fields for PRO11 betalingsrapport
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(20);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_order_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_transaction_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gross_amount INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS fee_amount INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS net_amount INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS fee_source VARCHAR(30);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payout_id VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payout_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reconciled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS accounting_note TEXT;

-- Backfill from legacy columns where possible
UPDATE payments
SET
  gross_amount = COALESCE(gross_amount, amount),
  provider_order_id = COALESCE(provider_order_id, stripe_payment_intent_id),
  payment_provider = COALESCE(
    payment_provider,
    CASE
      WHEN payment_method = 'paypal' THEN 'paypal'
      WHEN payment_method = 'vipps' THEN 'vipps'
      ELSE NULL
    END
  ),
  paid_at = COALESCE(paid_at, updated_at, created_at)
WHERE gross_amount IS NULL OR provider_order_id IS NULL OR paid_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_provider_transaction_id ON payments(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_reconciled ON payments(reconciled);
