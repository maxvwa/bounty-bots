-- Conversations table and sequence
CREATE SEQUENCE IF NOT EXISTS conversation_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS conversations (
    conversation_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (user_id),
    challenge_id BIGINT NOT NULL REFERENCES challenges (challenge_id),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_challenge_id ON conversations (challenge_id);
