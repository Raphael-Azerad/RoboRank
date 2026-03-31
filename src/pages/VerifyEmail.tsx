import { Link } from "react-router-dom";
import { BarChart3, Mail, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function VerifyEmail() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center space-y-8"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <BarChart3 className="h-8 w-8 text-primary" />
          <span className="text-2xl font-display font-bold text-gradient">RoboRank</span>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-10 space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-display font-bold">Check Your Email</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We've sent a verification link to your email address. Please click the link to activate your account before logging in.
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 border border-border/50 p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Didn't receive it?</strong> Check your spam folder. Verification emails can take up to a minute to arrive.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link to="/login" className="w-full">
              <Button className="w-full gap-2">
                Go to Login <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/" className="w-full">
              <Button variant="ghost" className="w-full gap-2">
                <Home className="h-4 w-4" /> Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
