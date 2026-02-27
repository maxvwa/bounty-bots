import { useCallback, useMemo, useState } from "react";
import { ApiError, apiFetch } from "@/api/client";
import { Bot, mapChallengeToBot } from "@/data/bots";
import type {
  AttemptResponse,
  ChallengeListItem,
  ConversationRead,
  CreditBalanceResponse,
  CreditPurchaseCreateResponse,
  CreditPurchaseReadResponse,
  MessageRead,
  PaymentCreateResponse,
  PaymentStatusResponse,
  SendMessageResponse,
} from "@/types/api";

const CENTS_PER_CREDIT = 10;
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 45;
const PENDING_ATTEMPT_KEY = "bb_pending_attempt";

const TERMINAL_PAYMENT_STATUSES = new Set(["paid", "failed", "canceled", "expired"]);

export interface ChatMessage {
  id: string;
  role: "user" | "bot" | "system";
  content: string;
  timestamp: Date;
  isSecretExposure?: boolean;
}

export interface CrackedBot {
  bot: Bot;
  messages: ChatMessage[];
  secret: string;
  crackedAt: Date;
  bountyWon: number;
}

interface PendingAttempt {
  paymentId: number;
  challengeId: number;
  submittedSecret: string;
  createdAtIso: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function mapMessage(message: MessageRead): ChatMessage {
  return {
    id: `msg-${message.message_id}`,
    role: message.role === "assistant" ? "bot" : "user",
    content: message.content,
    timestamp: new Date(message.created_at),
    isSecretExposure: message.is_secret_exposure,
  };
}

function loadPendingAttempt(): PendingAttempt | null {
  const raw = sessionStorage.getItem(PENDING_ATTEMPT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PendingAttempt;
    if (
      typeof parsed.paymentId === "number" &&
      typeof parsed.challengeId === "number" &&
      typeof parsed.submittedSecret === "string"
    ) {
      return parsed;
    }
  } catch {
    sessionStorage.removeItem(PENDING_ATTEMPT_KEY);
  }

  return null;
}

function savePendingAttempt(value: PendingAttempt): void {
  sessionStorage.setItem(PENDING_ATTEMPT_KEY, JSON.stringify(value));
}

function clearPendingAttempt(): void {
  sessionStorage.removeItem(PENDING_ATTEMPT_KEY);
}

async function pollPaymentStatus(paymentId: number): Promise<PaymentStatusResponse> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const payment = await apiFetch<PaymentStatusResponse>(`/payments/${paymentId}`);
    if (TERMINAL_PAYMENT_STATUSES.has(payment.status)) {
      return payment;
    }
    await delay(POLL_INTERVAL_MS);
  }

  throw new Error("Timed out waiting for payment confirmation");
}

async function pollCreditPurchaseStatus(
  purchaseId: number,
): Promise<CreditPurchaseReadResponse> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const purchase = await apiFetch<CreditPurchaseReadResponse>(
      `/credits/purchases/${purchaseId}`,
    );
    if (TERMINAL_PAYMENT_STATUSES.has(purchase.status)) {
      return purchase;
    }
    await delay(POLL_INTERVAL_MS);
  }

  throw new Error("Timed out waiting for credit purchase confirmation");
}

