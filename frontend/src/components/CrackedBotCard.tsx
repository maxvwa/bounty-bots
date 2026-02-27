import { CrackedBot } from "@/hooks/useGameState";
import { Badge } from "@/components/ui/badge";
import { ShieldOff, Eye } from "lucide-react";

interface CrackedBotCardProps {
  crackedBot: CrackedBot;
  onClick: () => void;
}

export function CrackedBotCard({ crackedBot, onClick }: CrackedBotCardProps) {
  const { bot, crackedAt, bountyWon } = crackedBot;

  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left rounded-lg border border-destructive/30 bg-card p-6 transition-all duration-300 hover:border-destructive/60 overflow-hidden"
    >
      {/* Leaked overlay scanlines */}
      <div className="absolute inset-0 opacity-20 pointer-events-none scanline" />
      <div className="absolute top-3 right-3">
        <Badge className="bg-destructive/20 text-destructive border-destructive/40 border font-mono text-xs gap-1 animate-pulse">
          <ShieldOff className="w-3 h-3" />
          LEAKED
        </Badge>
      </div>

      <div className="relative z-10">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-3xl grayscale-[30%]">{bot.emoji}</span>
          <div>
            <h3 className="text-lg font-mono font-bold text-foreground line-through decoration-destructive/50">{bot.name}</h3>
            <p className="text-xs text-muted-foreground">{bot.role}</p>
          </div>
        </div>

        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 mb-3 font-mono text-xs text-destructive/80 break-all">
          <span className="text-destructive font-bold">SECRET:</span> {crackedBot.secret}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
          <span>+€{(bountyWon / 100).toFixed(2)} earned</span>
          <span>{crackedAt.toLocaleDateString()}</span>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          <Eye className="w-3.5 h-3.5" />
          <span>View chat history</span>
        </div>
      </div>
    </button>
  );
}
