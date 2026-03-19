import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MessageCircle, X, Send } from 'lucide-react';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; content: string }[]>([
    { role: 'bot', content: 'Bonjour ! Je suis l\'assistant CampusBF. Comment puis-je vous aider ?' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setMessages(prev => [...prev, { role: 'bot', content: 'Erreur : La clé API Gemini n\'est pas configurée.' }]);
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userMessage,
        config: {
          systemInstruction: "Tu es un assistant intelligent pour CampusBF, une plateforme communautaire universitaire. Tes fonctionnalités incluent : la mise en relation avec des répétiteurs et enseignants, le partage de documents académiques, la recherche de stages et emplois, un marketplace étudiant, des forums communautaires, et l'organisation d'événements.\n\nIMPORTANT :\n1. CampusBF est une plateforme indépendante et n'est PAS la plateforme gouvernementale Campus Faso. Ne confonds jamais les deux.\n2. CampusBF NE gère PAS les inscriptions/réinscriptions, NE gère PAS le paiement des frais de scolarité, et NE propose PAS de suivi pédagogique (notes, emplois du temps). Si un utilisateur pose une question sur ces sujets, réponds poliment que ces fonctionnalités ne sont pas disponibles sur CampusBF."
        }
      });
      setMessages(prev => [...prev, { role: 'bot', content: response.text || 'Désolé, je n\'ai pas pu répondre.' }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', content: 'Une erreur est survenue.' }]);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="w-80 md:w-96 h-[32rem] bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="p-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <MessageCircle size={16} />
              </div>
              <h3 className="font-display font-bold tracking-wide">Assistant CampusBF</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3.5 max-w-[85%] rounded-2xl text-sm shadow-sm ${m.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200/60 text-slate-700 rounded-tl-sm'}`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-white border-t border-slate-200/60 flex gap-2">
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              className="flex-1 px-4 py-2.5 bg-slate-100/50 border border-slate-200/60 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all" 
              placeholder="Posez votre question..." 
            />
            <button 
              onClick={handleSend} 
              className="bg-emerald-600 text-white p-2.5 rounded-full hover:bg-emerald-700 transition-colors shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center"
            >
              <Send size={18} className="ml-0.5" />
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)} 
          className="bg-emerald-600 text-white p-4 rounded-full shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 hover:scale-110 transition-all duration-300 flex items-center justify-center group"
        >
          <MessageCircle size={26} className="group-hover:animate-pulse" />
        </button>
      )}
    </div>
  );
}
