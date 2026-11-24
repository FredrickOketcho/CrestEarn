ALTER TABLE investments
  ADD COLUMN IF NOT EXISTS project_name varchar(120);

ALTER TABLE investments
  ADD COLUMN IF NOT EXISTS idempotency_key varchar(128);

CREATE UNIQUE INDEX IF NOT EXISTS investments_user_idempotency_key_uidx
  ON investments(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
