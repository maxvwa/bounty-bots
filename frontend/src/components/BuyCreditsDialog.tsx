import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Coins, Crown, Rocket, Zap } from "lucide-react";

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  amountCents: number;
  icon: React.ReactNode;
  popular?: boolean;
}

const packages: CreditPackage[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 10,
    amountCents: 100,
    icon: <Coins className="w-5 h-5" />,
  },
  {
    id: "hacker",
    name: "Hacker",
    credits: 50,
    amountCents: 500,
    icon: <Zap className="w-5 h-5" />,
    popular: true,
  },
  {
    id: "elite",
    name: "Elite",
    credits: 100,
    amountCents: 1000,
    icon: <Crown className="w-5 h-5" />,
  },
  {
    id: "whale",
    name: "Whale",
    credits: 250,
    amountCents: 2500,
    icon: <Rocket className="w-5 h-5" />,
  },
];

interface BuyCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchase: (credits: number) => Promise<void>;
}

export function BuyCreditsDialog({
  open,
  onOpenChange,
  onPurchase,
}: BuyCreditsDialogProps) {
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy(pkg: CreditPackage) {
    setPurchasing(pkg.id);
    setError(null);

    try {
      await onPurchase(pkg.credits);
      setPurchasing(null);
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error && error.message.trim().length > 0) {
        setError(error.message);
      } else {
        setError("Failed to initiate checkout");
      }
      setPurchasing(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary neon-text text-xl">
            Buy Credits
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            One credit equals €0.10. Demo mode can add credits instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => {
                void handleBuy(pkg);
              }}
              disabled={purchasing !== null}
              className={`relative flex items-center gap-4 p-4 rounded-lg border transition-all text-left
                ${
                  pkg.popular
                    ? "border-primary bg-primary/10 hover:bg-primary/15 neon-border"
                    : "border-border bg-secondary/50 hover:bg-secondary hover:border-muted-foreground/30"
                }
                ${purchasing === pkg.id ? "opacity-70 animate-pulse" : ""}
                disabled:cursor-not-allowed
              `}
            >
              {pkg.popular && (
                <span className="absolute -top-2.5 right-3 text-[10px] font-mono font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Popular
                </span>
              )}
              <div className="text-primary">{pkg.icon}</div>
              <div className="flex-1">
                <div className="font-mono font-bold text-foreground">{pkg.name}</div>
                <div className="text-sm text-muted-foreground font-mono">
                  {pkg.credits} credits
                </div>
              </div>
              <div className="font-mono font-bold text-bounty text-lg">
                €{(pkg.amountCents / 100).toFixed(2)}
              </div>
            </button>
          ))}
        </div>

        {error && (
          <p className="text-xs text-destructive text-center font-mono">{error}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
