import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a192f] flex flex-col items-center justify-center gap-6 p-6 dark">
          <div className="text-center space-y-3 max-w-sm">
            <h1 className="text-4xl font-serif font-bold text-[#d4af37] tracking-widest">HELP</h1>
            <div className="mt-6 bg-[#172a45] border border-red-500/30 rounded-xl p-5 text-left">
              <p className="text-red-400 font-semibold text-sm mb-2">Une erreur est survenue</p>
              <p className="text-gray-400 text-xs leading-relaxed">{this.state.message}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full py-3 bg-[#d4af37] text-[#0a192f] rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
            >
              Recharger l'application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
