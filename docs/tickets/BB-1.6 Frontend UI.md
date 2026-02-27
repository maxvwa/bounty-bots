# BB-1.6: Frontend UI

**Project:** bounty-bots

**Priority:** High

**Status:** Ready for Dev

**Parent:** BB-1

**Depends On:** BB-1.2, BB-1.3, BB-1.5

**Blocks:** —

---

### **1. Description**

Build the frontend views that tie together authentication, challenge selection, chat, payment, and secret submission into a complete user experience.

---

### **2. Pre-Requisite: Documentation Task**

* [ ] Update: `docs/features/BB-1-prompt-injection-challenges.md` (UI section)

---

### **3. Technical Requirements**

#### **A. Views / Pages**

| View | Route | Auth | Description |
| --- | --- | --- | --- |
| Login / Register | `/login` | No | Email + password form. Toggle between login and register. |
| Challenge List | `/` | Yes | Grid/list of available challenges with difficulty badge, cost, and prize. |
| Challenge Chat | `/challenges/:id` | Yes | Chat interface + secret submission panel. |

#### **B. Auth Flow**

- Store JWT token in memory (or localStorage).
- Redirect unauthenticated users to `/login`.
- After login/register, redirect to `/`.
- Include token in `Authorization` header for all API calls.

#### **C. Challenge List View**

- Fetch `GET /api/challenges` on mount.
- Display each challenge as a card: title, description preview, difficulty badge (color-coded), cost per attempt, prize amount.
- Click a card to navigate to `/challenges/:id`.

#### **D. Challenge Chat View**

- Left panel (or full width on mobile): chat conversation.
  - Fetch or create a conversation on mount.
  - Messages displayed with user on the right, bot on the left (reuse existing Chat component styles).
  - Input bar at the bottom to send messages.
- Right panel (or collapsible on mobile): secret submission.
  - Text input for the secret guess.
  - "Submit Secret" button that triggers the Mollie payment flow.
  - After payment confirmation, auto-submits the guess.
  - Shows result (correct/incorrect) inline.

#### **E. Payment Flow (Frontend)**

1. User enters secret guess and clicks "Submit Secret".
2. Frontend calls `POST /api/challenges/{id}/attempts/pay` → receives `checkout_url`.
3. Redirect user to Mollie checkout (new tab or same window).
4. On return, frontend polls `GET .../status` until payment is confirmed.
5. Once confirmed, frontend calls `POST /api/challenges/{id}/attempts` with the guess.
6. Display result.

#### **F. Routing**

- Use `react-router-dom` for client-side routing.
- Protected route wrapper that checks for auth token.

---

### **4. Acceptance Criteria**

* [ ] User can register and log in from the `/login` page.
* [ ] Unauthenticated users are redirected to `/login`.
* [ ] Authenticated users see the challenge list on `/`.
* [ ] Clicking a challenge opens the chat view.
* [ ] User can send messages and see mock bot replies.
* [ ] User can enter a secret guess and is redirected to Mollie for payment.
* [ ] After payment, the guess is submitted and the result is displayed.
* [ ] Conversation history is preserved when navigating back to a challenge.
* [ ] UI is responsive (works on mobile and desktop).

---

### **5. Constraints**

* **DO NOT** validate the secret on the frontend — always call the backend.
* **DO NOT** store the JWT in cookies (use memory or localStorage).
* **DO NOT** display `secret` or `system_prompt` anywhere in the UI.
* **DO NOT** implement admin views — this is user-facing only.

---

### **6. Testing and Documentation**

* [ ] Manual test: full flow from register → pick challenge → chat → pay → submit secret.
* [ ] Verify mobile responsiveness.
* [ ] Verify auth redirect works.
* [ ] Update feature docs with screenshots/mockups.

---

### **7. Adhere to agents.md**

*Adhere to agents.md*
