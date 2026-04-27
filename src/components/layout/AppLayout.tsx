import { Link, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Calendar, Home, Search, Trophy, User, LogOut, Menu, X, Swords, StickyNote, TrendingUp, Bell, Users, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MobileTabBar } from "./MobileTabBar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/rankings", label: "Rankings", icon: Trophy },
  { href: "/scouting", label: "Scouting", icon: Search },
  { href: "/predictor", label: "Predictor", icon: Swords },
  { href: "/alliances", label: "Alliances", icon: Users },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/progress", label: "Progress", icon: TrendingUp },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  const { data: notifications } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase.from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data || []) as any[];
    },
    enabled: !!userId,
  });

  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  const markAllRead = async () => {
    if (!userId) return;
    const unreadIds = notifications?.filter((n: any) => !n.read).map((n: any) => n.id) || [];
    if (unreadIds.length === 0) return;
    for (const id of unreadIds) {
      await supabase.from("notifications").update({ read: true } as any).eq("id", id);
    }
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  // Page title for the mobile header — derived from the current route so the
  // header reads like a native app screen instead of a website logo.
  const currentNav = navItems.find(n => location.pathname === n.href || (n.href !== "/dashboard" && location.pathname.startsWith(n.href)));
  const mobileTitle = currentNav?.label
    ?? (location.pathname.startsWith("/profile") ? "Profile"
      : location.pathname.startsWith("/team/") ? "Team"
      : location.pathname.startsWith("/event/") ? "Event"
      : location.pathname.startsWith("/awards") ? "Awards"
      : location.pathname.startsWith("/help") ? "Help"
      : location.pathname.startsWith("/join-team") ? "Get Started"
      : "RoboRank");

  const NotificationBell = (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="font-display font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto">
          {!notifications || notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((n: any) => (
              <div
                key={n.id}
                className={cn(
                  "px-4 py-3 border-b border-border/20 text-sm hover:bg-muted/30 transition-colors cursor-pointer",
                  !n.read && "bg-primary/5"
                )}
                onClick={() => {
                  if (n.link) navigate(n.link);
                  if (!n.read) {
                    supabase.from("notifications").update({ read: true } as any).eq("id", n.id).then(() => {
                      queryClient.invalidateQueries({ queryKey: ["notifications"] });
                    });
                  }
                }}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs">{n.title}</p>
                    {n.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Desktop header — full nav. Hidden on mobile so the app feels native. */}
      <header className="sticky top-0 z-50 glass border-b border-border/50 hidden md:block">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            <span className="text-xl font-display font-bold text-gradient">RoboRank</span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "gap-2",
                    location.pathname === item.href && "bg-accent text-primary"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            {NotificationBell}
            <Link to="/profile">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile header — minimal native-app style: just screen title + bell.
          No clickable logo, no hamburger. Profile + nav live in the bottom tab bar. */}
      <header className="md:hidden sticky top-0 z-50 glass border-b border-border/40 safe-top">
        <div className="flex h-12 items-center justify-between px-4">
          <h1 className="text-base font-display font-semibold tracking-tight truncate">
            {mobileTitle}
          </h1>
          {NotificationBell}
        </div>
      </header>

      <main key={location.pathname} className="container py-4 md:py-6 flex-1 w-full pb-24 md:pb-6 route-enter">{children}</main>

      <MobileTabBar />

      <footer className="border-t border-border/30 bg-card/30 mt-auto hidden md:block">
        <div className="container py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} RoboRank</span>
          <nav className="flex flex-wrap gap-4">
            <Link to="/about" className="hover:text-primary transition-colors">About</Link>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link to="/refund" className="hover:text-primary transition-colors">Refund Policy</Link>
            <Link to="/cookies" className="hover:text-primary transition-colors">Cookies</Link>
            <Link to="/about#scoring" className="hover:text-primary transition-colors">How RoboRank Works</Link>
            <Link to="/help" className="hover:text-primary transition-colors">Help & Tips</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
