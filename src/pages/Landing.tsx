import { Link } from "react-router-dom";
import { BarChart3, Shield, Zap, Trophy, ArrowRight, Users, Crown, Target, Swords, StickyNote, Check, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const features = [
  {
    icon: Shield,
    title: "Scouting Reports",
    description: "Auto-generated reports for every event with team ratings, schedule difficulty, and strategic analysis.",
    color: "text-primary",
  },
  {
    icon: Swords,
    title: "2v2 Match Predictor",
    description: "Simulate real alliance matches with head-to-head records, save predictions, and compare stats.",
    color: "text-destructive",
  },
  {
    icon: Trophy,
    title: "RoboRank System",
    description: "Proprietary 0-100 scoring system rating every team based on wins, skills, consistency, and event performance.",
    color: "text-[hsl(var(--chart-4))]",
  },
  {
    icon: TrendingUp,
    title: "Season Progress",
    description: "Visualize your team's improvement across seasons with interactive charts and detailed breakdowns.",
    color: "text-[hsl(var(--success))]",
  },
  {
    icon: StickyNote,
    title: "Team Notes",
    description: "Color-coded, pinnable strategy notes tagged to specific teams. Free for all users.",
    color: "text-[hsl(var(--chart-2))]",
  },
  {
    icon: Users,
    title: "Team Management",
    description: "Invite teammates, manage roles, and share premium access across your entire team.",
    color: "text-[hsl(var(--chart-3))]",
  },
];

const pricingFeatures = {
  free: [
    "Full team rankings & RoboRank scores",
    "Event discovery with calendar & map",
    "2v2 match predictor with save",
    "Team notes with pinning & categories",
    "Season progress timeline",
    "1 scouting report per month",
  ],
  premium: [
    "Everything in Free",
    "Unlimited scouting reports",
    "Premium shared across your team",
    "Historical season data",
    "Head-to-head comparisons",
    "Priority support",
  ],
};

const stats = [
  { value: "5,000+", label: "Teams Tracked" },
  { value: "50,000+", label: "Matches Analyzed" },
  { value: "1,000+", label: "Events Covered" },
  { value: "100", label: "RoboRank Scale" },
];


export default function Landing() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-50 glass">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            <span className="text-xl font-display font-bold text-gradient">RoboRank</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        </div>
        <div className="container relative pt-24 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-4xl text-center"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
              <Zap className="h-3.5 w-3.5" />
              The #1 VEX V5 Robotics Analytics Platform
            </div>
            <h1 className="mb-6 text-5xl font-display font-bold leading-[1.1] md:text-7xl">
              Win More Matches with
              <span className="text-gradient block mt-1">Data-Driven Scouting</span>
            </h1>
            <p className="mb-10 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto leading-relaxed">
              RoboRank automatically analyzes every VEX team's performance - giving you scouting reports, 
              match predictions, and deep analytics to dominate your competition.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup">
                <Button size="lg" className="text-base px-8 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2">
                  Start Scouting — It's Free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="lg" className="text-base px-8 gap-2">
                  See Features ↓
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/50 bg-card/50">
        <div className="container py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="text-center"
              >
                <div className="text-2xl md:text-3xl stat-number text-primary">{stat.value}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* Features */}
      <section id="features" className="container py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Everything Your Team Needs to <span className="text-gradient">Compete</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From automated scouting to match predictions, RoboRank gives you the edge at every tournament.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl border border-border/50 card-gradient p-7 transition-all hover:border-primary/30 hover:glow group"
            >
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 group-hover:bg-primary/15 transition-colors">
                <feature.icon className={`h-5 w-5 ${feature.color}`} />
              </div>
              <h3 className="mb-2 text-lg font-display font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>


      {/* Pricing */}
      <section className="container py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Simple, <span className="text-gradient">Team-Friendly</span> Pricing
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            One teammate subscribes, the whole team benefits. No per-seat pricing.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-border/50 card-gradient p-8 space-y-6"
          >
            <div>
              <h3 className="text-xl font-display font-bold">Free</h3>
              <div className="mt-2">
                <span className="text-4xl stat-number">$0</span>
                <span className="text-muted-foreground">/forever</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Perfect for getting started</p>
            </div>
            <ul className="space-y-3">
              {pricingFeatures.free.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link to="/signup" className="block">
              <Button variant="outline" className="w-full">Get Started Free</Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border-2 border-primary/40 bg-gradient-to-b from-primary/5 to-transparent p-8 space-y-6 relative"
          >
            <div className="absolute -top-3 left-6">
              <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Crown className="h-3 w-3" /> MOST POPULAR
              </span>
            </div>
            <div>
              <h3 className="text-xl font-display font-bold">Premium</h3>
              <div className="mt-2">
                <span className="text-4xl stat-number text-primary">$10</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Unlimited power for your whole team</p>
            </div>
            <ul className="space-y-3">
              {pricingFeatures.premium.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link to="/signup" className="block">
              <Button className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-1.5">
                <Crown className="h-4 w-4" /> Start Premium
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-12 text-center"
        >
          <h2 className="text-3xl font-display font-bold mb-4">Ready to Scout Smarter?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">
            Join thousands of VEX teams using RoboRank to prepare for competitions with data-driven insights.
          </p>
          <Link to="/signup">
            <Button size="lg" className="text-base px-10 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2">
              Create Your Free Account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10">
        <div className="container space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span className="font-display font-bold text-gradient">RoboRank</span>
              </div>
              <p className="text-xs text-muted-foreground">The #1 VEX V5 Robotics analytics platform.</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">Product</h4>
              <div className="space-y-1.5">
                <Link to="/about" className="block text-sm text-muted-foreground hover:text-primary transition-colors">About</Link>
                <a href="#features" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Features</a>
                <Link to="/contact" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Contact</Link>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">Legal</h4>
              <div className="space-y-1.5">
                <Link to="/terms" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
                <Link to="/privacy" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
                <Link to="/refund" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Refund Policy</Link>
                <Link to="/cookies" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Cookie Policy</Link>
                <Link to="/about#scoring" className="block text-sm text-muted-foreground hover:text-primary transition-colors">How RoboRank Works</Link>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">Get Started</h4>
              <div className="space-y-1.5">
                <Link to="/signup" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Sign Up Free</Link>
                <Link to="/login" className="block text-sm text-muted-foreground hover:text-primary transition-colors">Log In</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-border/50 pt-6">
            <p className="text-xs text-muted-foreground text-center">
              © {new Date().getFullYear()} RoboRank. Built for VEX Robotics teams. Not affiliated with the REC Foundation or VEX Robotics.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
