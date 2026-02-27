import { useEffect, useState } from 'react'
import { ApiError, apiFetch } from '../api/client'
import type { ChallengeListItem, CreditPurchaseReadResponse } from '../types'
import './ChallengeListPage.css'

const TERMINAL_PURCHASE_STATUSES = new Set(['paid', 'failed', 'expired', 'canceled'])

interface ChallengeListPageProps {
  onNavigate: (path: string) => void
  onRefreshCredits: () => Promise<void>
}

function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`
}

export default function ChallengeListPage({
  onNavigate,
  onRefreshCredits,
}: ChallengeListPageProps) {
  const [challenges, setChallenges] = useState<ChallengeListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null)

  async function sleep(ms: number): Promise<void> {
    await new Promise((resolve) => {
      window.setTimeout(resolve, ms)
    })
  }

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const payload = await apiFetch<ChallengeListItem[]>('/challenges')
        setChallenges(payload)
      } catch (requestError) {
        if (requestError instanceof ApiError) {
          setError(`Unable to load challenges (${requestError.status})`)
        } else {
          setError('Unable to load challenges')
        }
      } finally {
        setIsLoading(false)
      }
    }

    void fetchChallenges()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const purchaseIdRaw = params.get('credit_purchase_id')
    if (!purchaseIdRaw) {
      return
    }

    const purchaseId = Number(purchaseIdRaw)
    if (Number.isNaN(purchaseId)) {
      return
    }

    const pollPurchase = async () => {
      setPurchaseMessage('Credit payment return detected. Confirming status...')
      try {
        let finalStatus = ''
        let creditsPurchased = 0
        for (let index = 0; index < 60; index += 1) {
          const purchase = await apiFetch<CreditPurchaseReadResponse>(
            `/credits/purchases/${purchaseId}`,
          )
          finalStatus = purchase.status
          creditsPurchased = purchase.credits_purchased
          if (TERMINAL_PURCHASE_STATUSES.has(finalStatus)) {
            break
          }
          await sleep(2000)
        }

        if (finalStatus === 'paid') {
          setPurchaseMessage(`Credit purchase confirmed (+${creditsPurchased} credits).`)
          await onRefreshCredits()
        } else {
          setPurchaseMessage(`Credit purchase ended with status: ${finalStatus || 'unknown'}.`)
        }
      } catch (requestError) {
        if (requestError instanceof ApiError) {
          setPurchaseMessage(`Unable to confirm credit purchase (${requestError.status}).`)
        } else {
          setPurchaseMessage('Unable to confirm credit purchase.')
        }
      } finally {
        window.history.replaceState({}, '', window.location.pathname)
      }
    }

    void pollPurchase()
  }, [onRefreshCredits])

  if (isLoading) {
    return <section className="challenge-list-page">Loading challenges...</section>
  }

  if (error) {
    return <section className="challenge-list-page">{error}</section>
  }

  return (
    <section className="challenge-list-page">
      <header>
        <h1>Prompt Injection Challenges</h1>
        <p>Spend credits on attacks, raise bounties, and hunt for accidental secret leaks.</p>
        {purchaseMessage && <p className="challenge-purchase-message">{purchaseMessage}</p>}
      </header>

      <div className="challenge-grid">
        {challenges.map((challenge) => (
          <article key={challenge.challenge_id} className="challenge-card">
            <div className="challenge-headline">
              <h2>{challenge.title}</h2>
              <span>{challenge.difficulty}</span>
            </div>
            <p>{challenge.description}</p>
            <ul>
              <li>Attempt cost: {formatCents(challenge.cost_per_attempt_cents)}</li>
              <li>Attack cost: {challenge.attack_cost_credits} credits</li>
              <li>Prize pool: {formatCents(challenge.prize_pool_cents)}</li>
            </ul>
            <button onClick={() => onNavigate(`/challenges/${challenge.challenge_id}`)}>
              Open Challenge
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
