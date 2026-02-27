export interface AuthTokenResponse {
  access_token: string
  token_type: string
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
  prize_pool_cents: number
  is_active: boolean
}

export interface ChallengeDetail extends ChallengeListItem {
  created_at: string
  updated_at: string
}

export interface Conversation {
  conversation_id: number
  user_id: number
  challenge_id: number
  created_at: string
  updated_at: string
}

export interface Message {
  message_id: number
  conversation_id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface SendMessageResponse {
  user_message: Message
  bot_message: Message
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
