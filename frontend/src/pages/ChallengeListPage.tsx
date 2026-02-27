import { useEffect, useState } from 'react'
import { ApiError, apiFetch } from '../api/client'
import type { ChallengeListItem } from '../types'
import './ChallengeListPage.css'

interface ChallengeListPageProps {
  onNavigate: (path: string) => void
}

function formatCents(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`
}

export default function ChallengeListPage({ onNavigate }: ChallengeListPageProps) {
  const [challenges, setChallenges] = useState<ChallengeListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        <p>Chat with each bot, find weak points, and pay per secret submission attempt.</p>
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
