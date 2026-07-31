import { Component, type ErrorInfo, type ReactNode } from "react";
import { trackClientError } from "@/lib/analytics";

export default class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    trackClientError(error, `react:${info.componentStack?.slice(0, 80) || "unknown"}`);
  }

  render() {
    if (this.state.failed) {
      return <main className="min-h-screen bg-[#090909] px-6 py-24 text-center text-white"><div className="mx-auto max-w-md card-premium p-8"><h1 className="text-2xl font-medium">Something went wrong</h1><p className="mt-3 text-sm text-[#CFCFCF]">MakeBetter could not load this page. Please refresh and try again.</p><button onClick={() => window.location.reload()} className="mt-6 rounded-full btn-primary px-5 py-3 text-sm">Refresh page</button></div></main>;
    }
    return this.props.children;
  }
}
