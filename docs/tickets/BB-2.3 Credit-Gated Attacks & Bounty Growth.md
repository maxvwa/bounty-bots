# BB-2.3: Credit-Gated Attacks & Bounty Growth

**Project:** bounty-bots

**Priority:** Critical

**Status:** Ready for Dev

**Parent:** BB-2

**Depends On:** BB-2.1, BB-1.3

**Blocks:** BB-2.4, BB-2.5

---

### **1. Description**

Gate attack actions behind credits and grow challenge bounties as users spend credits.

An "attack" is defined as a user message sent to a challenge conversation.

---

### **2. Pre-Requisite: Documentation Task**

* [ ] Update: `docs/features/BB-2-credits-economy.md` (attack spend + bounty growth rules)

---

### **3. Technical Requirements**

#### **A. Spend Logic**

On `POST /conversations/{id}/messages`:
1. Resolve challenge and `attack_cost_credits`
2. Lock user wallet row (`FOR UPDATE`)
3. Validate `balance_credits >= attack_cost_credits`; otherwise return `402`
4. Subtract credits from wallet
5. Insert ledger transaction (`transaction_type = attack_spend`, negative delta)
6. Increase challenge bounty:
   - `bounty_increment_cents = attack_cost_credits * 10`
   - `challenges.prize_pool_cents += bounty_increment_cents`
7. Persist message flow

All spend + bounty updates must be atomic.

#### **B. API Additions/Changes**

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/conversations/{id}/messages` | POST | Yes | Now consumes credits per attack |
| `/challenges` and `/challenges/{id}` | GET | Public | Must return current bounty value |

---

### **4. Acceptance Criteria**

* [ ] Attack call fails with `402 Payment Required` when credits are insufficient.
* [ ] Successful attack deducts credits and writes one spend ledger row.
* [ ] Challenge bounty increases exactly by `credits_spent * 10` cents per attack.
* [ ] Concurrent attacks cannot overspend wallet balance.
* [ ] Existing ownership checks remain enforced.

---

### **5. Constraints**

* **DO NOT** make bounty growth eventually consistent; update in same transaction as spend.
* **DO NOT** allow negative wallet balances.
* **DO NOT** move spend validation to frontend.

---

### **6. Testing and Documentation**

* [ ] Integration test: insufficient credits returns `402`.
* [ ] Integration test: successful attack updates wallet, ledger, and bounty.
* [ ] Concurrency test: simultaneous attacks from low balance cannot overspend.
* [ ] Update feature docs with attack-spend transaction flow.

---

### **7. Adhere to agents.md**

*Adhere to agents.md*
