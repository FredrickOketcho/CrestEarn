ALTER TABLE users
  ADD COLUMN referral_code varchar(12),
  ADD COLUMN referred_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;

UPDATE users
SET referral_code = upper(substr(replace(id::text, '-', ''), 1, 12));

ALTER TABLE users
  ALTER COLUMN referral_code SET NOT NULL,
  ADD CONSTRAINT users_referral_code_unique UNIQUE (referral_code),
  ADD CONSTRAINT users_cannot_refer_self CHECK (referred_by_user_id IS NULL OR referred_by_user_id <> id);

CREATE INDEX users_referred_by_user_id_idx ON users(referred_by_user_id);

ALTER TABLE wallet_ledger
  DROP CONSTRAINT wallet_ledger_transaction_type_check,
  ADD CONSTRAINT wallet_ledger_transaction_type_check
    CHECK (transaction_type IN ('deposit', 'withdrawal', 'investment', 'yield', 'refund', 'adjustment', 'referral_bonus'));

CREATE FUNCTION update_referral_bonus_from_deposit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  referrer_id uuid;
  first_deposit_amount bigint;
  reward_key text;
BEGIN
  IF NEW.transaction_type <> 'deposit' THEN
    RETURN NEW;
  END IF;

  -- Serialize deposit status changes for this member so only the first posted
  -- deposit earns a referral bonus, even if two deposits settle concurrently.
  PERFORM 1 FROM users WHERE id = NEW.user_id FOR UPDATE;

  SELECT referred_by_user_id
  INTO referrer_id
  FROM users
  WHERE id = NEW.user_id;

  IF referrer_id IS NULL THEN
    RETURN NEW;
  END IF;

  reward_key := 'referral-user:' || NEW.user_id::text;

  SELECT amount_ugx
  INTO first_deposit_amount
  FROM wallet_ledger
  WHERE user_id = NEW.user_id
    AND transaction_type = 'deposit'
    AND status = 'posted'
  ORDER BY created_at, id
  LIMIT 1;

  IF first_deposit_amount IS NOT NULL AND first_deposit_amount >= 10 THEN
    INSERT INTO wallet_ledger (
      id, user_id, transaction_type, amount_ugx, status,
      idempotency_key, external_reference
    )
    VALUES (
      gen_random_uuid(), referrer_id, 'referral_bonus',
      first_deposit_amount / 10, 'posted', reward_key,
      'REFERRAL:' || NEW.user_id::text
    )
    ON CONFLICT (user_id, idempotency_key)
    DO UPDATE SET
      amount_ugx = EXCLUDED.amount_ugx,
      status = 'posted';
  ELSE
    UPDATE wallet_ledger
    SET status = NEW.status
    WHERE user_id = referrer_id
      AND idempotency_key = reward_key
      AND NEW.status IN ('failed', 'reversed');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER wallet_ledger_referral_bonus_trigger
AFTER INSERT OR UPDATE OF status, amount_ugx ON wallet_ledger
FOR EACH ROW
EXECUTE FUNCTION update_referral_bonus_from_deposit();
