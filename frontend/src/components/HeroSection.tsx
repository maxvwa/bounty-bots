import { Shield, Zap, Trophy } from "lucide-react";

const steps = [
  { icon: Shield, label: "Pick a Bot", desc: "Choose an AI agent to attack" },
  { icon: Zap, label: "Attack", desc: "Use prompt injection to extract the secret" },
  { icon: Trophy, label: "Win the Bounty", desc: "Leak the secret and earn the payout" },
];

export function HeroSection() {
  return (
    <section className="relative py-20 px-4 text-center overflow-hidden">
      <div className="absolute inset-0 scanline pointer-events-none opacity-50" />
      <div className="relative z-10 max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold font-mono neon-text text-primary mb-4 tracking-tight">
          Break the Bots.
          <br />
          <span className="text-foreground">Earn the Bounty.</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
          Test your prompt injection skills against AI agents guarding secrets.
          Crack their defenses, leak the intel, and collect the reward.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card/50 border border-border neon-border"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <step.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-mono font-semibold text-foreground">{step.label}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
