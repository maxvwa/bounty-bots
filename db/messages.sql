-- Messages table and sequence
CREATE SEQUENCE IF NOT EXISTS message_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS messages (
    message_id BIGINT PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations (conversation_id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id);
