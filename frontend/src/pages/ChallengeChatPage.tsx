import { useEffect, useMemo, useState } from 'react'
import { ApiError, apiFetch } from '../api/client'
import type {
  AttemptResponse,
  ChallengeDetail,
  Conversation,
  Message,
  PaymentCreateResponse,
  PaymentStatusResponse,
  SendMessageResponse,
} from '../types'
import './ChallengeChatPage.css'

const PENDING_ATTEMPT_STORAGE_KEY = 'bb_pending_attempt'
const TERMINAL_PAYMENT_STATUSES = new Set(['paid', 'failed', 'expired', 'canceled'])

interface PendingAttempt {
  challengeId: number
  paymentId: number
  submittedSecret: string
}

interface ChallengeChatPageProps {
  challengeId: number
  onNavigate: (path: string) => void
}

function readPendingAttempt(): PendingAttempt | null {
  const rawValue = localStorage.getItem(PENDING_ATTEMPT_STORAGE_KEY)
  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as PendingAttempt
    if (!parsed.challengeId || !parsed.paymentId || !parsed.submittedSecret) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function persistPendingAttempt(value: PendingAttempt): void {
  localStorage.setItem(PENDING_ATTEMPT_STORAGE_KEY, JSON.stringify(value))
}

function clearPendingAttempt(): void {
  localStorage.removeItem(PENDING_ATTEMPT_STORAGE_KEY)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function parseApiError(error: unknown): string {
  if (error instanceof ApiError && typeof error.body === 'object' && error.body) {
    const body = error.body as { detail?: string }
    if (body.detail) {
      return body.detail
    }
    return `Request failed (${error.status})`
  }
  return 'Request failed'
}

function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`
}

export default function ChallengeChatPage({ challengeId, onNavigate }: ChallengeChatPageProps) {
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [secretInput, setSecretInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const activeConversation = useMemo(
    () =>
      activeConversationId
        ? conversations.find(
            (conversation) => conversation.conversation_id === activeConversationId,
          ) ?? null
        : null,
    [activeConversationId, conversations],
  )

  useEffect(() => {
    const loadPage = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const [challengePayload, conversationsPayload] = await Promise.all([
          apiFetch<ChallengeDetail>(`/challenges/${challengeId}`),
          apiFetch<Conversation[]>(`/challenges/${challengeId}/conversations`),
        ])
        setChallenge(challengePayload)
        setConversations(conversationsPayload)
        setActiveConversationId((previousValue) => {
          if (previousValue) {
            return previousValue
          }
          return conversationsPayload[0]?.conversation_id ?? null
        })
      } catch (requestError) {
        setErrorMessage(parseApiError(requestError))
      } finally {
        setIsLoading(false)
      }
    }

    void loadPage()
  }, [challengeId])

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([])
      return
    }

    const loadMessages = async () => {
      try {
        const payload = await apiFetch<Message[]>(
          `/conversations/${activeConversationId}/messages`,
        )
        setMessages(payload)
      } catch (requestError) {
        setErrorMessage(parseApiError(requestError))
      }
    }

    void loadMessages()
  }, [activeConversationId])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const returnedPaymentIdRaw = params.get('payment_id')
    if (!returnedPaymentIdRaw) {
      return
    }

    const returnedPaymentId = Number(returnedPaymentIdRaw)
    if (Number.isNaN(returnedPaymentId)) {
      return
    }

    const pendingAttempt = readPendingAttempt()
    if (!pendingAttempt || pendingAttempt.challengeId !== challengeId) {
      setInfoMessage('Payment return detected, but pending attempt data was not found.')
      window.history.replaceState({}, '', window.location.pathname)
      return
    }

    const resumeAttemptFlow = async () => {
      setIsProcessingPayment(true)
      setInfoMessage('Payment return detected. Confirming payment status...')
      setErrorMessage(null)

      try {
        let finalStatus = ''
        for (let index = 0; index < 60; index += 1) {
          const statusPayload = await apiFetch<PaymentStatusResponse>(
            `/payments/${returnedPaymentId}`,
          )
          finalStatus = statusPayload.status
          if (TERMINAL_PAYMENT_STATUSES.has(finalStatus)) {
            break
          }
          await sleep(2000)
        }

        if (finalStatus !== 'paid') {
          setErrorMessage(`Payment not completed (status: ${finalStatus || 'unknown'})`)
          clearPendingAttempt()
          return
        }

        const attemptPayload = await apiFetch<AttemptResponse>('/attempts', {
          method: 'POST',
          body: JSON.stringify({
            challenge_id: pendingAttempt.challengeId,
            payment_id: pendingAttempt.paymentId,
            submitted_secret: pendingAttempt.submittedSecret,
          }),
        })
        setInfoMessage(attemptPayload.message)
        setSecretInput('')
        clearPendingAttempt()
      } catch (requestError) {
        setErrorMessage(parseApiError(requestError))
      } finally {
        setIsProcessingPayment(false)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }

    void resumeAttemptFlow()
  }, [challengeId])

  async function createConversation(): Promise<void> {
    if (isCreatingConversation) {
      return
    }
    setIsCreatingConversation(true)
    setErrorMessage(null)

    try {
      const payload = await apiFetch<Conversation>(
        `/challenges/${challengeId}/conversations`,
        { method: 'POST' },
      )
      setConversations((previousValue) => [payload, ...previousValue])
      setActiveConversationId(payload.conversation_id)
      setMessages([])
    } catch (requestError) {
      setErrorMessage(parseApiError(requestError))
    } finally {
      setIsCreatingConversation(false)
    }
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = chatInput.trim()
    if (!text || isSendingMessage) {
      return
    }

    if (!activeConversationId) {
      await createConversation()
      return
    }

    setIsSendingMessage(true)
    setErrorMessage(null)

    try {
      const payload = await apiFetch<SendMessageResponse>(
        `/conversations/${activeConversationId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ content: text }),
        },
      )
      setMessages((previousValue) => [
        ...previousValue,
        payload.user_message,
        payload.bot_message,
      ])
      setChatInput('')
    } catch (requestError) {
      setErrorMessage(parseApiError(requestError))
    } finally {
      setIsSendingMessage(false)
    }
  }

  async function submitSecret(): Promise<void> {
    const normalizedSecret = secretInput.trim()
    if (!normalizedSecret || isProcessingPayment) {
      return
    }

    setIsProcessingPayment(true)
    setInfoMessage('Creating payment and redirecting to checkout...')
    setErrorMessage(null)

    try {
      const paymentPayload = await apiFetch<PaymentCreateResponse>('/payments', {
        method: 'POST',
        body: JSON.stringify({ challenge_id: challengeId }),
      })
      persistPendingAttempt({
        challengeId,
        paymentId: paymentPayload.payment_id,
        submittedSecret: normalizedSecret,
      })
      window.location.assign(paymentPayload.checkout_url)
    } catch (requestError) {
      setErrorMessage(parseApiError(requestError))
      setIsProcessingPayment(false)
    }
  }

  if (isLoading) {
    return <section className="challenge-chat-page">Loading challenge...</section>
  }

  if (!challenge) {
    return <section className="challenge-chat-page">Challenge not found.</section>
  }

  return (
    <section className="challenge-chat-page">
      <button className="challenge-back" onClick={() => onNavigate('/challenges')}>
        Back to challenges
      </button>

      <header className="challenge-summary">
        <h1>{challenge.title}</h1>
        <p>{challenge.description}</p>
        <div className="challenge-stats">
          <span>{challenge.difficulty}</span>
          <span>Attempt: {formatCents(challenge.cost_per_attempt_cents)}</span>
          <span>Prize: {formatCents(challenge.prize_pool_cents)}</span>
        </div>
      </header>

      <div className="challenge-layout">
        <aside className="conversation-list">
          <div className="conversation-header">
            <h2>Conversations</h2>
            <button onClick={() => void createConversation()} disabled={isCreatingConversation}>
              {isCreatingConversation ? 'Starting...' : 'New'}
            </button>
          </div>
          <ul>
            {conversations.map((conversation) => (
              <li key={conversation.conversation_id}>
                <button
                  className={
                    activeConversation?.conversation_id === conversation.conversation_id
                      ? 'active'
                      : ''
                  }
                  onClick={() => setActiveConversationId(conversation.conversation_id)}
                >
                  Conversation #{conversation.conversation_id}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="chat-panel">
          <div className="message-feed">
            {messages.length === 0 ? (
              <p className="message-empty">No messages yet. Start a conversation and send one.</p>
            ) : (
              messages.map((message) => (
                <article
                  key={message.message_id}
                  className={message.role === 'user' ? 'message user' : 'message assistant'}
                >
                  {message.content}
                </article>
              ))
            )}
          </div>

          <form className="message-form" onSubmit={(event) => void sendMessage(event)}>
            <input
              type="text"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Send a challenge prompt..."
            />
            <button type="submit" disabled={isSendingMessage || !chatInput.trim()}>
              Send
            </button>
          </form>

          <section className="secret-panel">
            <h3>Submit Secret Guess</h3>
            <p>Each submission attempt requires a separate Mollie payment checkout.</p>
            <div className="secret-actions">
              <input
                type="text"
                value={secretInput}
                onChange={(event) => setSecretInput(event.target.value)}
                placeholder="Enter your guessed secret"
              />
              <button onClick={() => void submitSecret()} disabled={isProcessingPayment}>
                {isProcessingPayment ? 'Processing...' : 'Submit Secret'}
              </button>
            </div>

            {infoMessage && <p className="attempt-info">{infoMessage}</p>}
            {errorMessage && <p className="attempt-error">{errorMessage}</p>}
          </section>
        </main>
      </div>
    </section>
  )
}
