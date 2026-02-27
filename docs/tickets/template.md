# 🎫 [PROJ-X]: [Feature Title]

**Project:** YourProject

**Priority:** (Low / Medium / High / Critical)

**Status:** (Draft / Ready for Dev / In Progress)

---

### **1. Description**

*Describe the "What" and the "Why". Include the core user value.*

> **Example:** "We need a way for users to see a leaderboard of who slept the most in their friend group over the last 7 days."

---

### **2. Pre-Requisite: Documentation Task**

*List any Markdown files that must be created or updated in the `/docs/features/` directory before coding starts.*

* [ ] Create/Update: `docs/features/[FEATURE-ID]-[Title].md`
* [ ] Update: `docs/README.md` (Add to Feature Index)

---

### **3. Technical Requirements & Schema**

#### **A. Database Layer**

*Define table updates, foreign keys, and constraints.*

| Table | Action (New/Update) | Key Columns/Constraints |
| --- | --- | --- |
| `table_name` | (e.g., New) | `id`, `user_id` (FK), `created_at` (UTC) |

#### **B. Business Logic / Heuristics**

*Define the rules the backend or frontend must follow (e.g., the '05:00 AM' rule).*

---

### **4. Acceptance Criteria (The "Must-Haves")**

*Specific, testable goals.*

* [ ] **Atomic Transaction:** (e.g., Describe what happens in the BEGIN/COMMIT block).
* [ ] **UI Implementation:** (e.g., Describe the iPhone-specific views).
* [ ] **API Endpoint:** (e.g., `POST /v1/feature-endpoint`).

---

### **5. Constraints & "Don'ts" (The Guardrails)**

*Be explicit about what the AI agent should avoid.*

* **DO NOT** use local time; all timestamps must be **UTC**.
* **DO NOT** include WatchOS or HealthKit integration unless specified.
* **DO NOT** perform [X] on the client-side; move business logic to the Backend.
* **DO NOT** allow [X] to be overwritten once [Y] is set.

---

### **6. Technical Reference: Data Flow / State Machine**

*Use this section to show how data moves through the system.*

| Input State | Condition | Resulting State |
| --- | --- | --- |
| (e.g., Awake) | (e.g., Time < 05:00) | (e.g., Update Sleep Start) |

---
### **7. Testing and Dcoumentation
*Make sure all changes are tested and documented in the features in accordance to the name of the ticket*

### **8. Adhere to agents.md
*Adhere to agents.md*
