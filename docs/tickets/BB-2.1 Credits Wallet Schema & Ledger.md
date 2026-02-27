# BB-2.1: Credits Wallet Schema & Ledger

**Project:** bounty-bots

**Priority:** Critical

**Status:** Ready for Dev

**Parent:** BB-2

**Depends On:** BB-1.1

**Blocks:** BB-2.2, BB-2.3, BB-2.4, BB-2.5

---

### **1. Description**

Create the data model for user credits and immutable credit accounting.

This ticket adds wallet balance tracking and an append-only ledger so spending and top-ups are auditable and concurrency-safe.

---

### **2. Pre-Requisite: Documentation Task**

* [ ] Create: `docs/features/BB-2-credits-economy.md`
* [ ] Update: `docs/README.md` (Add feature index entry)

---

### **3. Technical Requirements & Schema**

#### **A. Database Layer**

Create new SQL files:

| Table | Action | Key Columns/Constraints |
| --- | --- | --- |
| `credit_wallets` | New | `credit_wallet_id` (BIGINT PK), `user_id` (FK UNIQUE), `balance_credits` (BIGINT NOT NULL, CHECK >= 0), UTC timestamps |
| `credit_transactions` | New | `credit_transaction_id` (BIGINT PK), `user_id` (FK), `challenge_id` (FK nullable), `credit_purchase_id` (FK nullable), `delta_credits` (BIGINT signed), `transaction_type` (TEXT), `created_at` |
| `credit_purchases` | New | `credit_purchase_id` (BIGINT PK), `user_id` (FK), `mollie_payment_id` (TEXT UNIQUE), `amount_cents` (BIGINT), `credits_purchased` (BIGINT), `status` (TEXT), UTC timestamps |

Update existing schema:

| Table | Action | Key Columns/Constraints |
| --- | --- | --- |
| `challenges` | Update | Add `attack_cost_credits` (BIGINT NOT NULL) default `1` |

Notes:
- Keep one table per SQL file, with explicit table-specific sequence.
- Keep initialization idempotent.
- Keep all timestamps UTC (application-assigned).

#### **B. ORM / Static Data**

Add models under `backend/app/models/`:
- `credit_wallets.py`
- `credit_transactions.py`
- `credit_purchases.py`

Update exports in `backend/app/models/__init__.py`.

Add a constant mapping for conversion in static/config space:
- `CENTS_PER_CREDIT = 10` (single source of truth)

---

### **4. Acceptance Criteria**

* [ ] All new tables and sequences exist and initialize idempotently.
* [ ] `credit_wallets.user_id` uniqueness enforced (one wallet per user).
* [ ] `balance_credits` cannot go below zero by constraint and application logic.
* [ ] `attack_cost_credits` exists on all challenges with default `1`.
* [ ] ORM models map cleanly; app starts successfully against fresh DB.

---

### **5. Constraints**

* **DO NOT** use floating point for money or credits.
* **DO NOT** store mutable balance changes without corresponding ledger row.
* **DO NOT** use `SERIAL/BIGSERIAL`; use explicit sequences and BIGINT PKs.

---

### **6. Testing and Documentation**

* [ ] Schema initialization test for new tables and columns.
* [ ] Constraint test for non-negative `balance_credits`.
* [ ] Update feature doc with ERD for credits data model.

---

### **7. Adhere to agents.md**

*Adhere to agents.md*
