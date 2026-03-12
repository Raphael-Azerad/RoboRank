import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RefundPolicy() {
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

        <div className="space-y-6">
          <h1 className="text-3xl font-display font-bold">Refund & Cancellation Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: March 12, 2026</p>

          <div className="prose prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">Subscription Cancellation</h2>
              <p>You can cancel your RoboRank Premium subscription at any time from your profile settings. When you cancel:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Your premium access continues until the end of your current billing period</li>
                <li>You will not be charged again after cancellation</li>
                <li>You retain access to all free features after your premium expires</li>
                <li>Your data (notes, saved predictions, reports) is preserved</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">Refund Policy</h2>
              <p>We offer refunds under the following circumstances:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-foreground">Within 7 days of first purchase:</strong> Full refund, no questions asked</li>
                <li><strong className="text-foreground">Service outages:</strong> If the Service is unavailable for an extended period, we will provide a prorated refund or credit</li>
                <li><strong className="text-foreground">Billing errors:</strong> Any accidental charges will be fully refunded</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">How to Request a Refund</h2>
              <p>Contact us through our <Link to="/contact" className="text-primary hover:underline">Contact page</Link> with your account email and reason for the refund. We aim to process all refund requests within 5 business days.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">Team Premium Sharing</h2>
              <p>If you cancel a premium subscription that is shared across your team, all team members will lose premium access at the end of the billing period. Another team member can subscribe to restore team-wide access.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
