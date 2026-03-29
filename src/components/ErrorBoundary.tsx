import React, { Component, ErrorInfo, ReactNode } from 'react';
import { FirestoreErrorInfo } from '@/lib/firebase';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: FirestoreErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    let errorInfo: FirestoreErrorInfo | null = null;
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed === 'object' && 'error' in parsed && 'operationType' in parsed) {
        errorInfo = parsed as FirestoreErrorInfo;
      }
    } catch (e) {
      // Not a JSON error
    }
    return { hasError: true, error, errorInfo };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl p-8 md:p-12 text-center space-y-6 border border-slate-100">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Oups ! Une erreur est survenue</h1>
              <p className="text-slate-500 text-lg">
                L'application a rencontré un problème inattendu.
              </p>
            </div>

            {errorInfo ? (
              <div className="bg-slate-900 rounded-2xl p-6 text-left overflow-hidden shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-red-400 text-xs font-mono uppercase tracking-widest">Détails de l'erreur Firestore</span>
                </div>
                <div className="space-y-3 font-mono text-sm">
                  <p className="text-slate-300"><span className="text-slate-500">Opération:</span> <span className="text-emerald-400">{errorInfo.operationType}</span></p>
                  <p className="text-slate-300"><span className="text-slate-500">Chemin:</span> <span className="text-blue-400">{errorInfo.path || 'N/A'}</span></p>
                  <p className="text-slate-300"><span className="text-slate-500">Message:</span> <span className="text-white">{errorInfo.error}</span></p>
                  <div className="pt-4 border-t border-slate-800 mt-4">
                    <p className="text-slate-500 text-xs mb-2 uppercase tracking-widest">Informations d'authentification</p>
                    <p className="text-slate-400 text-xs">ID Utilisateur: {errorInfo.authInfo.userId || 'Non connecté'}</p>
                    <p className="text-slate-400 text-xs">Email: {errorInfo.authInfo.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-left">
                <p className="text-red-800 font-medium mb-2">Message d'erreur :</p>
                <p className="text-red-600 text-sm font-mono break-words">
                  {error?.message || "Erreur inconnue"}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-slate-900/20 active:scale-95"
              >
                Réessayer
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-bold py-4 px-6 rounded-2xl transition-all active:scale-95"
              >
                Retourner à l'accueil
              </button>
            </div>
            
            <p className="text-slate-400 text-xs pt-4">
              Si le problème persiste, veuillez contacter le support technique.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
