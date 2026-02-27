import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Coins, CreditCard, LogOut, Trophy, User } from "lucide-react";

interface AccountMenuProps {
  credits: number;
  totalEarnings: number;
  email: string | null;
  onBuyCredits: () => void;
  onLogout: () => void;
}

function avatarFallback(email: string | null): string {
  if (!email) {
    return "HB";
  }

  const [name] = email.split("@");
  const clean = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return (clean.slice(0, 2) || "HB").padEnd(2, "B");
}

export function AccountMenu({
  credits,
  totalEarnings,
  email,
  onBuyCredits,
  onLogout,
}: AccountMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 hover:bg-secondary hover:border-muted-foreground/30 transition-all">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/20 text-primary font-mono text-xs font-bold">
              {avatarFallback(email)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex items-center gap-1.5 text-primary font-mono text-sm">
            <Coins className="w-3.5 h-3.5" />
            <span className="font-bold">{credits}</span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card border-border">
        <DropdownMenuLabel className="font-mono">
          <div className="flex flex-col gap-1">
            <span className="text-foreground">Authenticated Hacker</span>
            <span className="text-xs text-muted-foreground font-normal">
              {email ?? "anonymous@local"}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />

        <div className="px-2 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-mono">
            <Coins className="w-4 h-4 text-primary" />
            <span className="text-foreground">{credits} credits</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-mono">
            <Trophy className="w-4 h-4 text-bounty" />
            <span className="text-bounty">€{(totalEarnings / 100).toFixed(2)}</span>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-border" />

        <DropdownMenuItem
          onClick={onBuyCredits}
          className="font-mono text-sm cursor-pointer focus:bg-primary/10 focus:text-primary"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Buy Credits
        </DropdownMenuItem>
        <DropdownMenuItem className="font-mono text-sm cursor-default" disabled>
          <User className="w-4 h-4 mr-2" />
          Profile (coming soon)
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          className="font-mono text-sm cursor-pointer focus:bg-destructive/10 focus:text-destructive"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
