-- Attempts table and sequence
CREATE SEQUENCE IF NOT EXISTS attempt_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS attempts (
    attempt_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (user_id),
    challenge_id BIGINT NOT NULL REFERENCES challenges (challenge_id),
    payment_id BIGINT REFERENCES payments (payment_id),
    submitted_secret TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON attempts (user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_challenge_id ON attempts (challenge_id);
CREATE INDEX IF NOT EXISTS idx_attempts_payment_id ON attempts (payment_id);
