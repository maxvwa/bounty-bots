-- Users table and sequence
CREATE SEQUENCE IF NOT EXISTS user_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT PRIMARY KEY,
    reference UUID UNIQUE NOT NULL,
    timezone_id BIGINT NOT NULL REFERENCES timezones (timezone_id),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_reference ON users (reference);
