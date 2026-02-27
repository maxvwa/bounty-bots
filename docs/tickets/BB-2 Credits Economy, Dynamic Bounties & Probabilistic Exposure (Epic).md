# BB-2: Credits Economy, Dynamic Bounties & Probabilistic Exposure (Epic)

**Project:** bounty-bots

**Priority:** Critical

**Status:** Ready for Dev

**Type:** Epic

---

### **1. Description**

Add a credit economy for bot attacks:

- Users buy prepaid credits through Mollie.
- **1 credit = 10 eurocents** (fixed conversion).
- Attacking a bot consumes credits instead of paying per attack directly.
- As credits are spent on a challenge, that challenge bounty increases.
- Add a mock secret exposure path where bot responses leak the secret with **20% probability**, sampled from a **uniform distribution**.

This creates a more game-like flow: top up once, attack repeatedly, and watch the bounty grow.

---

### **2. Sub-Tickets**

| Ticket | Title | Depends On |
| --- | --- | --- |
| BB-2.1 | Credits Wallet Schema & Ledger | BB-1.1 |
| BB-2.2 | Mollie Credit Purchase Flow | BB-2.1, BB-1.2 |
| BB-2.3 | Credit-Gated Attacks & Bounty Growth | BB-2.1, BB-1.3 |
| BB-2.4 | Mock Secret Exposure (20% Uniform) | BB-2.3 |
| BB-2.5 | Frontend Credits UX | BB-2.2, BB-2.3, BB-2.4, BB-1.6 |

---

### **3. Constraints & "Don'ts" (The Guardrails)**

* **DO NOT** change the conversion rate in code paths; keep `1 credit = 10 cents` as a single constant.
* **DO NOT** allow an attack if wallet balance is insufficient.
* **DO NOT** update wallet balance outside a ledger-backed transaction.
* **DO NOT** expose the secret except through the explicit BB-2.4 mock exposure path.
* **DO NOT** use non-uniform logic for exposure probability; use uniform sampling.
* **DO NOT** use local time; all timestamps stay UTC.

---

### **4. Data Flow / State Machine**

| Input State | User Action | Resulting State |
| --- | --- | --- |
| Authenticated, zero credits | Buy credits | Mollie payment created (pending) |
| Payment pending | Mollie webhook paid | Wallet balance increments, purchase completed |
| Positive balance | Send attack message | Credits deducted, bounty increments, bot response returned |
| Attack processed | Uniform sample < 0.20 | Secret exposed (mock leak event) |
| Attack processed | Uniform sample >= 0.20 | Normal mock reply |

---

### **5. Adhere to agents.md**

*Adhere to agents.md*
