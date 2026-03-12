import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl font-display font-bold">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: March 12, 2026</p>

          <div className="prose prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">1. Information We Collect</h2>
              <p>When you create an account, we collect:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-foreground">Account information:</strong> Email address, team number, and team name</li>
                <li><strong className="text-foreground">Usage data:</strong> Pages visited, features used, and interactions within the platform</li>
                <li><strong className="text-foreground">User-generated content:</strong> Team notes, saved predictions, and scouting reports</li>
              </ul>
              <p>We also access publicly available VEX Robotics competition data (match results, rankings, awards) through the RobotEvents API.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>To provide and improve the Service</li>
                <li>To personalize your dashboard and analytics</li>
                <li>To process subscriptions and payments</li>
                <li>To send essential account communications (password resets, security alerts)</li>
                <li>To share premium access with verified team members</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">3. Data Storage & Security</h2>
              <p>Your data is stored securely using industry-standard encryption. We use secure authentication protocols and row-level security policies to ensure your data is only accessible to you and your authorized team members.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">4. Third-Party Services</h2>
              <p>We use the following third-party services:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong className="text-foreground">Stripe:</strong> For payment processing (we never store your full payment details)</li>
                <li><strong className="text-foreground">RobotEvents API:</strong> For competition data</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">5. Data Sharing</h2>
              <p>We do not sell, rent, or share your personal information with third parties for marketing purposes. We may share data only as required by law or to protect the Service.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Access, update, or delete your account data</li>
                <li>Export your user-generated content</li>
                <li>Request deletion of your account and associated data</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">7. Cookies</h2>
              <p>We use essential cookies for authentication and session management. We do not use tracking or advertising cookies. For more details, see our <Link to="/cookies" className="text-primary hover:underline">Cookie Policy</Link>.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">8. Children's Privacy</h2>
              <p>RoboRank is designed for VEX Robotics participants. Users under 13 should have parental consent before creating an account.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">9. Changes to This Policy</h2>
              <p>We may update this policy from time to time. We will notify users of significant changes via email.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">10. Contact</h2>
              <p>For privacy-related questions, visit our <Link to="/contact" className="text-primary hover:underline">Contact page</Link>.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
