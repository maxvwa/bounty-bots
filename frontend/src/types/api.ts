export interface AuthTokenResponse {
  access_token: string
  token_type: 'bearer'
}

export interface UserMe {
  user_id: number
  reference: string
  email: string | null
  timezone_id: number
  created_at: string
  updated_at: string
}

export interface ChallengeListItem {
  challenge_id: number
  title: string
  description: string
  difficulty: string
  cost_per_attempt_cents: number
  attack_cost_credits: number
  prize_pool_cents: number
  is_active: boolean
}

export interface ConversationRead {
  conversation_id: number
  user_id: number
  challenge_id: number
  created_at: string
  updated_at: string
}

export interface MessageRead {
  message_id: number
  conversation_id: number
  role: string
  content: string
  is_secret_exposure: boolean
  created_at: string
}

export interface SendMessageResponse {
  user_message: MessageRead
  bot_message: MessageRead
  did_expose_secret: boolean
  credits_charged: number
  remaining_credits: number
  updated_prize_pool_cents: number
}

export interface CreditBalanceResponse {
  balance_credits: number
}

export interface CreditPurchaseCreateResponse {
  credit_purchase_id: number
  credits_purchased: number
  amount_cents: number
  status: string
  checkout_url: string
}

export interface CreditPurchaseReadResponse {
  credit_purchase_id: number
  user_id: number
  mollie_payment_id: string | null
  amount_cents: number
  credits_purchased: number
  status: string
  created_at: string
  updated_at: string
}

export interface PaymentCreateResponse {
  payment_id: number
  checkout_url: string
  status: string
}

export interface PaymentStatusResponse {
  payment_id: number
  user_id: number
  challenge_id: number
  mollie_payment_id: string | null
  amount_cents: number
  status: string
  created_at: string
  updated_at: string
}

export interface AttemptRead {
  attempt_id: number
  user_id: number
  challenge_id: number
  payment_id: number | null
  is_correct: boolean
  created_at: string
}

export interface AttemptResponse {
  attempt: AttemptRead
  message: string
}
