-- Credit wallets table and sequence
CREATE SEQUENCE IF NOT EXISTS credit_wallet_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS credit_wallets (
    credit_wallet_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users (user_id),
    balance_credits BIGINT NOT NULL CHECK (balance_credits >= 0),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_wallets_user_id ON credit_wallets (user_id);
