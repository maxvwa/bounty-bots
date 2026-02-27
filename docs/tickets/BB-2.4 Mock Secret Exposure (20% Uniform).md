# BB-2.4: Mock Secret Exposure (20% Uniform)

**Project:** bounty-bots

**Priority:** High

**Status:** Ready for Dev

**Parent:** BB-2

**Depends On:** BB-2.3

**Blocks:** BB-2.5

---

### **1. Description**

Add a mock secret exposure behavior to bot responses:

- On each processed attack, sample `u ~ Uniform(0, 1)`.
- If `u < 0.20`, the response leaks the challenge secret.
- Otherwise return the normal mock response.

This simulates probabilistic model failure in a controlled way.

---

### **2. Pre-Requisite: Documentation Task**

* [ ] Update: `docs/features/BB-2-credits-economy.md` (probability + leak behavior section)

---

### **3. Technical Requirements**

#### **A. Exposure Algorithm**

- Use a uniform random source (e.g., `random.random()`).
- Exposure probability constant: `SECRET_EXPOSURE_PROBABILITY = 0.20`.
- Branching rule:
  - expose if `u < SECRET_EXPOSURE_PROBABILITY`
  - otherwise no exposure

#### **B. API / Service Changes**

- Update mock bot service to return both:
  - bot response text
  - `did_expose_secret` boolean
- Include `did_expose_secret` in send-message response schema.
- Ensure message content includes secret only in the exposure branch.

Optional (recommended): persist an `is_secret_exposure` flag on assistant messages for analytics.

---

### **4. Acceptance Criteria**

* [ ] Forced `u=0.19` path exposes secret and returns `did_expose_secret=true`.
* [ ] Forced `u=0.20` path does not expose and returns `did_expose_secret=false`.
* [ ] Forced `u=0.91` path does not expose.
* [ ] Non-exposure responses never include secret substrings.
* [ ] Exposure logic executes only after successful credit spend.

---

### **5. Constraints**

* **DO NOT** use weighted heuristics or non-uniform distributions.
* **DO NOT** expose secret in non-exposure paths.
* **DO NOT** make probability configurable from the client.

---

### **6. Testing and Documentation**

* [ ] Unit tests with deterministic random stubs for boundary cases.
* [ ] Integration test validating response flag + content behavior.
* [ ] Update feature docs with probability definition and examples.

---

### **7. Adhere to agents.md**

*Adhere to agents.md*