export function useGameState() {
  const [credits, setCredits] = useState(0);
  const [bots, setBots] = useState<Bot[]>([]);
  const [activeBotId, setActiveBotId] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasWon, setHasWon] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isArenaLoading, setIsArenaLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [crackedBots, setCrackedBots] = useState<CrackedBot[]>([]);
  const [attemptsByBot, setAttemptsByBot] = useState<Record<number, number>>({});

  const activeBot = useMemo(
    () => bots.find((bot) => bot.id === activeBotId) ?? null,
    [activeBotId, bots],
  );

  const refreshCredits = useCallback(async () => {
    const balance = await apiFetch<CreditBalanceResponse>("/credits/balance");
    setCredits(balance.balance_credits);
  }, []);

  const refreshChallenges = useCallback(async () => {
    const challenges = await apiFetch<ChallengeListItem[]>("/challenges");
    setBots(
      challenges.map((challenge) =>
        mapChallengeToBot(challenge, attemptsByBot[challenge.challenge_id] ?? 0),
      ),
    );
  }, [attemptsByBot]);

  const refreshArena = useCallback(async () => {
    setIsArenaLoading(true);
    setStatusMessage(null);
    try {
      await Promise.all([refreshChallenges(), refreshCredits()]);
    } catch (error) {
      if (error instanceof ApiError) {
        const body = error.body as { detail?: string };
        setStatusMessage(body?.detail ?? "Failed to load arena state");
      } else {
        setStatusMessage("Failed to load arena state");
      }
    } finally {
      setIsArenaLoading(false);
    }
  }, [refreshChallenges, refreshCredits]);

  const startAttack = useCallback(async (bot: Bot) => {
    setStatusMessage(null);
    setHasWon(false);
    try {
      const conversation = await apiFetch<ConversationRead>(
        `/challenges/${bot.id}/conversations`,
        {
          method: "POST",
        },
      );

      const history = await apiFetch<MessageRead[]>(
        `/conversations/${conversation.conversation_id}/messages`,
      );

      setActiveBotId(bot.id);
      setConversationId(conversation.conversation_id);

      if (history.length > 0) {
        setMessages(history.map(mapMessage));
        return;
      }

      setMessages([
        {
          id: `system-connect-${Date.now()}`,
          role: "system",
          content: `Connected to ${bot.name}. Probe carefully and extract the protected token.`,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      if (error instanceof ApiError) {
        const body = error.body as { detail?: string };
        setStatusMessage(body?.detail ?? "Unable to open challenge session");
      } else {
        setStatusMessage("Unable to open challenge session");
      }
    }
  }, []);

  const startAttackById = useCallback(
    async (botId: number) => {
      try {
        const existingBot = bots.find((candidate) => candidate.id === botId);
        if (existingBot) {
          await startAttack(existingBot);
          return;
        }

        const challenge = await apiFetch<ChallengeListItem>(`/challenges/${botId}`);
        const mapped = mapChallengeToBot(challenge, attemptsByBot[botId] ?? 0);
        setBots((previousBots) => {
          if (previousBots.some((candidate) => candidate.id === mapped.id)) {
            return previousBots;
          }
          return [...previousBots, mapped];
        });
        await startAttack(mapped);
      } catch (error) {
        if (error instanceof ApiError) {
          const body = error.body as { detail?: string };
          setStatusMessage(body?.detail ?? "Challenge not found");
          return;
        }
        setStatusMessage("Challenge not found");
      }
    },
    [attemptsByBot, bots, startAttack],
  );

  const updateBotAfterAttack = useCallback((botId: number, prizePoolCents: number) => {
    setAttemptsByBot((previous) => ({
      ...previous,
      [botId]: (previous[botId] ?? 0) + 1,
    }));

    setBots((previousBots) =>
      previousBots.map((candidate) =>
        candidate.id === botId
          ? {
              ...candidate,
              bounty: prizePoolCents,
              attempts: candidate.attempts + 1,
            }
          : candidate,
      ),
    );
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeBot || !conversationId || hasWon) {
        return;
      }

      setStatusMessage(null);

      try {
        const response = await apiFetch<SendMessageResponse>(
          `/conversations/${conversationId}/messages`,
          {
            method: "POST",
            body: JSON.stringify({ content }),
          },
        );

        const userMessage = mapMessage(response.user_message);
        const botMessage = mapMessage(response.bot_message);

        setMessages((previousMessages) => {
          const nextMessages = [...previousMessages, userMessage, botMessage];
          if (response.did_expose_secret) {
            nextMessages.push({
              id: `system-exposure-${Date.now()}`,
              role: "system",
              content:
                "⚠ Secret exposure event detected (20% mock probability trigger).",
              timestamp: new Date(),
            });
          }
          return nextMessages;
        });

        setCredits(response.remaining_credits);
        updateBotAfterAttack(activeBot.id, response.updated_prize_pool_cents);
      } catch (error) {
        if (error instanceof ApiError) {
          const body = error.body as { detail?: string };
          setStatusMessage(body?.detail ?? "Message send failed");
          if (error.status === 402) {
            await refreshCredits();
          }
          return;
        }
        setStatusMessage("Message send failed");
      }
    },
    [activeBot, conversationId, hasWon, refreshCredits, updateBotAfterAttack],
  );

  const submitSecret = useCallback(
    async (submission: string) => {
      if (!activeBot || hasWon || isVerifying) {
        return;
      }

      setIsVerifying(true);
      setStatusMessage(null);

      try {
        const payment = await apiFetch<PaymentCreateResponse>("/payments", {
          method: "POST",
          body: JSON.stringify({ challenge_id: activeBot.id }),
        });

        savePendingAttempt({
          paymentId: payment.payment_id,
          challengeId: activeBot.id,
          submittedSecret: submission,
          createdAtIso: new Date().toISOString(),
        });

        window.location.assign(payment.checkout_url);
      } catch (error) {
        if (error instanceof ApiError) {
          const body = error.body as { detail?: string };
          setStatusMessage(body?.detail ?? "Unable to start payment for secret submission");
        } else {
          setStatusMessage("Unable to start payment for secret submission");
        }
      } finally {
        setIsVerifying(false);
      }
    },
    [activeBot, hasWon, isVerifying],
  );

  const completeAttemptFromPayment = useCallback(
    async (challengeId: number, paymentId: number) => {
      setIsVerifying(true);
      setStatusMessage("Waiting for payment confirmation...");

      try {
        const payment = await pollPaymentStatus(paymentId);
        if (payment.status !== "paid") {
          setStatusMessage(`Payment ended with status: ${payment.status}`);
          return;
        }

        const pendingAttempt = loadPendingAttempt();
        if (
          pendingAttempt === null ||
          pendingAttempt.paymentId !== paymentId ||
          pendingAttempt.challengeId !== challengeId
        ) {
          setStatusMessage("No pending secret submission found for this payment");
          return;
        }

        const attemptResult = await apiFetch<AttemptResponse>("/attempts", {
          method: "POST",
          body: JSON.stringify({
            challenge_id: challengeId,
            payment_id: paymentId,
            submitted_secret: pendingAttempt.submittedSecret,
          }),
        });

        const currentBot = bots.find((candidate) => candidate.id === challengeId) ?? activeBot;
        if (attemptResult.attempt.is_correct && currentBot) {
          setHasWon(true);
          setTotalEarnings((previous) => previous + currentBot.bounty);
          setCrackedBots((previous) => [
            {
              bot: currentBot,
              messages,
              secret: pendingAttempt.submittedSecret,
              crackedAt: new Date(),
              bountyWon: currentBot.bounty,
            },
            ...previous.filter((entry) => entry.bot.id !== currentBot.id),
          ]);
        }

        setMessages((previousMessages) => [
          ...previousMessages,
          {
            id: `system-attempt-${Date.now()}`,
            role: "system",
            content: attemptResult.message,
            timestamp: new Date(),
          },
        ]);

        clearPendingAttempt();
        await refreshArena();
        setStatusMessage(attemptResult.message);
      } catch (error) {
        if (error instanceof ApiError) {
          const body = error.body as { detail?: string };
          setStatusMessage(body?.detail ?? "Failed to finalize paid attempt");
          return;
        }
        setStatusMessage("Failed to finalize paid attempt");
      } finally {
        setIsVerifying(false);
      }
    },
    [activeBot, bots, messages, refreshArena],
  );

  const startCreditPurchase = useCallback(async (creditsToBuy: number) => {
    const amountCents = creditsToBuy * CENTS_PER_CREDIT;
    if (amountCents <= 0) {
      throw new Error("creditsToBuy must be positive");
    }

    const purchase = await apiFetch<CreditPurchaseCreateResponse>("/credits/purchases", {
      method: "POST",
      body: JSON.stringify({ amount_cents: amountCents }),
    });

    window.location.assign(purchase.checkout_url);
  }, []);

  const completeCreditPurchase = useCallback(
    async (purchaseId: number) => {
      setStatusMessage("Waiting for credit purchase confirmation...");
      try {
        const purchase = await pollCreditPurchaseStatus(purchaseId);
        if (purchase.status !== "paid") {
          setStatusMessage(`Credit purchase ended with status: ${purchase.status}`);
          return;
        }

        await refreshCredits();
        setStatusMessage(
          `Credits added successfully (+${purchase.credits_purchased} credits).`,
        );
      } catch (error) {
        if (error instanceof ApiError) {
          const body = error.body as { detail?: string };
          setStatusMessage(body?.detail ?? "Failed to confirm credit purchase");
          return;
        }
        setStatusMessage("Failed to confirm credit purchase");
      }
    },
    [refreshCredits],
  );

  const clearStatus = useCallback(() => {
    setStatusMessage(null);
  }, []);

  const getBotWithBounty = useCallback(
    (bot: Bot): Bot => {
      const refreshed = bots.find((candidate) => candidate.id === bot.id);
      if (refreshed) {
        return refreshed;
      }
      return bot;
    },
    [bots],
  );

  const exitChat = useCallback(() => {
    setActiveBotId(null);
    setConversationId(null);
    setMessages([]);
    setHasWon(false);
    setStatusMessage(null);
  }, []);

  return {
    credits,
    bots,
    activeBot,
    messages,
    hasWon,
    isVerifying,
    isArenaLoading,
    statusMessage,
    totalEarnings,
    crackedBots,
    getBotWithBounty,
    refreshArena,
    startAttack,
    startAttackById,
    sendMessage,
    submitSecret,
    exitChat,
    startCreditPurchase,
    completeCreditPurchase,
    completeAttemptFromPayment,
    clearStatus,
  };
}
