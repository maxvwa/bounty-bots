# BB-3 Frontend Replacement And Contract Alignment

## Summary

The local `frontend/` implementation was replaced with the UI from:

- `git@github.com:edgarvamerongen/prompt-bounty-arena.git`

The imported UI was adapted to work against the existing bounty-bots backend contracts for authentication, challenge messaging, credits, and payment-gated secret submission.

## Contract Mapping

| Imported UI Flow | Backend Endpoint(s) | Notes |
| --- | --- | --- |
| Login / Register | `POST /auth/login`, `POST /auth/register`, `GET /auth/me` | Added JWT auth context and protected routes. |
| Load challenges | `GET /challenges` | Challenge rows mapped to UI bot cards. |
| Enter challenge chat | `POST /challenges/{id}/conversations`, `GET /conversations/{id}/messages` | New conversation per attack session. |
| Send attack message | `POST /conversations/{id}/messages` | Handles credit deduction, bounty increase, and exposure metadata from backend response. |
| Show wallet credits | `GET /credits/balance` | Refreshed on arena load and after purchases/message sends. |
| Buy credits | `POST /credits/purchases`, `GET /credits/purchases/{id}` | UI redirects to Mollie checkout and polls return status. |
| Submit secret | `POST /payments`, `GET /payments/{id}`, `POST /attempts` | Secret submission is payment-gated; pending submission is persisted through checkout redirect. |

## Behavioral Adjustments

- Removed mock local state logic for credits and secret verification.
- Preserved imported spy-themed look and shadcn component stack.
- Added URL return handlers for:
  - `?credit_purchase_id=...`
  - `?payment_id=...`
- Kept API-base compatibility through `VITE_API_BASE_URL` with local default `http://localhost:8000`.

## Validation

- `npm install`
- `npm run lint` (warnings only from shared UI component export patterns)
- `npm run build`
