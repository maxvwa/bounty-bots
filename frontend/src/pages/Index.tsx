import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Crosshair, ShieldOff } from "lucide-react";
import { AccountMenu } from "@/components/AccountMenu";
import { BotCard } from "@/components/BotCard";
import { BuyCreditsDialog } from "@/components/BuyCreditsDialog";
import { ChatInterface } from "@/components/ChatInterface";
import { CrackedBotCard } from "@/components/CrackedBotCard";
import { CrackedBotHistory } from "@/components/CrackedBotHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { CrackedBot, useGameState } from "@/hooks/useGameState";

const Index = () => {
  const {
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
  } = useGameState();
  const { currentUser, logout } = useAuth();
  const [buyOpen, setBuyOpen] = useState(false);
  const [viewingCracked, setViewingCracked] = useState<CrackedBot | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ challengeId?: string }>();

  const handledCreditPurchaseIdsRef = useRef<Set<number>>(new Set());
  const handledPaymentIdsRef = useRef<Set<number>>(new Set());

  const initialChallengeId = useMemo(() => {
    const raw = params.challengeId;
    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return parsed;
  }, [params.challengeId]);

  useEffect(() => {
    void refreshArena();
  }, [refreshArena]);

  useEffect(() => {
    if (!initialChallengeId || isArenaLoading || activeBot?.id === initialChallengeId) {
      return;
    }

    void startAttackById(initialChallengeId);
  }, [activeBot?.id, initialChallengeId, isArenaLoading, startAttackById]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const purchaseIdRaw = searchParams.get("credit_purchase_id");
    if (!purchaseIdRaw) {
      return;
    }

    const purchaseId = Number(purchaseIdRaw);
    if (!Number.isFinite(purchaseId)) {
      return;
    }

    if (handledCreditPurchaseIdsRef.current.has(purchaseId)) {
      return;
    }

    handledCreditPurchaseIdsRef.current.add(purchaseId);

    void (async () => {
      await completeCreditPurchase(purchaseId);
      navigate(location.pathname, { replace: true });
    })();
  }, [completeCreditPurchase, location.pathname, location.search, navigate]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const paymentIdRaw = searchParams.get("payment_id");
    if (!paymentIdRaw || !initialChallengeId || isArenaLoading) {
      return;
    }

    if (!activeBot || activeBot.id !== initialChallengeId) {
      return;
    }

    const paymentId = Number(paymentIdRaw);
    if (!Number.isFinite(paymentId)) {
      return;
    }

    if (handledPaymentIdsRef.current.has(paymentId)) {
      return;
    }

    handledPaymentIdsRef.current.add(paymentId);

    void (async () => {
      await completeAttemptFromPayment(initialChallengeId, paymentId);
      navigate(`/challenges/${initialChallengeId}`, { replace: true });
    })();
  }, [
    activeBot,
    completeAttemptFromPayment,
    initialChallengeId,
    isArenaLoading,
    location.search,
    navigate,
  ]);

  if (viewingCracked) {
    return (
      <CrackedBotHistory
        crackedBot={viewingCracked}
        onBack={() => setViewingCracked(null)}
      />
    );
  }

  if (activeBot) {
    const liveBotData = getBotWithBounty(activeBot);
    return (
      <ChatInterface
        bot={liveBotData}
        messages={messages}
        credits={credits}
        hasWon={hasWon}
        isVerifying={isVerifying}
        statusMessage={statusMessage}
        onSend={(msg) => {
          void sendMessage(msg);
        }}
        onSubmitSecret={(secret) => {
          void submitSecret(secret);
        }}
        onExit={() => {
          exitChat();
          navigate("/challenges", { replace: true });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h2 className="font-mono font-bold text-lg text-primary neon-text tracking-wider">
            BOUNTY BOTS
          </h2>
          <AccountMenu
            credits={credits}
            totalEarnings={totalEarnings}
            email={currentUser?.email ?? null}
            onBuyCredits={() => setBuyOpen(true)}
            onLogout={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          />
        </div>
      </nav>

      <BuyCreditsDialog
        open={buyOpen}
        onOpenChange={setBuyOpen}
        onPurchase={startCreditPurchase}
      />

      <section className="max-w-7xl mx-auto px-4 pb-20 pt-6">
        {statusMessage && (
          <p className="mb-6 rounded-md border border-border bg-muted px-4 py-3 text-sm font-mono text-muted-foreground">
            {statusMessage}
          </p>
        )}

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-muted/50 border border-border mb-8">
            <TabsTrigger
              value="active"
              className="font-mono gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
            >
              <Crosshair className="w-4 h-4" />
              Active Challenges
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="font-mono gap-2 data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive"
            >
              <ShieldOff className="w-4 h-4" />
              Leaked
              {crackedBots.length > 0 && (
                <span className="ml-1 rounded-full bg-destructive/20 text-destructive px-1.5 py-0.5 text-xs font-bold">
                  {crackedBots.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {isArenaLoading ? (
              <div className="text-center py-20">
                <p className="font-mono text-muted-foreground">Loading challenge arena...</p>
              </div>
            ) : bots.length === 0 ? (
              <div className="text-center py-20">
                <p className="font-mono text-muted-foreground">No active challenges available.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bots.map((bot) => {
                  const liveBot = getBotWithBounty(bot);
                  return (
                    <BotCard
                      key={bot.id}
                      bot={liveBot}
                      onAttack={(candidate) => {
                        void startAttack(candidate);
                        navigate(`/challenges/${candidate.id}`, { replace: true });
                      }}
                      disabled={
                        (bot.creditCost > 0 && credits < bot.creditCost) || isArenaLoading
                      }
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            {crackedBots.length === 0 ? (
              <div className="text-center py-20">
                <ShieldOff className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-mono text-muted-foreground">No bots cracked yet.</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Crack a bot's secret to see it here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {crackedBots.map((entry) => (
                  <CrackedBotCard
                    key={entry.bot.id}
                    crackedBot={entry}
                    onClick={() => setViewingCracked(entry)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
};

export default Index;
