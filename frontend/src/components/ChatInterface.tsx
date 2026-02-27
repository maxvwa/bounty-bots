import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { ArrowLeft, Coins, Send, ShieldCheck } from "lucide-react";
import { Bot } from "@/data/bots";
import { ChatMessage } from "@/hooks/useGameState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatInterfaceProps {
  bot: Bot;
  messages: ChatMessage[];
  credits: number;
  hasWon: boolean;
  isVerifying: boolean;
  statusMessage: string | null;
  onSend: (msg: string) => void;
  onSubmitSecret: (secret: string) => void;
  onExit: () => void;
}

export function ChatInterface({
  bot,
  messages,
  credits,
  hasWon,
  isVerifying,
  statusMessage,
  onSend,
  onSubmitSecret,
  onExit,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [secretInput, setSecretInput] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasConfettied = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!scrollRef.current) {
        return;
      }
      const scrollContainer = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    if (hasWon && !hasConfettied.current) {
      hasConfettied.current = true;
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#22c55e", "#a855f7", "#eab308"],
      });
    }
  }, [hasWon]);

  const handleSend = () => {
    if (!input.trim() || hasWon) {
      return;
    }
    if (bot.creditCost > 0 && credits < bot.creditCost) {
      return;
    }
    onSend(input.trim());
    setInput("");
  };

  const handleSubmitSecret = () => {
    if (!secretInput.trim() || hasWon || isVerifying) {
      return;
    }
    onSubmitSecret(secretInput.trim());
    setShowSubmit(false);
  };

  const canSend = !hasWon && (bot.creditCost === 0 || credits >= bot.creditCost);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onExit}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-2xl">{bot.emoji}</span>
          <div>
            <h2 className="font-mono font-bold text-foreground">{bot.name}</h2>
            <p className="text-xs text-muted-foreground">{bot.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-bounty font-mono text-sm">
            <span>Bounty:</span>
            <span className="font-bold">€{(bot.bounty / 100).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-primary font-mono text-sm">
            <Coins className="w-4 h-4" />
            <span className="font-bold">{credits}</span>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 font-mono text-sm ${
                  msg.role === "user"
                    ? "bg-primary/20 text-foreground border border-primary/30"
                    : msg.role === "system"
                      ? "bg-muted text-muted-foreground border border-border italic"
                      : msg.isSecretExposure
                        ? "bg-destructive/10 text-destructive border border-destructive/40"
                        : "bg-card text-foreground border border-border"
                }`}
              >
                {msg.isSecretExposure && (
                  <p className="text-[10px] uppercase tracking-wider mb-1">Exposure Event</p>
                )}
                {msg.content}
              </div>
            </div>
          ))}

          {hasWon && (
            <div className="text-center py-8">
              <div className="inline-block rounded-lg border border-primary bg-primary/10 neon-border px-8 py-6">
                <div className="text-4xl mb-2">🏆</div>
                <h3 className="text-2xl font-mono font-bold neon-text text-primary mb-2">
                  SECRET VERIFIED!
                </h3>
                <p className="text-bounty font-mono text-xl font-bold mb-1">
                  +€{(bot.bounty / 100).toFixed(2)} claimed
                </p>
                <p className="text-muted-foreground text-sm">
                  You have completed this challenge.
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border bg-card p-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {statusMessage && (
            <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs font-mono text-muted-foreground">
              {statusMessage}
            </p>
          )}

          {!hasWon && (
            <div className="flex justify-center">
              <Button
                variant={showSubmit ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowSubmit(!showSubmit)}
                className="font-mono text-xs gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {showSubmit ? "Back to chat" : "I found the secret — Submit it"}
              </Button>
            </div>
          )}

          {showSubmit && !hasWon ? (
            <div className="flex gap-2">
              <Input
                value={secretInput}
                onChange={(event) => setSecretInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSubmitSecret();
                  }
                }}
                placeholder="Paste the secret you found..."
                disabled={isVerifying}
                className="font-mono bg-muted border-border text-foreground placeholder:text-muted-foreground"
              />
              <Button
                onClick={handleSubmitSecret}
                disabled={isVerifying || !secretInput.trim()}
                size="icon"
                className="bg-chart-2 text-primary-foreground hover:bg-chart-2/80"
              >
                <ShieldCheck className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSend();
                  }
                }}
                placeholder={
                  hasWon
                    ? "Challenge completed"
                    : !canSend
                      ? "Not enough credits"
                      : "Enter your prompt injection"
                }
                disabled={!canSend}
                className="font-mono bg-muted border-border text-foreground placeholder:text-muted-foreground"
              />
              <Button
                onClick={handleSend}
                disabled={!canSend}
                size="icon"
                className="bg-primary text-primary-foreground"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}

          {!hasWon && !showSubmit && bot.creditCost > 0 && (
            <p className="text-center text-xs text-muted-foreground font-mono">
              Each attack message costs {bot.creditCost} credit
              {bot.creditCost > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
