-- Payments table and sequence
CREATE SEQUENCE IF NOT EXISTS payment_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS payments (
    payment_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (user_id),
    challenge_id BIGINT NOT NULL REFERENCES challenges (challenge_id),
    mollie_payment_id TEXT UNIQUE,
    amount_cents BIGINT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_mollie_payment_id ON payments (mollie_payment_id);
