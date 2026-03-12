import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CookiePolicy() {
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
          <h1 className="text-3xl font-display font-bold">Cookie Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: March 12, 2026</p>

          <div className="prose prose-invert max-w-none space-y-6 text-sm text-muted-foreground leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">What Are Cookies?</h2>
              <p>Cookies are small text files stored on your device when you visit a website. They help the website remember your preferences and improve your experience.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">Cookies We Use</h2>
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-card">
                      <th className="text-left p-3 font-display font-semibold text-foreground">Cookie</th>
                      <th className="text-left p-3 font-display font-semibold text-foreground">Purpose</th>
                      <th className="text-left p-3 font-display font-semibold text-foreground">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/30">
                      <td className="p-3 font-mono text-xs">sb-*-auth-token</td>
                      <td className="p-3">Authentication & session management</td>
                      <td className="p-3">Essential</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-xs">roborank-*</td>
                      <td className="p-3">User preferences (season goals, settings)</td>
                      <td className="p-3">Functional</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">What We Don't Use</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>No advertising or tracking cookies</li>
                <li>No third-party analytics cookies</li>
                <li>No social media tracking pixels</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">Managing Cookies</h2>
              <p>You can control cookies through your browser settings. Disabling essential cookies may prevent you from logging in or using certain features of RoboRank.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-display font-semibold text-foreground">Local Storage</h2>
              <p>We also use browser local storage to save your preferences such as season goals and selected season. This data stays on your device and is not transmitted to our servers.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
