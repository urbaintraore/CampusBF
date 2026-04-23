import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: unknown): State {
    return { 
      hasError: true, 
      error: error instanceof Error ? error : new Error(String(error)) 
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Une erreur inattendue est survenue.";
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const msg = this.state.error.message;
          
          // Improved Firestore error detection
          isFirestoreError = /firebase|firestore/i.test(msg);

          // Extract JSON if present
          const start = msg.indexOf('{');
          const end = msg.lastIndexOf('}');
          
          if (start !== -1 && end !== -1 && start < end) {
            try {
              const jsonPart = msg.substring(start, end + 1);
              const parsed = JSON.parse(jsonPart);
              if (parsed.error) {
                errorMessage = typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
              }
            } catch {
              errorMessage = msg;
            }
          } else {
            errorMessage = msg;
          }
        }
      } catch (e) {
        console.warn("Failed to parse error message in ErrorBoundary:", e);
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-12 text-center space-y-8">
            <div id="error-boundary-icon" className="w-24 h-24 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto ring-8 ring-red-50/50">
              <AlertTriangle size={48} />
            </div>
            
            <div id="error-boundary-title-container" className="space-y-3">
              <h1 id="error-boundary-title" className="text-2xl font-bold text-slate-900 tracking-tight">Oups ! Quelque chose a mal tourné</h1>
              <p id="error-boundary-description" className="text-slate-500 font-medium leading-relaxed">
                {isFirestoreError 
                  ? "Un problème de communication avec la base de données est survenu (Permissions ou Quota)."
                  : "Nous sommes désolés pour ce désagrément. L'application a rencontré une erreur critique."}
              </p>
            </div>

            <div id="error-boundary-details" className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-widest">Détails techniques</p>
              <p id="error-boundary-message" className="text-xs font-mono text-slate-600 break-words leading-relaxed max-h-32 overflow-y-auto">
                {errorMessage}
              </p>
            </div>

            <div id="error-boundary-actions" className="grid grid-cols-1 gap-3 pt-4">
              <button
                id="error-boundary-refresh-button"
                onClick={this.handleReset}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 group active:scale-95"
              >
                <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                Actualiser la page
              </button>
              <button
                id="error-boundary-home-button"
                onClick={this.handleGoHome}
                className="w-full py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Home size={20} />
                Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
