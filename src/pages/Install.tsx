import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share, Plus, Smartphone, Apple, Chrome, Check } from "lucide-react";

/**
 * Detected install prompt event (Chromium / Edge / Android Chrome).
 * iOS Safari does NOT fire this — users must use Share → Add to Home Screen.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  // iOS uses navigator.standalone; everywhere else uses display-mode.
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

export default function Install() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    }
    setInstallEvent(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>

        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Smartphone className="h-3.5 w-3.5" /> Installable web app
          </div>
          <h1 className="text-3xl font-display font-bold">Install RoboRank</h1>
          <p className="text-muted-foreground">
            Add RoboRank to your home screen for one-tap access, full-screen mode, and a native-app feel — no app store required.
          </p>
        </header>

        {installed ? (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-6 flex items-center gap-4">
            <div className="rounded-full bg-primary/15 p-2.5">
              <Check className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-semibold">RoboRank is installed</h2>
              <p className="text-sm text-muted-foreground">You're already using the installed app — nice.</p>
            </div>
          </div>
        ) : installEvent ? (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-6 space-y-3">
            <h2 className="font-display font-semibold">Ready to install</h2>
            <p className="text-sm text-muted-foreground">
              Your browser supports one-click install. Tap below and confirm in the dialog.
            </p>
            <Button onClick={handleInstall} className="gap-2">
              <Download className="h-4 w-4" /> Install RoboRank
            </Button>
          </div>
        ) : null}

        {/* Per-platform manual instructions */}
        <div className="grid gap-4 sm:grid-cols-2">
          <PlatformCard
            icon={<Apple className="h-5 w-5" />}
            title="iPhone / iPad"
            highlighted={platform === "ios"}
            steps={[
              <>Tap the <Share className="inline h-4 w-4 align-text-bottom" /> Share button in Safari.</>,
              <>Scroll and tap <strong>Add to Home Screen</strong>.</>,
              <>Tap <strong>Add</strong> in the top right.</>,
            ]}
          />
          <PlatformCard
            icon={<Smartphone className="h-5 w-5" />}
            title="Android"
            highlighted={platform === "android"}
            steps={[
              <>Open the menu (⋮) in Chrome.</>,
              <>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</>,
              <>Confirm with <strong>Install</strong>.</>,
            ]}
          />
          <PlatformCard
            icon={<Chrome className="h-5 w-5" />}
            title="Desktop (Chrome/Edge)"
            highlighted={platform === "desktop"}
            steps={[
              <>Look for the <Download className="inline h-4 w-4 align-text-bottom" /> install icon in the address bar.</>,
              <>Or open the menu and choose <strong>Install RoboRank…</strong></>,
              <>Confirm with <strong>Install</strong>.</>,
            ]}
          />
          <PlatformCard
            icon={<Plus className="h-5 w-5" />}
            title="Other browsers"
            steps={[
              <>Look for "Add to Home Screen" in your browser's menu.</>,
              <>Firefox / Brave / Samsung Internet all support it.</>,
              <>If you can't find it, the published site at <strong>roborank.site</strong> still works in any browser.</>,
            ]}
          />
        </div>

        <div className="rounded-xl border border-border/50 card-gradient p-5 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Coming soon:</strong> a native iOS / Android app on the App Store and Google Play. The installable web app gets you ~95% of the experience today.
          </p>
        </div>
      </div>
    </div>
  );
}

function PlatformCard({
  icon,
  title,
  steps,
  highlighted,
}: {
  icon: React.ReactNode;
  title: string;
  steps: React.ReactNode[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl border p-5 space-y-3 " +
        (highlighted ? "border-primary/40 bg-primary/5" : "border-border/50 card-gradient")
      }
    >
      <div className="flex items-center gap-2 font-display font-semibold">
        <span className={highlighted ? "text-primary" : "text-muted-foreground"}>{icon}</span>
        {title}
        {highlighted && (
          <span className="ml-auto text-[10px] uppercase tracking-wider text-primary">You</span>
        )}
      </div>
      <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
