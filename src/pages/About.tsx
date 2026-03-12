import { Link } from "react-router-dom";
import { BarChart3, ArrowLeft, Target, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-12 space-y-8">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
        </div>

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
            <h2 className="text-xl font-display font-semibold">The RoboRank Score</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our proprietary 0-100 RoboRank scoring system evaluates every team based on multiple factors: 
              win/loss record, skills scores, schedule difficulty, consistency across events, and awards earned. 
              It's designed to give a quick, accurate snapshot of a team's competitive strength.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-display font-semibold">Data Sources</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All competition data is sourced from publicly available results through the RobotEvents platform. 
              We do not collect or display any private team information. Our analytics are based purely on 
              official competition outcomes.
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
      </div>
    </div>
  );
}
