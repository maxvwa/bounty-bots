# BB-1.5: Secret Submission & Validation

**Project:** bounty-bots

**Priority:** High

**Status:** Ready for Dev

**Parent:** BB-1

**Depends On:** BB-1.3, BB-1.4

**Blocks:** BB-1.6

---

### **1. Description**

Build the endpoint that lets users submit their secret guess. The backend validates the guess against the challenge secret, but only after confirming that a Mollie payment has been made for this attempt.

---

### **2. Pre-Requisite: Documentation Task**

* [ ] Update: `docs/features/BB-1-prompt-injection-challenges.md` (validation section)

---

### **3. Technical Requirements**

#### **A. API Endpoint**

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/api/challenges/{id}/attempts` | POST | Yes | Submit a secret guess. Requires a confirmed `payment_id`. |

**Request body:**
```json
{
  "conversation_id": 123,
  "payment_id": "pay_abc123",
  "submitted_secret": "the user's guess"
}
```

**Response (correct):**
```json
{
  "is_correct": true,
  "message": "Congratulations! You cracked the challenge.",
  "prize_amount": "50.00"
}
```

**Response (incorrect):**
```json
{
  "is_correct": false,
  "message": "That's not the secret. Try again!"
}
```

#### **B. Validation Logic**

1. Verify the `payment_id` exists, belongs to this user/challenge, and has status `paid`.
2. Verify the payment has not already been used for a previous attempt.
3. Compare `submitted_secret` to `challenge.secret`:
   - Trim leading/trailing whitespace.
   - Case-insensitive comparison.
4. Create an `attempts` record with `is_correct` result.
5. Link the payment to the attempt (mark payment as consumed).

#### **C. Prize Handling**

- On a correct guess, log the win (the `attempts` row with `is_correct = true`).
- Prize payout mechanism (Mollie payout / manual) is **out of scope** — follow-up ticket.
- Optionally: deactivate the challenge or keep it active (configurable per challenge — default: keep active).

---

### **4. Acceptance Criteria**

* [ ] Submitting a correct secret (case-insensitive, trimmed) returns `is_correct: true` with prize info.
* [ ] Submitting an incorrect secret returns `is_correct: false`.
* [ ] Submitting without a confirmed payment returns `402 Payment Required`.
* [ ] Reusing a payment_id that was already consumed returns `409 Conflict`.
* [ ] An `attempts` row is created for every submission (correct or incorrect).
* [ ] The challenge secret is **never** included in any API response.

---

### **5. Constraints**

* **DO NOT** expose the secret in the response — only `is_correct` boolean.
* **DO NOT** allow attempts without confirmed payment.
* **DO NOT** implement prize payout — just record the win.
* **DO NOT** build the frontend submission UI in this ticket — that's BB-1.6.

---

### **6. Testing and Documentation**

* [ ] Unit tests for secret comparison (case variations, whitespace, exact match).
* [ ] Integration test: correct guess with valid payment → success.
* [ ] Integration test: incorrect guess with valid payment → failure.
* [ ] Integration test: guess without payment → 402.
* [ ] Integration test: reused payment → 409.
* [ ] Update feature docs.

---

### **7. Adhere to agents.md**

*Adhere to agents.md*
