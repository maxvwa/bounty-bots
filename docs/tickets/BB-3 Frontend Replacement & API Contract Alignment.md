# BB-3: Frontend Replacement & API Contract Alignment

**Project:** bounty-bots

**Priority:** High

**Status:** Ready for Dev

**Parent:** —

**Depends On:** BB-1.2, BB-1.3, BB-2.2, BB-2.3, BB-2.5

**Blocks:** —

---

### **1. Description**

Replace the current frontend in this repository with the frontend from:

`git@github.com:edgarvamerongen/prompt-bounty-arena.git`

Then align all API integrations so the imported UI works correctly with the existing bounty-bots backend contracts (auth, challenges, conversations/messages, credits, payments, attempts).

---

### **2. Pre-Requisite: Documentation Task**

* [ ] Create/Update: `docs/features/BB-3-frontend-replacement-and-contract-alignment.md`
* [ ] Document endpoint mapping table (imported frontend contract -> bounty-bots backend contract)

---

### **3. Technical Requirements**

#### **A. Frontend Replacement**

| Area | Requirement |
| --- | --- |
| Source import | Pull latest frontend code from `prompt-bounty-arena` repository |
| Destination | Replace contents of local `frontend/` app implementation while preserving local build/dev script compatibility |
| Build system | Keep project runnable via existing frontend commands in this repo (`npm install`, `npm run lint`, `npm run build`) |

#### **B. API Contract Reconciliation**

- Map and adapt route paths, request payloads, response payloads, and auth header handling.
- Ensure compatibility for:
  - `POST /auth/register`
  - `POST /auth/login`
  - `GET /auth/me`
  - `GET /challenges`
  - `GET /challenges/{id}`
  - `POST /challenges/{id}/conversations`
  - `GET /challenges/{id}/conversations`
  - `GET /conversations/{id}/messages`
  - `POST /conversations/{id}/messages`
  - `GET /credits/balance`
  - `POST /credits/purchases`
  - `GET /credits/purchases/{id}`
  - `POST /payments`
  - `GET /payments/{id}`
  - `POST /attempts`
  - `GET /attempts`
- Preserve JWT bearer flow and unauthenticated redirect behavior.

#### **C. Runtime Compatibility**

- Confirm API base URL configuration for local development.
- Ensure route guards and post-login navigation work.
- Ensure credit purchase return/poll flow still functions with bounty-bots payment endpoints.

---

### **4. Acceptance Criteria**

* [ ] Local `frontend/` is fully replaced by imported implementation (except required repository-specific config adjustments).
* [ ] Imported UI authenticates against bounty-bots backend successfully.
* [ ] Challenge list/detail/chat flows work against bounty-bots endpoints.
* [ ] Credits purchase + balance flow works.
* [ ] Attempts flow works after payment gate requirements are met.
* [ ] `npm run lint` passes.
* [ ] `npm run build` passes.
* [ ] Contract mapping document is added/updated under `docs/features/`.

---

### **5. Constraints**

* **DO NOT** change backend API behavior unless strictly required to resolve a blocking mismatch; prefer frontend adapters.
* **DO NOT** expose challenge secrets in UI or client logs.
* **DO NOT** commit environment secrets or private keys.
* **DO NOT** move ticket to `docs/tickets/implemented/` without explicit approval.

---

### **6. Testing and Documentation**

* [ ] Manual verification: register/login -> challenge browse -> conversation/message -> credits top-up -> attempt submission.
* [ ] Capture any non-trivial contract transforms in feature docs.
* [ ] Include known gaps/assumptions if imported frontend has unsupported flows.

---

### **7. Adhere to agents.md**

*Adhere to agents.md*
