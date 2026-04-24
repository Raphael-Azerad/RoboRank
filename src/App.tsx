import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SeasonProvider } from "@/contexts/SeasonContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { getPostAuthRoute } from "@/lib/postAuthRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import Rankings from "./pages/Rankings";
import Scouting from "./pages/Scouting";
import Profile from "./pages/Profile";
import TeamDetail from "./pages/TeamDetail";
import EventDetail from "./pages/EventDetail";
import Awards from "./pages/Awards";
import MatchPredictor from "./pages/MatchPredictor";
import TeamNotes from "./pages/TeamNotes";
import SeasonProgress from "./pages/SeasonProgress";
import Alliances from "./pages/Alliances";
import JoinTeam from "./pages/JoinTeam";
import NotFound from "./pages/NotFound";
import VerifyEmail from "./pages/VerifyEmail";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RefundPolicy from "./pages/RefundPolicy";
import About from "./pages/About";
import Contact from "./pages/Contact";
import CookiePolicy from "./pages/CookiePolicy";
import Install from "./pages/Install";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";

const queryClient = new QueryClient();

function Boundary({ name, children }: { name: string; children: React.ReactNode }) {
  return <RouteErrorBoundary routeName={name}>{children}</RouteErrorBoundary>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setAuthenticated(!!session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setAuthenticated(!!data.session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return authenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/dashboard");

  useEffect(() => {
    let mounted = true;

    const resolveSession = async () => {
      const { data } = await supabase.auth.getSession();
      const hasSession = !!data.session;

      if (!mounted) return;

      setAuthenticated(hasSession);

      if (hasSession) {
        const nextPath = await getPostAuthRoute();
        if (!mounted) return;
        setRedirectPath(nextPath);
      }

      setLoading(false);
    };

    resolveSession();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return authenticated ? <Navigate to={redirectPath} replace /> : <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SeasonProvider>
      <SubscriptionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AuthRedirect><Boundary name="landing"><Landing /></Boundary></AuthRedirect>} />
              <Route path="/login" element={<AuthRedirect><Boundary name="login"><Login /></Boundary></AuthRedirect>} />
              <Route path="/signup" element={<AuthRedirect><Boundary name="signup"><Signup /></Boundary></AuthRedirect>} />
              <Route path="/forgot-password" element={<Boundary name="forgot-password"><ForgotPassword /></Boundary>} />
              <Route path="/reset-password" element={<Boundary name="reset-password"><ResetPassword /></Boundary>} />
              <Route path="/terms" element={<Boundary name="terms"><TermsOfService /></Boundary>} />
              <Route path="/privacy" element={<Boundary name="privacy"><PrivacyPolicy /></Boundary>} />
              <Route path="/refund" element={<Boundary name="refund"><RefundPolicy /></Boundary>} />
              <Route path="/about" element={<Boundary name="about"><About /></Boundary>} />
              <Route path="/contact" element={<Boundary name="contact"><Contact /></Boundary>} />
              <Route path="/cookies" element={<Boundary name="cookies"><CookiePolicy /></Boundary>} />
              <Route path="/install" element={<Boundary name="install"><Install /></Boundary>} />
              <Route path="/verify-email" element={<Boundary name="verify-email"><VerifyEmail /></Boundary>} />
              <Route path="/join-team" element={<ProtectedRoute><Boundary name="join-team"><JoinTeam /></Boundary></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Boundary name="dashboard"><Dashboard /></Boundary></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><Boundary name="events"><Events /></Boundary></ProtectedRoute>} />
              <Route path="/rankings" element={<ProtectedRoute><Boundary name="rankings"><Rankings /></Boundary></ProtectedRoute>} />
              <Route path="/scouting" element={<ProtectedRoute><Boundary name="scouting"><Scouting /></Boundary></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Boundary name="profile"><Profile /></Boundary></ProtectedRoute>} />
              <Route path="/predictor" element={<ProtectedRoute><Boundary name="predictor"><MatchPredictor /></Boundary></ProtectedRoute>} />
              <Route path="/notes" element={<ProtectedRoute><Boundary name="notes"><TeamNotes /></Boundary></ProtectedRoute>} />
              <Route path="/progress" element={<ProtectedRoute><Boundary name="progress"><SeasonProgress /></Boundary></ProtectedRoute>} />
              <Route path="/alliances" element={<ProtectedRoute><Boundary name="alliances"><Alliances /></Boundary></ProtectedRoute>} />
              <Route path="/team/:teamNumber" element={<ProtectedRoute><Boundary name="team-detail"><TeamDetail /></Boundary></ProtectedRoute>} />
              <Route path="/event/:eventId" element={<ProtectedRoute><Boundary name="event-detail"><EventDetail /></Boundary></ProtectedRoute>} />
              <Route path="/awards" element={<ProtectedRoute><Boundary name="awards"><Awards /></Boundary></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SubscriptionProvider>
    </SeasonProvider>
  </QueryClientProvider>
);

export default App;
