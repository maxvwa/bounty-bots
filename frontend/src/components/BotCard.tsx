import { Bot } from "@/data/bots";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crosshair, TrendingUp, Users, Flame } from "lucide-react";

const difficultyColors: Record<string, string> = {
  Free: "bg-primary/20 text-primary border-primary/30",
  Easy: "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30",
  Medium: "bg-bounty/20 text-bounty border-bounty/30",
  Hard: "bg-destructive/20 text-destructive border-destructive/30",
};

interface BotCardProps {
  bot: Bot;
  onAttack: (bot: Bot) => void;
  disabled?: boolean;
}

export function BotCard({ bot, onAttack, disabled }: BotCardProps) {
  const bountyEuros = (bot.bounty / 100).toFixed(2);
  const hasBounty = bot.bounty > 0;

  return (
    <div className="group relative rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 neon-border hover:neon-border overflow-hidden">
      {/* Shimmer overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer bg-[length:200%_100%]" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="text-4xl">{bot.emoji}</div>
          <Badge className={`${difficultyColors[bot.difficulty]} border font-mono text-xs`}>
            {bot.difficulty}
          </Badge>
        </div>

        <h3 className="text-xl font-mono font-bold text-foreground mb-1">{bot.name}</h3>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{bot.description}</p>

        {/* Bounty display — the star of the card */}
        <div className={`relative rounded-md border p-3 mb-5 text-center transition-all duration-300 ${
          hasBounty
            ? "border-bounty/40 bg-bounty/10"
            : "border-border bg-secondary/30"
        }`}>
          {hasBounty && (
            <div className="absolute inset-0 rounded-md bg-gradient-to-r from-bounty/0 via-bounty/10 to-bounty/0 animate-shimmer bg-[length:200%_100%]" />
          )}
          <div className="relative flex items-center justify-center gap-2">
            {hasBounty ? (
              <Flame className="w-5 h-5 text-bounty animate-bounty-pulse" />
            ) : (
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            )}
            <span className={`font-mono font-bold text-lg ${
              hasBounty ? "text-bounty animate-bounty-pulse" : "text-muted-foreground"
            }`}>
              €{bountyEuros}
            </span>
          </div>
          <p className={`text-xs font-mono mt-1 ${hasBounty ? "text-bounty/70" : "text-muted-foreground/60"}`}>
            {hasBounty ? "BOUNTY — crack it to claim" : "Bounty grows with each failed attempt"}
          </p>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-sm mb-5">
          <Users className="w-4 h-4" />
          <span className="font-mono">{bot.attempts.toLocaleString()} attempts</span>
        </div>

        <Button
          onClick={() => onAttack(bot)}
          disabled={disabled}
          className="w-full font-mono gap-2 bg-primary text-primary-foreground hover:bg-primary/80"
        >
          <Crosshair className="w-4 h-4" />
          {bot.creditCost === 0 ? "Attack — Free" : `Attack — ${bot.creditCost} credit${bot.creditCost > 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
}