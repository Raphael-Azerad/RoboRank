import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Swords, StickyNote, TrendingUp, Users, Award,
  Settings, HelpCircle, FileText, Shield, LogOut, ChevronRight, Globe
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { hapticTap } from "@/lib/native";

const features = [
  { href: "/predictor", label: "Match Predictor", icon: Swords, desc: "Simulate 2v2 alliances" },
  { href: "/notes", label: "Team Notes", icon: StickyNote, desc: "Strategy & scouting notes" },
  { href: "/progress", label: "Season Progress", icon: TrendingUp, desc: "Compare team trajectories" },
  { href: "/alliances", label: "Alliances", icon: Users, desc: "Partner history & results" },
  { href: "/awards", label: "Awards", icon: Award, desc: "Browse award winners" },
];

const account = [
  { href: "/profile", label: "Profile & Team", icon: Settings },
  { href: "/help", label: "Help & Tips", icon: HelpCircle },
];

const legal = [
  { href: "/terms", label: "Terms of Service", icon: FileText },
  { href: "/privacy", label: "Privacy Policy", icon: Shield },
];

function Row({
  href, label, icon: Icon, desc, onClick,
}: { href?: string; label: string; icon: any; desc?: string; onClick?: () => void }) {
  const inner = (
    <div className="flex items-center gap-3 px-4 py-3.5 active:bg-muted/40 transition-colors">
      <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
        <Icon className="h-4.5 w-4.5 text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium leading-tight">{label}</div>
        {desc && <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );
  if (onClick) {
    return (
      <button onClick={() => { hapticTap(); onClick(); }} className="w-full text-left">
        {inner}
      </button>
    );
  }
  return <Link to={href!} onClick={() => hapticTap()}>{inner}</Link>;
}

export default function More() {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/login");
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-8">
        <Section title="Tools">
          {features.map((f) => <Row key={f.href} {...f} />)}
        </Section>

        <Section title="Account">
          {account.map((f) => <Row key={f.href} {...f} />)}
        </Section>

        <Section title="More on the web">
          <a
            href="https://roborank.site"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => hapticTap()}
          >
            <div className="flex items-center gap-3 px-4 py-3.5 active:bg-muted/40">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Globe className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-medium leading-tight">Open RoboRank on the web</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Full feature set, larger charts & exports
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </a>
        </Section>

        <Section title="Legal">
          {legal.map((f) => <Row key={f.href} {...f} />)}
        </Section>

        <Section>
          <Row label="Sign out" icon={LogOut} onClick={handleLogout} />
        </Section>

        <p className="text-center text-[11px] text-muted-foreground mt-6 px-4">
          RoboRank · v1.0
        </p>
      </div>
    </AppLayout>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      {title && (
        <h2 className="px-4 mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          {title}
        </h2>
      )}
      <div className="bg-card/60 border-y border-border/40 divide-y divide-border/40">
        {children}
      </div>
    </div>
  );
}
