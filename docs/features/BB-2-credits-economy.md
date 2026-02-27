# BB-2 Credits Economy

## Purpose

Define and document the credits economy added on top of BB-1:

1. users buy credits,
2. attacks spend credits,
3. spent credits increase challenge bounty,
4. mock assistant may expose secret with fixed probability.

This document reflects the current backend and frontend behavior.

## Economy Constants

- `CENTS_PER_CREDIT = 10`
- `SECRET_EXPOSURE_PROBABILITY = 0.20`

## Data Model

| Table | Purpose |
| --- | --- |
| `credit_wallets` | Per-user balance ledger summary (`balance_credits`) |
| `credit_purchases` | Credit top-up payments and statuses |
| `credit_transactions` | Immutable credit deltas (`purchase`, `attack_spend`) |

Design constraints:

- Wallet balance has DB-level non-negative check.
- Purchases and transactions use explicit sequence-backed `BIGINT` IDs.
- Webhook processing credits exactly once when transitioning into `paid`.

## API Contract

Note: these routes are backend-native. In production behind reverse proxy, they are exposed under `/api/...`.

### Credit Purchase

| Endpoint | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/credits/purchases` | POST | Yes | Creates Mollie checkout for credit top-up |
| `/credits/purchases/webhook` | POST | No | Updates purchase status and credits wallet on `paid` transition |
| `/credits/purchases/{credit_purchase_id}` | GET | Yes | Returns owned purchase |
| `/credits/balance` | GET | Yes | Returns wallet balance |

### Chat Spend Integration

| Endpoint | Method | Auth | Notes |
| --- | --- | --- | --- |
| `/conversations/{conversation_id}/messages` | POST | Yes | Deducts attack credits, records transaction, bumps prize pool |

## Behavioral Rules

### Purchasing Credits

1. User sends amount in cents.
2. Amount must be positive and divisible by `CENTS_PER_CREDIT`.
3. Purchase row is created in `pending/open` state.
4. Webhook reads provider status.
5. If moving into `paid` from non-`paid`, wallet is incremented and transaction row is created.

### Spending Credits on Attacks

1. Resolve conversation ownership.
2. Lock challenge row.
3. Resolve wallet row with lock.
4. If `balance_credits < attack_cost_credits`, return `402`.
5. Subtract credits and append `attack_spend` transaction.
6. Increase `challenge.prize_pool_cents` by `attack_cost_credits * CENTS_PER_CREDIT`.

### Mock Secret Exposure

- On each attack message, mock bot draws a uniform random sample.
- If sample is `< 0.20`, response leaks the challenge secret and marks `is_secret_exposure=true`.
- Otherwise, assistant returns one canned non-secret message.

## Frontend UX Behavior

- Navbar always shows current credit balance and "Buy 100 credits".
- Top-up button creates a `1000` cents purchase and redirects to checkout.
- Challenge list handles return with `credit_purchase_id` and polls purchase status.
- Chat send button is disabled when balance is below attack cost.
- Exposure events are visually highlighted when `is_secret_exposure` is true.
- Chat UI updates displayed bounty from `updated_prize_pool_cents` after each attack.

## Error and Edge Case Handling

- `400` for invalid purchase amount divisibility.
- `402` when attempting chat attack without enough credits.
- `404` for cross-user purchase reads or unknown records.
- Webhook returns `ignored` for unknown provider payment ids.

## Test Coverage Snapshot

Current backend tests cover:

- wallet crediting idempotency across repeated webhook events,
- purchase amount validation,
- ownership enforcement on purchase reads,
- insufficient-credit message sends,
- bounty growth and credit spend side effects,
- exposure probability boundary behavior (`0.19` true, `0.20` false).
