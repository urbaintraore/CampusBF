import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
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
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            errorMessage = parsed.error;
            isFirestoreError = true;
          }
        }
      } catch (e) {
        // Not a JSON error
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-12 text-center space-y-8">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto ring-8 ring-red-50/50">
              <AlertTriangle size={48} />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-2xl font-display font-bold text-slate-900">Oups ! Quelque chose a mal tourné</h1>
              <p className="text-slate-500 font-medium leading-relaxed">
                {isFirestoreError 
                  ? "Un problème de communication avec la base de données est survenu."
                  : "Nous sommes désolés pour ce désagrément. L'application a rencontré une erreur critique."}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-widest">Détails de l'erreur</p>
              <p className="text-xs font-mono text-slate-600 break-words leading-relaxed">
                {errorMessage}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-4">
              <button
                onClick={this.handleReset}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 group active:scale-95"
              >
                <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                Actualiser la page
              </button>
              <button
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
