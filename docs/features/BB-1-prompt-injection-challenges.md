# BB-1 Prompt Injection Challenges

## Purpose

Deliver a playable prompt-injection challenge loop where users:

1. create an account or log in,
2. browse active challenges,
3. chat with a mock assistant,
4. submit a paid secret guess attempt.

This document reflects the current implementation in `backend/app` and `frontend/src`.

## Scope

- Local email/password auth with JWT bearer tokens.
- Challenge listing and detail views.
- Per-user conversations and message history.
- Mock bot replies with optional secret exposure.
- Attempt checkout flow using Mollie-backed payment records.

## Current API Surface

Note: these routes are backend-native. In production behind reverse proxy, they are exposed under `/api/...`.

### Auth

| Endpoint | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/auth/register` | POST | No | Creates user + wallet, returns bearer token |
| `/auth/login` | POST | No | Returns bearer token |
| `/auth/me` | GET | Yes | Returns current authenticated user |

### Challenges and Conversations

| Endpoint | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/challenges` | GET | No | Lists active challenges, excludes secret |
| `/challenges/{challenge_id}` | GET | No | Challenge detail, excludes secret |
| `/challenges/{challenge_id}/conversations` | POST | Yes | Creates a conversation |
| `/challenges/{challenge_id}/conversations` | GET | Yes | Lists current user conversations for challenge |
| `/conversations/{conversation_id}/messages` | GET | Yes | Lists owned conversation messages |
| `/conversations/{conversation_id}/messages` | POST | Yes | Sends user message + creates assistant reply |

### Paid Secret Attempts

| Endpoint | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/payments` | POST | Yes | Creates Mollie checkout for challenge attempt |
| `/payments/webhook` | POST | No | Payment status callback update |
| `/payments/{payment_id}` | GET | Yes | Reads owned payment status |
| `/attempts` | POST | Yes | Consumes one paid payment to submit secret |
| `/attempts` | GET | Yes | Lists user attempts (optional `challenge_id`) |

## Data Model Notes

- `challenges` stores hidden `secret`; API serializers intentionally exclude it.
- `conversations` and `messages` are user-owned via `conversation.user_id`.
- `payments` store checkout state for attempt submission.
- `attempts` enforces one attempt per paid payment.
- IDs are app-assigned via table-specific sequences.

## Core Behavioral Rules

### Authentication

- Passwords are stored as bcrypt hashes.
- Access tokens are HS256 JWTs containing `sub`, `email`, `iat`, and `exp`.
- Missing/invalid token yields `401`.

### Challenge Safety and Ownership

- Challenge endpoints never return `secret`.
- Conversation fetch/send requires ownership; non-owner access returns `404`.

### Message Send Flow

1. Verify user owns conversation.
2. Lock challenge row and load wallet.
3. Ensure wallet has enough credits for `attack_cost_credits`.
4. Deduct credits, write credit transaction, increase challenge bounty.
5. Store user message.
6. Generate mock assistant response and store it.

### Secret Attempt Flow

1. User creates payment via `/payments`.
2. Client redirects to checkout URL.
3. Webhook transitions payment status to `paid`.
4. Client submits `/attempts` with `challenge_id`, `payment_id`, and guessed secret.
5. Backend validates ownership + paid status + non-reuse, then persists result.

## Frontend UX Summary

- `LoginPage` supports register/login toggle.
- `ChallengeListPage` shows challenge cards and purchase-return messaging.
- `ChallengeChatPage` shows conversation list, live messages, secret exposure highlighting, and paid secret submission flow.

## Known Gaps and Follow-Ups

- Auth brute-force protection/rate limiting is not yet wired.
- Token storage is currently browser `localStorage`.
- Challenge list/detail are currently public (no auth gate), while write actions require auth.
