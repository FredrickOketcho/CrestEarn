CREATE TABLE users (
  id uuid PRIMARY KEY,
  full_name varchar(120) NOT NULL,
  email varchar(254) NOT NULL UNIQUE,
  phone varchar(20) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth_sessions (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_sessions_user_id_idx ON auth_sessions(user_id);
CREATE INDEX auth_sessions_expires_at_idx ON auth_sessions(expires_at);

CREATE TABLE projects (
  id text PRIMARY KEY,
  name varchar(120) NOT NULL,
  price_ugx bigint NOT NULL CHECK (price_ugx > 0),
  previous_price_ugx bigint CHECK (previous_price_ugx IS NULL OR previous_price_ugx > 0),
  duration_days integer CHECK (duration_days IS NULL OR duration_days > 0),
  daily_yield_bps integer NOT NULL DEFAULT 1000 CHECK (daily_yield_bps BETWEEN 0 AND 10000),
  image_key varchar(80) NOT NULL,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX projects_active_sort_idx ON projects(is_active, sort_order);

CREATE TABLE investments (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  project_id text NOT NULL REFERENCES projects(id),
  principal_ugx bigint NOT NULL CHECK (principal_ugx > 0),
  daily_yield_bps integer NOT NULL CHECK (daily_yield_bps BETWEEN 0 AND 10000),
  duration_days integer NOT NULL CHECK (duration_days > 0),
  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  started_at timestamptz,
  matures_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX investments_user_created_idx ON investments(user_id, created_at DESC);

CREATE TABLE wallet_ledger (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  investment_id uuid REFERENCES investments(id),
  transaction_type varchar(32) NOT NULL
    CHECK (transaction_type IN ('deposit', 'withdrawal', 'investment', 'yield', 'refund', 'adjustment')),
  amount_ugx bigint NOT NULL CHECK (amount_ugx <> 0),
  status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'posted', 'failed', 'reversed')),
  idempotency_key varchar(128),
  external_reference varchar(160),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX wallet_ledger_user_created_idx ON wallet_ledger(user_id, created_at DESC);

CREATE TABLE chat_messages (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender varchar(16) NOT NULL CHECK (sender IN ('user', 'support')),
  body varchar(4000) NOT NULL CHECK (length(body) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chat_messages_user_created_idx ON chat_messages(user_id, created_at);
