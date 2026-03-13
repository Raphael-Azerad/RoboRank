import { Link } from "react-router-dom";
import { BarChart3, Target, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegalPageWrapper } from "@/components/layout/LegalPageWrapper";

export default function About() {
  return (
    <LegalPageWrapper>
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-display font-bold">About <span className="text-gradient">RoboRank</span></h1>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            RoboRank is the #1 analytics platform built specifically for VEX V5 Robotics Competition teams. 
            We help teams prepare for tournaments with data-driven scouting, match predictions, and deep performance analytics.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Target, title: "Our Mission", desc: "To give every VEX team access to the same level of data analysis that top-tier teams use to dominate competitions." },
            { icon: Zap, title: "How It Works", desc: "We pull publicly available competition data and run it through our proprietary RoboRank algorithm to generate scores, predictions, and insights." },
            { icon: Users, title: "Built for Teams", desc: "One teammate subscribes and the whole team gets premium access. No per-seat pricing, no complicated licensing." },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border/50 card-gradient p-5 space-y-3">
              <item.icon className="h-5 w-5 text-primary" />
              <h3 className="font-display font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-display font-semibold">The RoboRank Score — Full Transparency</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The RoboRank score is a 0–100 composite rating calculated from publicly available competition data. 
            Here's exactly how it's broken down:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { weight: "25%", label: "Win Rate", desc: "Your wins divided by total matches played. A perfect record scores the full 25 points." },
              { weight: "20%", label: "Ranking Percentile", desc: "Where you place relative to the field at each event. Finishing 1st in a 24-team event = 100th percentile. Averaged across all events." },
              { weight: "20%", label: "Skills Score", desc: "Your combined Driver + Programming skills score, normalized against a benchmark of 350. Higher skills scores push this component toward 20 points." },
              { weight: "15%", label: "Consistency", desc: "How stable your ranking percentile is across events. Low variance = high consistency. Calculated using standard deviation of your percentiles." },
              { weight: "10%", label: "Event Volume", desc: "Number of events attended, capped at 6. Attending more events (up to 6) earns more points here." },
              { weight: "10%", label: "High Score", desc: "Your single highest match score across all events, normalized against a benchmark of 100 points." },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border/50 bg-card/50 p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-display font-semibold text-sm">{item.label}</span>
                  <span className="text-xs font-mono text-primary">{item.weight}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-2">
            <p className="text-sm font-display font-semibold text-yellow-400/90">⚠️ Important Notes</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside leading-relaxed">
              <li>Teams must have played at least <strong>3 matches</strong> to receive a score. Teams with fewer than 5 matches are excluded from the global leaderboard.</li>
              <li>The global RoboRank leaderboard samples the <strong>top 2,000 teams by skills score</strong> as its candidate pool. Teams outside this pool can still be searched individually and will have their score calculated on the fly.</li>
              <li>RoboRank is <strong>not an official VEX metric</strong>. It is an independent, community-built tool designed to provide useful insights — not to replace official standings.</li>
              <li>All component weights and benchmarks are subject to change as we refine the algorithm.</li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-display font-semibold">Data Sources</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            All competition data is sourced from publicly available results through the RobotEvents platform. 
            We do not collect or display any private team information. Our analytics are based purely on 
            official competition outcomes. RoboRank is not affiliated with, endorsed by, or connected to 
            the REC Foundation or VEX Robotics in any way.
          </p>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
          <h2 className="text-xl font-display font-semibold">Questions?</h2>
          <p className="text-sm text-muted-foreground">We'd love to hear from you.</p>
          <Link to="/contact">
            <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
              Get in Touch
            </Button>
          </Link>
        </div>
      </div>
    </LegalPageWrapper>
  );
}
