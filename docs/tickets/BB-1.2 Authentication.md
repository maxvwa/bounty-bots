# BB-1.2: Authentication (Register / Login)

**Project:** bounty-bots

**Priority:** Critical

**Status:** Ready for Dev

**Parent:** BB-1

**Depends On:** BB-1.1

**Blocks:** BB-1.4, BB-1.6

---

### **1. Description**

Implement email/password authentication so users can register and log in. Protected API routes will require a valid JWT token.

---

### **2. Pre-Requisite: Documentation Task**

* [ ] Update: `docs/features/BB-1-prompt-injection-challenges.md` (auth section)

---

### **3. Technical Requirements**

#### **A. Password Hashing**

- Use **bcrypt** (via `passlib` or `bcrypt` package) for password hashing.
- Hash on registration, verify on login.

#### **B. JWT Tokens**

- Issue a JWT access token on successful login.
- Token contains `user_id` and `exp` (expiration).
- Use a configurable secret key (`JWT_SECRET` in `config.py`).
- Default token expiry: 24 hours.

#### **C. API Endpoints**

| Endpoint | Method | Auth | Request Body | Response |
| --- | --- | --- | --- | --- |
| `/api/auth/register` | POST | No | `{ email, password }` | `{ id, email }` (201) |
| `/api/auth/login` | POST | No | `{ email, password }` | `{ access_token, token_type }` (200) |
| `/api/auth/me` | GET | Yes | — | `{ id, email, created_at }` (200) |

#### **D. Auth Dependency**

- Create a FastAPI dependency `get_current_user` that extracts and validates the JWT from the `Authorization: Bearer <token>` header.
- Returns the `User` ORM object or raises `401 Unauthorized`.

#### **E. Schemas**

Add to `schemas.py` (or a new `schemas/auth.py`):
- `RegisterRequest` — email (EmailStr), password (min 8 chars)
- `LoginRequest` — email, password
- `TokenResponse` — access_token, token_type
- `UserResponse` — id, email, created_at

---

### **4. Acceptance Criteria**

* [ ] `POST /api/auth/register` creates a user with hashed password and returns user info.
* [ ] Duplicate email returns `409 Conflict`.
* [ ] `POST /api/auth/login` returns a JWT on valid credentials.
* [ ] Invalid credentials return `401 Unauthorized`.
* [ ] `GET /api/auth/me` returns current user when valid token is provided.
* [ ] `GET /api/auth/me` returns `401` when no token or invalid token is provided.
* [ ] All protected endpoints in future tickets can use the `get_current_user` dependency.

---

### **5. Constraints**

* **DO NOT** store plaintext passwords.
* **DO NOT** expose password hashes in any API response.
* **DO NOT** build frontend login UI in this ticket — that's BB-1.6.

---

### **6. Testing and Documentation**

* [ ] Unit tests for password hashing (hash + verify round-trip).
* [ ] Integration tests for register (success, duplicate email).
* [ ] Integration tests for login (success, wrong password, non-existent email).
* [ ] Integration tests for protected route (valid token, expired token, missing token).
* [ ] Update feature docs with auth flow description.

---

### **7. Adhere to agents.md**

*Adhere to agents.md*
