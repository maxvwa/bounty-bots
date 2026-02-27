import type { ChallengeListItem } from "@/types/api";

export interface Bot {
  id: number;
  name: string;
  role: string;
  description: string;
  emoji: string;
  difficulty: "Easy" | "Medium" | "Hard";
  creditCost: number;
  bounty: number;
  attempts: number;
  attemptCostCents: number;
}

const BOT_EMOJIS = ["🕵️", "🏦", "🧠", "🔐", "🛰️", "🤖", "🛡️", "🧬"];

function mapDifficulty(difficulty: string): "Easy" | "Medium" | "Hard" {
  const normalized = difficulty.trim().toLowerCase();
  if (normalized === "hard") {
    return "Hard";
  }
  if (normalized === "medium") {
    return "Medium";
  }
  return "Easy";
}

export function mapChallengeToBot(challenge: ChallengeListItem, attempts = 0): Bot {
  const mappedDifficulty = mapDifficulty(challenge.difficulty);
  const difficultyRole = `${mappedDifficulty} Security Agent`;

  return {
    id: challenge.challenge_id,
    name: challenge.title,
    role: difficultyRole,
    description: challenge.description,
    emoji: BOT_EMOJIS[(challenge.challenge_id - 1) % BOT_EMOJIS.length],
    difficulty: mappedDifficulty,
    creditCost: challenge.attack_cost_credits,
    bounty: challenge.prize_pool_cents,
    attempts,
    attemptCostCents: challenge.cost_per_attempt_cents,
  };
}
