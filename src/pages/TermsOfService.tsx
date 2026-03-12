import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
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
          <h1 className="text-3xl font-display font-bold">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: March 12, 2026</p>

          <div className="prose prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p>By accessing or using RoboRank ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">2. Description of Service</h2>
              <p>RoboRank is an analytics platform for VEX V5 Robotics Competition teams. The Service provides team rankings, scouting reports, match predictions, and other competition analytics tools. Data is sourced from publicly available competition results.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">3. User Accounts</h2>
              <p>You must create an account to access certain features. You are responsible for maintaining the security of your account credentials. You must provide accurate information during registration, including a valid team number.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">4. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Use the Service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to any part of the Service</li>
                <li>Interfere with or disrupt the Service's infrastructure</li>
                <li>Scrape, crawl, or use automated means to access the Service beyond normal use</li>
                <li>Impersonate another user or team</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">5. Premium Subscriptions</h2>
              <p>Premium features are available through a paid subscription. Subscriptions are billed monthly. Premium access is shared across verified team members when one team member subscribes.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">6. Data Accuracy</h2>
              <p>RoboRank sources data from publicly available competition results. While we strive for accuracy, we do not guarantee that all data, rankings, or predictions are error-free. The RoboRank score is a proprietary metric and should be used as one of many factors in competition preparation.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">7. Intellectual Property</h2>
              <p>The Service, including its design, features, and content, is owned by RoboRank. User-generated content (notes, predictions) remains the property of the user but grants RoboRank a license to store and display it within the Service.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">8. Limitation of Liability</h2>
              <p>RoboRank is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the Service, including but not limited to competition outcomes influenced by our analytics.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">9. Termination</h2>
              <p>We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time through your profile settings.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">10. Changes to Terms</h2>
              <p>We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated terms.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">11. Contact</h2>
              <p>For questions about these terms, please visit our <Link to="/contact" className="text-primary hover:underline">Contact page</Link>.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
