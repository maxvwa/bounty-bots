# BB-2.5: Frontend Credits UX

**Project:** bounty-bots

**Priority:** High

**Status:** Ready for Dev

**Parent:** BB-2

**Depends On:** BB-2.2, BB-2.3, BB-2.4, BB-1.6

**Blocks:** —

---

### **1. Description**

Expose the credits economy and probability outcomes in the UI:

- Show wallet balance.
- Let users buy credits with Mollie.
- Enforce credit requirements in attack interactions.
- Show dynamic bounty updates.
- Show when a mock secret exposure event occurs.

---

### **2. Pre-Requisite: Documentation Task**

* [ ] Update: `docs/features/BB-2-credits-economy.md` (frontend flows + UX states)

---

### **3. Technical Requirements**

#### **A. UI Behavior**

| Area | Requirement |
| --- | --- |
| Navbar / header | Show current balance in credits |
| Challenge list/detail | Show current bounty and attack cost in credits |
| Top-up action | Launch purchase flow and redirect to Mollie |
| Return flow | Poll purchase status and refresh balance |
| Chat send | Disable send action if credits are insufficient |
| Message result | Highlight exposure events when `did_expose_secret=true` |

#### **B. API Usage**

- `GET /credits/balance`
- `POST /credits/purchases`
- `GET /credits/purchases/{id}`
- Existing conversation message endpoints with new spend semantics

---

### **4. Acceptance Criteria**

* [ ] Balance is visible and refreshes after successful credit purchase.
* [ ] User can start top-up, pay with Mollie, and return to updated balance.
* [ ] Attack action is blocked in UI when balance is insufficient.
* [ ] Challenge bounty display updates after attacks.
* [ ] Exposure event is clearly indicated to the user.
* [ ] Mobile and desktop layouts remain usable.

---

### **5. Constraints**

* **DO NOT** trust UI state for spend authorization; backend remains source of truth.
* **DO NOT** implement secret validation logic in frontend.
* **DO NOT** hide backend failure states; surface actionable errors.

---

### **6. Testing and Documentation**

* [ ] Frontend integration test for top-up flow state transitions.
* [ ] Frontend integration test for insufficient-credit attack path.
* [ ] Manual test: buy credits -> attack -> bounty increase -> exposure indicator.
* [ ] Update feature docs with screenshots of credits + bounty UX.

---

### **7. Adhere to agents.md**

*Adhere to agents.md*
