import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MessageCircle, X, Send } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

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
        <div className="w-80 h-96 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl shadow-xl flex flex-col overflow-hidden">
          <div className="p-4 bg-emerald-600 text-white flex justify-between items-center">
            <h3 className="font-bold">Assistant CampusBF</h3>
            <button onClick={() => setIsOpen(false)}><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`p-2 rounded-lg ${m.role === 'user' ? 'bg-emerald-100 dark:bg-emerald-900 ml-auto' : 'bg-gray-100 dark:bg-slate-700'}`}>
                {m.content}
              </div>
            ))}
          </div>
          <div className="p-2 border-t dark:border-slate-700 flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} className="flex-1 p-2 border dark:border-slate-700 rounded" placeholder="Votre question..." />
            <button onClick={handleSend} className="bg-emerald-600 text-white p-2 rounded"><Send size={20} /></button>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="bg-emerald-600 text-white p-4 rounded-full shadow-lg">
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
}
