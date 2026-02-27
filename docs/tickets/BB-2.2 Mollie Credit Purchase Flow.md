# BB-2.2: Mollie Credit Purchase Flow

**Project:** bounty-bots

**Priority:** High

**Status:** Ready for Dev

**Parent:** BB-2

**Depends On:** BB-2.1, BB-1.2

**Blocks:** BB-2.5

---

### **1. Description**

Implement prepaid credit top-ups using Mollie. Users pay once and receive credits in their wallet after successful payment confirmation.

---

### **2. Pre-Requisite: Documentation Task**

* [ ] Update: `docs/features/BB-2-credits-economy.md` (payment + wallet top-up flow)

---

### **3. Technical Requirements**

#### **A. Purchase Rules**

- Conversion is fixed: `credits_purchased = amount_cents / 10`.
- Only amounts divisible by `10` are valid.
- Crediting the wallet happens only after payment status becomes `paid`.

#### **B. API Endpoints**

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/credits/purchases` | POST | Yes | Create Mollie checkout for credit purchase, return `checkout_url` |
| `/credits/purchases/webhook` | POST | No | Mollie webhook callback, idempotent status update |
| `/credits/purchases/{id}` | GET | Yes | Read purchase status and credited amount |
| `/credits/balance` | GET | Yes | Return current wallet balance in credits |

#### **C. Webhook Idempotency**

On `paid` transition (first time only):
1. Update `credit_purchases.status = paid`
2. Increment `credit_wallets.balance_credits`
3. Insert `credit_transactions` ledger row (`transaction_type = purchase`, positive delta)

All three steps must be atomic.

---

### **4. Acceptance Criteria**

* [ ] Purchase creation returns a valid checkout URL and pending purchase record.
* [ ] Successful webhook marks purchase paid and increments wallet once.
* [ ] Repeated webhook calls do not double-credit wallet.
* [ ] `/credits/balance` returns accurate credit count.
* [ ] Unauthorized users cannot read or create purchases for other users.

---

### **5. Constraints**

* **DO NOT** credit wallet before Mollie `paid`.
* **DO NOT** expose Mollie API key in source or API responses.
* **DO NOT** perform credit updates outside transaction boundaries.

---

### **6. Testing and Documentation**

* [ ] Unit tests for purchase amount-to-credit conversion.
* [ ] Integration test for purchase creation.
* [ ] Integration test for webhook idempotency (same event twice).
* [ ] Integration test for balance endpoint auth and ownership.
* [ ] Update feature docs with top-up sequence diagram.

---

### **7. Adhere to agents.md**

*Adhere to agents.md*
