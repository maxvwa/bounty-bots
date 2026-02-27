# BB-1: Prompt Injection Challenges (Epic)

**Project:** bounty-bots

**Priority:** Critical

**Status:** Ready for Dev

**Type:** Epic

---

### **1. Description**

Users can browse and select from a set of prompt injection challenges, each with a difficulty level and an associated cash prize. The goal is to trick a chatbot into revealing a secret it was instructed to protect.

- Each challenge has a **difficulty** (Easy / Medium / Hard), a **cost per attempt**, and a **prize pool**.
- Users chat with the challenge bot and try to extract the secret via prompt injection.
- When the user thinks they have the secret, they submit it in a dedicated text input. The backend validates the guess without ever exposing the secret to the frontend.
- Every attempt costs money (paid via Mollie). The accumulated attempt fees fund the prize pool.
- If the guess is correct the user wins the prize. If incorrect they can keep trying (paying per attempt).
- All conversations are stored in the database for later research and analysis.
- The LLM integration is **out of scope** for BB-1 — challenge bots will use mock responses. A follow-up ticket will wire up a real LLM.

---

### **2. Sub-Tickets**

| Ticket | Title | Depends On |
| --- | --- | --- |
| BB-1.1 | Database Schema & Models | — |
| BB-1.2 | Authentication (Register / Login) | BB-1.1 |
| BB-1.3 | Challenge API & Mock Bot | BB-1.1 |
| BB-1.4 | Mollie Payment Integration | BB-1.2, BB-1.3 |
| BB-1.5 | Secret Submission & Validation | BB-1.3, BB-1.4 |
| BB-1.6 | Frontend UI | BB-1.2, BB-1.3, BB-1.5 |

---

### **3. Constraints & "Don'ts" (The Guardrails)**

*These apply to all sub-tickets.*

* **DO NOT** expose the challenge secret to the frontend — ever. Validation is backend-only.
* **DO NOT** use local time; all timestamps must be **UTC**.
* **DO NOT** allow secret submission without a confirmed payment.
* **DO NOT** integrate a real LLM in this ticket — use mock responses. LLM integration is a follow-up.
* **DO NOT** store plaintext passwords. Use bcrypt or argon2 for hashing.
* **DO NOT** put business logic (payment checks, secret validation) in the frontend.

---

### **4. Data Flow / State Machine**

| Input State | User Action | Resulting State |
| --- | --- | --- |
| Unauthenticated | Register / Login | Authenticated (JWT token) |
| Challenge list | Select challenge | Challenge chat view |
| Chat view | Send message | Message stored, mock bot reply appended |
| Chat view | Click "Submit Secret" | Payment flow initiated (Mollie) |
| Payment pending | Payment confirmed | Attempt created, secret compared |
| Attempt evaluated | Correct guess | Winner screen, prize logged |
| Attempt evaluated | Incorrect guess | "Try again" prompt, user stays in chat |

---

### **5. Adhere to agents.md**

*Adhere to agents.md*
