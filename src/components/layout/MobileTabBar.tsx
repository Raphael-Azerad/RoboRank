import { Link, useLocation } from "react-router-dom";
import { Home, Calendar, Trophy, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticTap } from "@/lib/native";

const tabs = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/rankings", label: "Rankings", icon: Trophy },
  { href: "/scouting", label: "Scout", icon: Search },
  { href: "/profile", label: "Profile", icon: User },
];

/**
 * Native-style bottom tab bar. Shown on mobile only — desktop keeps the top nav.
 * Adds safe-area padding for iOS home-indicator devices.
 */
export function MobileTabBar() {
  const location = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border/50 bg-card/95 backdrop-blur-xl safe-bottom"
      aria-label="Primary"
    >
      <ul className="flex items-stretch justify-around">
        {tabs.map((tab) => {
          const active =
            location.pathname === tab.href ||
            (tab.href !== "/dashboard" && location.pathname.startsWith(tab.href));
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                to={tab.href}
                onClick={() => hapticTap()}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("h-5 w-5", active && "scale-110")} />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
