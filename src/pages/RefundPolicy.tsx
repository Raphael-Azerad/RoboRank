import { Link } from "react-router-dom";
import { LegalPageWrapper } from "@/components/layout/LegalPageWrapper";

export default function RefundPolicy() {
  return (
    <LegalPageWrapper>
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold">Refund & Cancellation Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: April 21, 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-display font-semibold text-foreground">RoboRank is Free</h2>
            <p>
              RoboRank is currently free for every team and every user. There are no subscriptions, no paid tiers,
              and no charges of any kind. Because we do not collect payments, there is nothing to refund or cancel.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-semibold text-foreground">Account Cancellation</h2>
            <p>
              You can stop using RoboRank at any time. If you would like your account or associated data
              (notes, saved predictions, scouting reports) deleted, contact us through our{" "}
              <Link to="/contact" className="text-primary hover:underline">Contact page</Link> and we will
              process the request within 5 business days.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-semibold text-foreground">Historical Charges</h2>
            <p>
              If you were previously charged for a RoboRank Premium subscription and believe you are owed a
              refund, please reach out via the <Link to="/contact" className="text-primary hover:underline">Contact page</Link>{" "}
              with your account email. We will review and respond within 5 business days.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-semibold text-foreground">Future Changes</h2>
            <p>
              If we ever introduce paid plans in the future, this page will be updated with the applicable
              billing, cancellation, and refund terms before any charges occur.
            </p>
          </section>
        </div>
      </div>
    </LegalPageWrapper>
  );
}
