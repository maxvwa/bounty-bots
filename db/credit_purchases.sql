-- Credit purchases table and sequence
CREATE SEQUENCE IF NOT EXISTS credit_purchase_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS credit_purchases (
    credit_purchase_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (user_id),
    mollie_payment_id TEXT UNIQUE,
    amount_cents BIGINT NOT NULL,
    credits_purchased BIGINT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON credit_purchases (user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_status ON credit_purchases (status);
