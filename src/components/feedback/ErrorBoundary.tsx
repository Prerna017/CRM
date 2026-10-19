import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-slate-900/50 rounded-2xl border border-destructive/20 m-4">
          <div className="h-12 w-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold font-heading text-slate-100">
            Something went wrong
          </h2>
          <p className="text-xs text-muted-foreground mt-2 max-w-md font-mono bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-left overflow-auto max-h-32">
            {this.state.error?.message || "An unexpected error occurred in this view."}
          </p>
          <Button
            onClick={this.handleReset}
            variant="outline"
            size="sm"
            className="mt-6"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reload View
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
