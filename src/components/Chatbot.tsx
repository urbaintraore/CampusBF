import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { createCampusAssistantChat } from '../services/geminiService';
import Markdown from 'react-markdown';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; content: string }[]>([
    { role: 'bot', content: 'Bonjour ! Je suis l\'assistant CampusBF 🎓. Comment puis-je vous aider aujourd\'hui ?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
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
          <div className="p-4 bg-white border-t border-slate-200/60 flex gap-2">
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyPress={e => e.key === 'Enter' && handleSend()}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-slate-100/50 border border-slate-200/60 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all disabled:opacity-50" 
              placeholder="Posez votre question..." 
            />
            <button 
              onClick={handleSend} 
              disabled={isLoading || !input.trim()}
              className="bg-emerald-600 text-white p-2.5 rounded-full hover:bg-emerald-700 transition-colors shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:hover:scale-100"
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
