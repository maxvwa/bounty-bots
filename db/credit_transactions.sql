-- Credit transactions table and sequence
CREATE SEQUENCE IF NOT EXISTS credit_transaction_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS credit_transactions (
    credit_transaction_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (user_id),
    challenge_id BIGINT REFERENCES challenges (challenge_id),
    credit_purchase_id BIGINT REFERENCES credit_purchases (credit_purchase_id),
    delta_credits BIGINT NOT NULL,
    transaction_type TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_challenge_id ON credit_transactions (challenge_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_purchase_id ON credit_transactions (credit_purchase_id);
