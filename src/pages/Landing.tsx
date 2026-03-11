import { Link } from "react-router-dom";
import { BarChart3, Shield, Zap, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const features = [
  {
    icon: Shield,
    title: "Scouting Reports",
    description: "Auto-generated reports for every event with team ratings, predictions, and analysis.",
  },
  {
    icon: Zap,
    title: "Match Predictions",
    description: "AI-powered match outcome predictions based on team performance data.",
  },
  {
    icon: Trophy,
    title: "Team Rankings",
    description: "Proprietary RoboRank scoring system rating every team from 0-100.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-primary" />
          <span className="text-xl font-display font-bold text-gradient">RoboRank</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost">Log in</Button>
          </Link>
          <Link to="/signup">
            <Button variant="hero">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container pt-20 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
            <Zap className="h-3.5 w-3.5" />
            VEX V5 Robotics Analytics
          </div>
          <h1 className="mb-6 text-5xl font-display font-bold leading-tight md:text-7xl">
            Dominate Your
            <span className="text-gradient"> Competition</span>
          </h1>
          <p className="mb-10 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
            RoboRank gives your team the competitive edge with automated scouting reports, 
            match predictions, and deep analytics — all from public competition data.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <Button variant="hero" size="lg" className="text-base px-8">
                Start Scouting <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="glass" size="lg" className="text-base px-8">
                Log In
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container pb-32">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
              className="rounded-xl border border-border/50 card-gradient p-8 transition-all hover:border-primary/30 hover:glow"
            >
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-display font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} RoboRank — Built for VEX Robotics teams
        </div>
      </footer>
    </div>
  );
}
