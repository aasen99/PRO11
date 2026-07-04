ALTER TABLE teams ADD COLUMN IF NOT EXISTS prize_payout_type VARCHAR(20)
  CHECK (prize_payout_type IN ('norwegian', 'international'));
ALTER TABLE teams ADD COLUMN IF NOT EXISTS prize_bank_account VARCHAR(20);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS prize_iban VARCHAR(34);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS prize_swift_bic VARCHAR(11);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS prize_account_holder VARCHAR(255);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS prize_payout_submitted_at TIMESTAMP WITH TIME ZONE;
