import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { createCampusAssistantChat } from '../services/geminiService';
import { useAuth } from '../context/AuthContext';
import Markdown from 'react-markdown';

export default function Chatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; content: string }[]>([
    { role: 'bot', content: 'Bonjour ! Je suis l\'assistant CampusBF 🎓. Comment puis-je vous aider aujourd\'hui ?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  
  const quickActions = [
    { label: "Aide-moi à réviser", icon: "📚", prompt: "Je voudrais réviser mes cours de ce semestre. Peux-tu m'aider ?" },
    { label: "Concours Fonction Publique", icon: "🇧🇫", prompt: "Je me prépare pour les concours de la fonction publique au Burkina. Peux-tu me donner des conseils ou me poser des questions de culture générale ?" },
    { label: "Recherche stage", icon: "💼", prompt: "Je cherche un stage au Burkina Faso dans mon domaine." },
    { label: "MotoRide ?", icon: "🏍️", prompt: "C'est quoi MotoRide et comment ça marche ?" },
  ];

  const autoOpenAttempted = useRef(false);

  // Gestion de l'accueil automatique au login/connexion
  useEffect(() => {
    const welcomeKey = `campusbf_auto_welcome_v2_${user?.id || 'guest'}`;
    const autoOpenDone = localStorage.getItem(welcomeKey);
    
    if (!autoOpenDone && user && !isOpen && !autoOpenAttempted.current) {
      autoOpenAttempted.current = true;
      const timer = setTimeout(() => {
        setIsOpen(true);
        setHasShownWelcome(true);
        localStorage.setItem(welcomeKey, 'true');
        
        const introMessage = `👋 **Bienvenue sur la nouvelle version de CampusBF, ${user.firstName || 'Etudiant'} !**

Je suis votre assistant virtuel. Laissez-moi vous présenter pourquoi notre plateforme est indispensable et comment elle vous aide concrètement :

✨ **Nos avantages exclusifs :**
* **Collaboration & Études :** Échangez avec des étudiants de toutes les universités (UJKZ, UNB, etc.) sur un seul espace.
* **Réussite Académique :** Accédez gratuitement à une DocThèque collaborative géante et préparez vos concours avec notre IA.
* **Vie Étudiante simplifiée :** Économisez sur vos trajets avec **MotoRide** (le covoiturage étudiant) et trouvez de bonnes affaires sur le **Marketplace**.

💡 **Différence avec Campus Faso :**
Alors que **Campus Faso** gère principalement vos démarches administratives officielles (inscriptions, bourses, orientations), **CampusBF** est votre outil de travail et de vie au quotidien. Nous sommes là pour tout ce qui se passe *entre* les cours : révisions, entraide, transport et opportunités professionnelles.

Je suis là pour vous guider. Que voulez-vous découvrir en premier ?`;

        setMessages(prev => {
          if (prev.length <= 1) {
            return [{ role: 'bot', content: introMessage }];
          }
          return prev;
        });
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [user, isOpen, messages.length]);
  
  // Référence pour garder la session de chat active (avec historique)
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialiser la session de chat à l'ouverture si elle n'existe pas
  useEffect(() => {
    if (isOpen && !chatSessionRef.current) {
      try {
        chatSessionRef.current = createCampusAssistantChat();
      } catch (error) {
        console.error("Erreur d'initialisation du chat:", error);
      }
    }
  }, [isOpen]);

  // Auto-scroll vers le bas quand un nouveau message arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      if (!chatSessionRef.current) {
        chatSessionRef.current = createCampusAssistantChat();
      }
      
      // Envoi du message à la session de chat (qui garde l'historique)
      const response = await chatSessionRef.current.sendMessage({ message: userMessage });
      
      setMessages(prev => [...prev, { role: 'bot', content: response.text || 'Désolé, je n\'ai pas pu formuler une réponse.' }]);
    } catch (e) {
      console.error("Erreur Chatbot:", e);
      setMessages(prev => [...prev, { role: 'bot', content: 'Une erreur est survenue lors de la communication avec l\'assistant. Veuillez réessayer.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="w-80 md:w-96 h-[32rem] bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="p-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Sparkles size={16} />
              </div>
              <div className="flex flex-col">
                <h3 className="font-display font-bold tracking-wide text-sm">Assistant CampusBF</h3>
                <span className="text-[10px] opacity-80 font-bold uppercase tracking-widest">Propulsé par Gemini IA</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3.5 max-w-[85%] rounded-2xl text-sm shadow-sm ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200/60 text-slate-700 rounded-tl-sm'}`}>
                  {m.role === 'bot' ? (
                    <div className="prose prose-sm prose-emerald max-w-none">
                      <Markdown>{m.content}</Markdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}

            {showQuickActions && messages.length === 1 && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInput(action.prompt);
                      setShowQuickActions(false);
                      // On doit attendre que le state soit mis à jour ou passer directement la valeur
                      setTimeout(() => {
                        const btn = document.getElementById('chatbot-send-btn');
                        btn?.click();
                      }, 0);
                    }}
                    className="p-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm flex flex-col items-center gap-1 text-center"
                  >
                    <span className="text-xl">{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="p-3.5 bg-white border border-slate-200/60 text-slate-700 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-emerald-600" />
                  <span className="text-xs text-slate-500">L'assistant réfléchit...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 bg-white border-t border-slate-200/60 flex items-center gap-2">
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-slate-100/50 border border-slate-200/60 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all disabled:opacity-50" 
              placeholder="Posez votre question..." 
            />
            <button 
              id="chatbot-send-btn"
              onClick={handleSend} 
              disabled={isLoading || !input.trim()}
              className="bg-emerald-600 text-white min-w-[40px] h-[40px] rounded-full hover:bg-emerald-700 transition-colors shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send size={18} className="ml-0.5" />
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)} 
          className="chatbot-trigger bg-emerald-600 text-white p-4 rounded-full shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 hover:scale-110 transition-all duration-300 flex items-center justify-center group relative"
        >
          <MessageCircle size={26} className="group-hover:animate-pulse" />
          <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-full border-2 border-white shadow-sm flex items-center gap-1">
            <Sparkles size={10} />
            IA
          </div>
        </button>
      )}
    </div>
  );
}
