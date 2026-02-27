# BB-1.3: Challenge API & Mock Bot

**Project:** bounty-bots

**Priority:** Critical

**Status:** Ready for Dev

**Parent:** BB-1

**Depends On:** BB-1.1

**Blocks:** BB-1.4, BB-1.5, BB-1.6

---

### **1. Description**

Build the API endpoints for listing challenges, starting conversations, and exchanging chat messages. The bot uses mock responses for now — no real LLM.

---

### **2. Pre-Requisite: Documentation Task**

* [ ] Update: `docs/features/BB-1-prompt-injection-challenges.md` (challenge & chat API section)

---

### **3. Technical Requirements**

#### **A. Challenge Endpoints**

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/api/challenges` | GET | Yes | List all active challenges (id, title, description, difficulty, cost_per_attempt, prize_amount). **DO NOT** include `secret` or `system_prompt`. |
| `/api/challenges/{id}` | GET | Yes | Single challenge detail. Same fields as list — no secret. |

#### **B. Conversation & Message Endpoints**

| Endpoint | Method | Auth | Description |
| --- | --- | --- | --- |
| `/api/challenges/{id}/conversations` | POST | Yes | Start a new conversation for the current user + challenge. Returns `conversation_id`. |
| `/api/challenges/{id}/conversations` | GET | Yes | List user's conversations for this challenge. |
| `/api/challenges/{id}/conversations/{conv_id}/messages` | POST | Yes | Send a user message. Stores it, generates a mock bot reply, stores that too. Returns the bot reply. |
| `/api/challenges/{id}/conversations/{conv_id}/messages` | GET | Yes | Get full message history for a conversation. |

#### **C. Mock Bot Logic**

- Create `backend/app/services/mock_bot.py`.
- Function `get_mock_reply(user_message: str) -> str` returns a random canned response.
- Canned responses should be challenge-themed (e.g., "Nice try! I'm not telling you anything.", "I'm sworn to secrecy.", etc.).
- The mock bot does **not** use the `system_prompt` — that's for the real LLM later.

#### **D. Schemas**

- `ChallengeListItem` — id, title, description, difficulty, cost_per_attempt, prize_amount
- `ConversationResponse` — id, challenge_id, started_at
- `MessageRequest` — content (str)
- `MessageResponse` — id, role, content, created_at

---

### **4. Acceptance Criteria**

* [ ] `GET /api/challenges` returns list of active challenges without secrets.
* [ ] `GET /api/challenges/{id}` returns a single challenge without secret.
* [ ] `POST /api/challenges/{id}/conversations` creates and returns a new conversation.
* [ ] `POST .../messages` stores the user message, generates a mock reply, stores it, and returns the reply.
* [ ] `GET .../messages` returns full conversation history in chronological order.
* [ ] Users can only access their own conversations (not other users').
* [ ] All messages (user + bot) are persisted in the `messages` table.

---

### **5. Constraints**

* **DO NOT** expose `secret` or `system_prompt` in any challenge API response.
* **DO NOT** integrate a real LLM — mock responses only.
* **DO NOT** implement payment logic — that's BB-1.4.

---

### **6. Testing and Documentation**

* [ ] Integration tests for challenge list/detail (verify no secret leakage).
* [ ] Integration tests for conversation creation.
* [ ] Integration tests for message send/receive cycle.
* [ ] Integration test verifying user A cannot read user B's conversations.
* [ ] Update feature docs with API examples.

---

### **7. Adhere to agents.md**

*Adhere to agents.md*
