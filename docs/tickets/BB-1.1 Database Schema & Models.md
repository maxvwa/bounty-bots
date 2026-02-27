# BB-1.1: Database Schema & Models

**Project:** bounty-bots

**Priority:** Critical

**Status:** Ready for Dev

**Parent:** BB-1

**Depends On:** —

**Blocks:** BB-1.2, BB-1.3, BB-1.4, BB-1.5, BB-1.6

---

### **1. Description**

Create the database tables and SQLAlchemy ORM models needed for the prompt injection challenge system. This is the foundation that all other BB-1 sub-tickets build on.

---

### **2. Pre-Requisite: Documentation Task**

* [ ] Create: `docs/features/BB-1-prompt-injection-challenges.md` (initial skeleton)
* [ ] Update: `docs/README.md` (Add to Feature Index)

---

### **3. Technical Requirements & Schema**

#### **A. Database Layer**

Create the following SQL files in `db/` and add them to `DB_INIT_ORDER` in `database.py`:

| Table | Action | Key Columns/Constraints |
| --- | --- | --- |
| `users` | Update | Add `email` (VARCHAR, UNIQUE, NOT NULL), `password_hash` (VARCHAR, NOT NULL) |
| `challenges` | New | `id` (PK, SERIAL), `title` (VARCHAR, NOT NULL), `description` (TEXT), `difficulty` (VARCHAR, NOT NULL, CHECK: easy/medium/hard), `cost_per_attempt` (DECIMAL(10,2), NOT NULL), `prize_amount` (DECIMAL(10,2), NOT NULL), `secret` (TEXT, NOT NULL), `system_prompt` (TEXT), `is_active` (BOOLEAN, DEFAULT true), `created_at` (TIMESTAMPTZ, DEFAULT NOW()) |
| `conversations` | New | `id` (PK, SERIAL), `user_id` (FK → users, NOT NULL), `challenge_id` (FK → challenges, NOT NULL), `started_at` (TIMESTAMPTZ, DEFAULT NOW()) |
| `messages` | New | `id` (PK, SERIAL), `conversation_id` (FK → conversations, NOT NULL), `role` (VARCHAR, NOT NULL, CHECK: user/assistant/system), `content` (TEXT, NOT NULL), `created_at` (TIMESTAMPTZ, DEFAULT NOW()) |
| `attempts` | New | `id` (PK, SERIAL), `user_id` (FK → users, NOT NULL), `challenge_id` (FK → challenges, NOT NULL), `conversation_id` (FK → conversations, NOT NULL), `submitted_secret` (TEXT, NOT NULL), `is_correct` (BOOLEAN, NOT NULL), `payment_id` (VARCHAR, nullable), `created_at` (TIMESTAMPTZ, DEFAULT NOW()) |

#### **B. ORM Models**

Create SQLAlchemy models in `backend/app/models/`:

- `challenges.py` — `Challenge` model
- `conversations.py` — `Conversation` model
- `messages.py` — `Message` model
- `attempts.py` — `Attempt` model
- Update `users.py` — add `email` and `password_hash` columns

#### **C. Seed Data**

Add a seed function (similar to `seed_timezones`) that inserts 3 sample challenges:
- Easy (low cost, low prize)
- Medium (medium cost, medium prize)
- Hard (high cost, high prize)

Each with a simple secret and a placeholder system prompt.

---

### **4. Acceptance Criteria**

* [ ] All SQL files exist in `db/` and are applied in correct dependency order.
* [ ] All ORM models exist and map to the tables.
* [ ] `users` table has `email` and `password_hash` columns.
* [ ] Foreign key relationships are correct (conversations → users/challenges, messages → conversations, attempts → users/challenges/conversations).
* [ ] 3 seed challenges are inserted on startup.
* [ ] Application starts without errors with the new schema.

---

### **5. Constraints**

* **DO NOT** use local time; all timestamps must be **UTC** (`TIMESTAMPTZ`).
* **DO NOT** create API endpoints — this ticket is schema/models only.

---

### **6. Testing and Documentation**

* [ ] Verify tables are created correctly by starting the app against a fresh database.
* [ ] Verify seed challenges are inserted.
* [ ] Update `docs/features/BB-1-prompt-injection-challenges.md` with schema diagram.

---

### **7. Adhere to agents.md**

*Adhere to agents.md*
