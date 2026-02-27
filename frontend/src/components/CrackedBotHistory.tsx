import { CrackedBot, ChatMessage } from "@/hooks/useGameState";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CrackedBotHistoryProps {
  crackedBot: CrackedBot;
  onBack: () => void;
}

export function CrackedBotHistory({ crackedBot, onBack }: CrackedBotHistoryProps) {
  const { bot, messages, secret } = crackedBot;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-2xl">{bot.emoji}</span>
          <div>
            <h2 className="font-mono font-bold text-foreground">{bot.name}</h2>
            <p className="text-xs text-muted-foreground">{bot.role}</p>
          </div>
        </div>
        <Badge className="bg-destructive/20 text-destructive border-destructive/40 border font-mono text-xs gap-1">
          <ShieldOff className="w-3 h-3" />
          LEAKED
        </Badge>
      </header>

      {/* Leaked secret banner */}
      <div className="border-b border-destructive/30 bg-destructive/5 px-4 py-3">
        <p className="text-xs font-mono text-muted-foreground mb-1">LEAKED SECRET</p>
        <p className="font-mono text-sm text-destructive break-all">{secret}</p>
      </div>

      <ScrollArea className="flex-1 p-4">
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
                    : "bg-card text-foreground border border-border"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
