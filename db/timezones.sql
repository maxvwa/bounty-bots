-- Timezones table and sequence (stable low-cardinality lookup)
CREATE SEQUENCE IF NOT EXISTS timezone_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS timezones (
    timezone_id BIGINT PRIMARY KEY,
    timezone_name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL
);
