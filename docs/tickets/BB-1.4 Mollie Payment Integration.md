# BB-1.4: Mollie Payment Integration

**Project:** bounty-bots

**Priority:** High

**Status:** Ready for Dev

**Parent:** BB-1

**Depends On:** BB-1.2, BB-1.3

**Blocks:** BB-1.5

---

### **1. Description**

Integrate Mollie as the payment provider so users pay per secret submission attempt. Payment must be confirmed before the attempt is processed.

---

### **2. Pre-Requisite: Documentation Task**

* [ ] Update: `docs/features/BB-1-prompt-injection-challenges.md` (payment section)

---

### **3. Technical Requirements**

#### **A. Mollie Setup**

- Use the `mollie-api-python` SDK.
- Add `MOLLIE_API_KEY` to `config.py` (from environment variable).
- Create a Mollie service in `backend/app/services/mollie.py`.

#### **B. Payment Flow**

1. User clicks "Submit Secret" in the UI.
2. Frontend calls `POST /api/challenges/{id}/attempts/pay` with the `conversation_id`.
3. Backend creates a Mollie payment for `cost_per_attempt` and returns a `checkout_url`.
4. User is redirected to Mollie to pay.
5. After payment, Mollie sends a webhook to `POST /api/webhooks/mollie`.
6. Webhook handler verifies payment status. If `paid`, marks the payment record as confirmed.
7. User is redirected back to the app. Frontend polls or checks payment status, then submits the actual secret guess.

#### **C. API Endpoints**

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/api/challenges/{id}/attempts/pay` | POST | Yes | Create Mollie payment. Returns `{ payment_id, checkout_url }`. |
| `/api/webhooks/mollie` | POST | No (Mollie signature) | Mollie webhook callback. Updates payment status. |
| `/api/challenges/{id}/attempts/{payment_id}/status` | GET | Yes | Check if payment is confirmed. Returns `{ status: pending/paid/failed }`. |

#### **D. Database**

Add a `payments` table (or extend `attempts`):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | PK, SERIAL | |
| `user_id` | FK → users | |
| `challenge_id` | FK → challenges | |
| `conversation_id` | FK → conversations | |
| `mollie_payment_id` | VARCHAR, UNIQUE | From Mollie API |
| `amount` | DECIMAL(10,2) | |
| `status` | VARCHAR | pending / paid / failed |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

#### **E. Schemas**

- `PaymentCreateRequest` — conversation_id
- `PaymentCreateResponse` — payment_id, checkout_url
- `PaymentStatusResponse` — payment_id, status

---

### **4. Acceptance Criteria**

* [ ] `POST /api/challenges/{id}/attempts/pay` creates a Mollie payment and returns a checkout URL.
* [ ] Mollie webhook updates the payment status to `paid` on success.
* [ ] `GET .../status` correctly reflects payment state.
* [ ] Payment record is linked to user, challenge, and conversation.
* [ ] Failed or expired payments are marked accordingly.
* [ ] Configuration works with Mollie test mode API key.

---

### **5. Constraints**

* **DO NOT** process a secret guess without a confirmed payment (enforced in BB-1.5).
* **DO NOT** store Mollie API keys in code — use environment variables only.
* **DO NOT** build the frontend payment flow in this ticket — that's BB-1.6.
* **DO NOT** implement prize payout in this ticket — that's a follow-up.

---

### **6. Business Logic**

- Payment amount is always `challenge.cost_per_attempt`.
- One payment = one attempt. No reuse.
- Webhook must be idempotent (processing the same webhook twice should not cause issues).

---

### **7. Testing and Documentation**

* [ ] Unit tests for Mollie service (mock the Mollie SDK).
* [ ] Integration test for payment creation endpoint.
* [ ] Integration test for webhook processing (mock Mollie callback).
* [ ] Integration test for payment status check.
* [ ] Update feature docs with payment flow diagram.

---

### **8. Adhere to agents.md**

*Adhere to agents.md*
