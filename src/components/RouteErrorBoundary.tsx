import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
  routeName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Per-route error boundary. Catches render errors inside a single route so the
 * rest of the app shell (header, nav, tab bar) keeps working.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface to console for diagnostics; keeps Sentry/log-pipe friendly.
    console.error(`[RouteError:${this.props.routeName ?? "unknown"}]`, error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-border/50 card-gradient p-8 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-display font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              This page hit an unexpected error. You can try again or head back to your dashboard.
            </p>
          </div>
          {this.state.error?.message && (
            <p className="text-xs text-muted-foreground/70 font-mono break-words bg-muted/30 rounded-md px-3 py-2">
              {this.state.error.message}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Button onClick={this.handleRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Try again
            </Button>
            <Link to="/dashboard">
              <Button variant="outline" className="gap-2 w-full">
                <Home className="h-4 w-4" /> Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
