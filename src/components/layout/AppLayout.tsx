import { Link, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Calendar, Home, Search, Trophy, User, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/rankings", label: "Rankings", icon: Trophy },
  { href: "/scouting", label: "Scouting", icon: Search },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            <span className="text-xl font-display font-bold text-gradient">RoboRank</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
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

          <div className="hidden md:flex items-center gap-2">
            <Link to="/profile">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-card/95 backdrop-blur-xl">
            <nav className="container py-4 flex flex-col gap-1">
              {navItems.map((item) => (
                <Link key={item.href} to={item.href} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-3",
                      location.pathname === item.href && "bg-accent text-primary"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
              <Button variant="ghost" className="w-full justify-start gap-3" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </nav>
          </div>
        )}
      </header>

      <main className="container py-6">{children}</main>
    </div>
  );
}
