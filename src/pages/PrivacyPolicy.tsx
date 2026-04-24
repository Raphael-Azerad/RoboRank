import { Link } from "react-router-dom";
import { LegalPageWrapper } from "@/components/layout/LegalPageWrapper";

export default function PrivacyPolicy() {
  return (
    <LegalPageWrapper>
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: April 24, 2026</p>

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
            <h2 className="text-lg font-display font-semibold text-foreground">6. Your Rights & Account Deletion</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access, update, or export your account data at any time from the <Link to="/profile" className="text-primary hover:underline">Profile page</Link></li>
              <li>Permanently delete your account and all associated data directly from within the app</li>
            </ul>
            <p><strong className="text-foreground">How to delete your account:</strong> Open <Link to="/profile" className="text-primary hover:underline">Profile → Account → Danger Zone</Link> and tap <em>Delete my account</em>. You'll be asked to confirm by typing <code className="text-foreground">DELETE</code>.</p>
            <p><strong className="text-foreground">What gets deleted:</strong> Your profile, team membership, uploaded team logo, saved notes, match predictions, scouting reports, notifications, and authentication record.</p>
            <p><strong className="text-foreground">30-day grace period:</strong> When you request deletion, your account is immediately deactivated and scheduled for permanent erasure 30 days later. You can sign back in during this window and cancel the deletion at any time. After 30 days, all data is permanently removed and cannot be recovered.</p>
            <p><strong className="text-foreground">Subscriptions:</strong> If you have an active RoboRank Premium subscription, please cancel it separately through the <Link to="/profile" className="text-primary hover:underline">billing portal</Link> before deleting your account. Deleting your account does not automatically refund or cancel Stripe subscriptions.</p>
            <p>If you cannot access the app, you may also request deletion by contacting us via the <Link to="/contact" className="text-primary hover:underline">Contact page</Link>.</p>
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
    </LegalPageWrapper>
  );
}
