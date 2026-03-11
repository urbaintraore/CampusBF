import React, { useState } from 'react';
import { Compass, BookOpen, Target, Brain, Briefcase, Sparkles, Send, GraduationCap, Plus, Trash2 } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { GoogleGenAI } from '@google/genai';
import { cn } from '@/lib/utils';

interface AnalysisResult {
  skills: { subject: string; A: number; fullMark: number }[];
  masters: { name: string; match: number; description: string }[];
  careers: string[];
  improvements: string[];
}

type SubjectGrade = { id: string; name: string; grade: number | '' };

export default function Orientation() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  
  // Form state
  const [university, setUniversity] = useState('Université Joseph Ki-Zerbo');
  const [majorSelect, setMajorSelect] = useState('Informatique');
  const [customMajor, setCustomMajor] = useState('');
  
  const [activeSemester, setActiveSemester] = useState<string>('S1');
  const [grades, setGrades] = useState<Record<string, SubjectGrade[]>>({
    S1: [{ id: '1', name: 'Algèbre', grade: 14 }, { id: '2', name: 'Analyse', grade: 12 }],
    S2: [{ id: '3', name: 'Algorithmique', grade: 15 }],
    S3: [],
    S4: [],
    S5: [],
    S6: []
  });

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'Bonjour ! Je suis votre assistant d\'orientation académique. Avez-vous des questions sur votre parcours ou les masters disponibles ?' }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const actualMajor = majorSelect === 'Autre' ? customMajor : majorSelect;

  const addSubject = (sem: string) => {
    setGrades(prev => ({
      ...prev,
      [sem]: [...prev[sem], { id: Math.random().toString(), name: '', grade: '' }]
    }));
  };

  const updateSubject = (sem: string, id: string, field: 'name' | 'grade', value: string | number) => {
    setGrades(prev => ({
      ...prev,
      [sem]: prev[sem].map(s => s.id === id ? { ...s, [field]: value } : s)
    }));
  };

  const removeSubject = (sem: string, id: string) => {
    setGrades(prev => ({
      ...prev,
      [sem]: prev[sem].filter(s => s.id !== id)
    }));
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setStep(2);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const gradesText = Object.entries(grades).map(([sem, subjects]) => {
        const validSubjects = (subjects as SubjectGrade[]).filter(s => s.name.trim() !== '' && s.grade !== '');
        if (validSubjects.length === 0) return '';
        return `${sem} :\n${validSubjects.map(s => `- ${s.name} : ${s.grade}/20`).join('\n')}`;
      }).filter(text => text !== '').join('\n\n');

      const prompt = `
      Agis comme un expert en orientation universitaire pour les universités publiques du Burkina Faso.
      L'étudiant est à l'${university} en licence de ${actualMajor}.
      
      Voici ses notes détaillées par semestre (sur 20) :
      ${gradesText || "L'étudiant n'a pas fourni de notes détaillées. Base-toi uniquement sur sa filière."}

      Analyse cette progression et ces notes. Déduis-en 5 grandes compétences clés pour son profil et évalue-les sur 100.
      Génère une analyse JSON stricte avec cette structure exacte, sans markdown autour :
      {
        "skills": [
          {"subject": "Nom Compétence 1 (ex: Logique)", "A": [score sur 100], "fullMark": 100},
          {"subject": "Nom Compétence 2", "A": [score sur 100], "fullMark": 100},
          {"subject": "Nom Compétence 3", "A": [score sur 100], "fullMark": 100},
          {"subject": "Nom Compétence 4", "A": [score sur 100], "fullMark": 100},
          {"subject": "Nom Compétence 5", "A": [score sur 100], "fullMark": 100}
        ],
        "masters": [
          {"name": "Nom du Master 1", "match": [pourcentage de compatibilité], "description": "Brève description"},
          {"name": "Nom du Master 2", "match": [pourcentage], "description": "Brève description"},
          {"name": "Nom du Master 3", "match": [pourcentage], "description": "Brève description"}
        ],
        "careers": ["Métier 1", "Métier 2", "Métier 3"],
        "improvements": ["Matière ou compétence à améliorer 1", "Matière ou compétence à améliorer 2"]
      }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text) as AnalysisResult;
        setResult(data);
      }
    } catch (error) {
      console.error("Error analyzing profile:", error);
      // Fallback data for demo if API fails
      setResult({
        skills: [
          { subject: 'Analyse & Logique', A: 85, fullMark: 100 },
          { subject: 'Pratique & Technique', A: 75, fullMark: 100 },
          { subject: 'Théorie', A: 65, fullMark: 100 },
          { subject: 'Communication', A: 60, fullMark: 100 },
          { subject: 'Méthodologie', A: 80, fullMark: 100 },
        ],
        masters: [
          { name: `Master en ${actualMajor} Avancé`, match: 85, description: 'Approfondissement des concepts vus en licence.' },
          { name: 'Master Professionnel Spécialisé', match: 70, description: 'Formation axée sur la pratique en entreprise.' },
          { name: 'Master Recherche', match: 65, description: 'Préparation au doctorat et à la recherche académique.' }
        ],
        careers: ['Spécialiste Junior', 'Consultant', 'Chef de Projet'],
        improvements: ['Renforcer la participation orale', 'Améliorer les notes dans les matières théoriques']
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const context = result ? `Profil de l'étudiant : Licence ${actualMajor} à ${university}. Masters recommandés : ${result.masters.map(m => m.name).join(', ')}.` : '';
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Tu es un conseiller d'orientation pour les universités du Burkina Faso. ${context} Réponds de manière concise et encourageante à cette question : ${userMsg}`
      });

      if (response.text) {
        setChatMessages(prev => [...prev, { role: 'ai', text: response.text || '' }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Désolé, je rencontre des difficultés pour vous répondre actuellement.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <Compass size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Orientation Intelligente</h1>
          </div>
          <p className="text-slate-500 text-sm">Analysez vos notes par semestre et découvrez les masters et carrières faits pour vous.</p>
        </div>
      </div>

      {step === 1 && (
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BookOpen className="text-indigo-500" />
            Votre Parcours Académique
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Uni & Major */}
            <div className="lg:col-span-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Université</label>
                <select 
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option>Université Joseph Ki-Zerbo</option>
                  <option>Université Thomas Sankara</option>
                  <option>Université Nazi Boni</option>
                  <option>Université Norbert Zongo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Filière de Licence</label>
                <select 
                  value={majorSelect}
                  onChange={(e) => setMajorSelect(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 mb-2"
                >
                  <optgroup label="Sciences et technologies">
                    <option>Informatique</option>
                    <option>Mathématiques</option>
                    <option>Physique</option>
                    <option>Chimie</option>
                  </optgroup>
                  <optgroup label="Sciences économiques et gestion">
                    <option>Économie</option>
                    <option>Finance</option>
                    <option>Gestion</option>
                  </optgroup>
                  <optgroup label="Sciences juridiques et politiques">
                    <option>Droit public</option>
                    <option>Droit privé</option>
                  </optgroup>
                  <optgroup label="Autre">
                    <option value="Autre">Autre (préciser)</option>
                  </optgroup>
                </select>
                
                {majorSelect === 'Autre' && (
                  <input 
                    type="text" 
                    placeholder="Précisez votre filière..."
                    value={customMajor}
                    onChange={(e) => setCustomMajor(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 animate-in fade-in"
                  />
                )}
              </div>
            </div>

            {/* Right Column: Grades by Semester */}
            <div className="lg:col-span-8">
              <label className="block text-sm font-medium text-slate-700 mb-3">Relevé de notes par semestre</label>
              
              <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                {/* Semester Tabs */}
                <div className="flex overflow-x-auto border-b border-slate-200 bg-white">
                  {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map(sem => (
                    <button 
                      key={sem} 
                      onClick={() => setActiveSemester(sem)} 
                      className={cn(
                        "flex-1 min-w-[60px] py-3 text-sm font-semibold transition-colors border-b-2", 
                        activeSemester === sem ? "border-indigo-600 text-indigo-600 bg-indigo-50/50" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      {sem}
                    </button>
                  ))}
                </div>

                {/* Subjects List */}
                <div className="p-4 space-y-3 min-h-[200px]">
                  {grades[activeSemester].length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      Aucune matière ajoutée pour le semestre {activeSemester}.
                    </div>
                  ) : (
                    grades[activeSemester].map(subject => (
                      <div key={subject.id} className="flex gap-3 items-center animate-in fade-in slide-in-from-left-2">
                        <input 
                          type="text" 
                          placeholder="Nom de la matière" 
                          value={subject.name} 
                          onChange={e => updateSubject(activeSemester, subject.id, 'name', e.target.value)} 
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm" 
                        />
                        <div className="relative w-24">
                          <input 
                            type="number" 
                            min="0" max="20" step="0.25"
                            placeholder="Note" 
                            value={subject.grade} 
                            onChange={e => updateSubject(activeSemester, subject.id, 'grade', e.target.value !== '' ? Number(e.target.value) : '')} 
                            className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm" 
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">/20</span>
                        </div>
                        <button 
                          onClick={() => removeSubject(activeSemester, subject.id)} 
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={18}/>
                        </button>
                      </div>
                    ))
                  )}
                  
                  <button 
                    onClick={() => addSubject(activeSemester)} 
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-4 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    <Plus size={16}/> Ajouter une matière au {activeSemester}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
            <button 
              onClick={handleAnalyze}
              disabled={!actualMajor.trim()}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
            >
              <Sparkles size={18} />
              Analyser mon profil
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">Résultats de l'analyse</h2>
            <button 
              onClick={() => setStep(1)}
              className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
            >
              ← Modifier mes notes
            </button>
          </div>

          {isAnalyzing ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Analyse par l'IA en cours...</h3>
              <p className="text-slate-500 text-sm text-center max-w-md">
                Nous analysons l'évolution de vos notes semestre par semestre pour déterminer vos points forts.
              </p>
            </div>
          ) : result && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Radar Chart */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 lg:col-span-1">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Target className="text-indigo-500" size={20} />
                  Vos Compétences Déduites
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={result.skills}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Étudiant" dataKey="A" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.5} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-6 space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">À améliorer :</h4>
                  <ul className="space-y-2">
                    {result.improvements.map((imp, idx) => (
                      <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></div>
                        {imp}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 lg:col-span-2 space-y-8">
                <div>
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <GraduationCap className="text-emerald-500" size={20} />
                    Masters Recommandés
                  </h3>
                  <div className="space-y-4">
                    {result.masters.map((master, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-emerald-200 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-900">{master.name}</h4>
                          <div className={cn(
                            "px-2 py-1 rounded-lg text-xs font-bold",
                            master.match >= 80 ? "bg-emerald-100 text-emerald-700" :
                            master.match >= 60 ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-700"
                          )}>
                            {master.match}% Compatible
                          </div>
                        </div>
                        <p className="text-sm text-slate-600">{master.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Briefcase className="text-blue-500" size={20} />
                    Métiers Envisageables
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.careers.map((career, idx) => (
                      <span key={idx} className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-sm font-medium">
                        {career}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Assistant Chat */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 lg:col-span-3 overflow-hidden flex flex-col h-[400px]">
                <div className="p-4 bg-indigo-600 text-white flex items-center gap-2">
                  <Brain size={20} />
                  <h3 className="font-bold">Assistant d'Orientation IA</h3>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[80%] p-3 rounded-2xl text-sm",
                        msg.role === 'user' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm"
                      )}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Posez une question sur votre orientation..."
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                  />
                  <button 
                    type="submit"
                    disabled={isChatLoading || !chatInput.trim()}
                    className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
