-- Challenges table and sequence
CREATE SEQUENCE IF NOT EXISTS challenge_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS challenges (
    challenge_id BIGINT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    secret TEXT NOT NULL,
    cost_per_attempt_cents BIGINT NOT NULL,
    prize_pool_cents BIGINT NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
