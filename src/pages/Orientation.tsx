import React, { useState, useEffect } from 'react';
import { Compass, BookOpen, Target, Brain, Briefcase, Sparkles, Send, GraduationCap, Plus, Trash2, TrendingUp, X, Save, CheckCircle2, Filter } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { GoogleGenAI } from '@google/genai';
import { cn } from '@/lib/utils';

interface AnalysisResult {
  skills: { subject: string; A: number; fullMark: number; description: string }[];
  semesterAverages: { semester: string; average: number }[];
  masters: { name: string; type: 'Recherche' | 'Professionnel'; match: number; description: string; prospects: string[] }[];
  careers: { title: string; match: number; explanation: string }[];
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

  // Extra profile data
  const [extraSkills, setExtraSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [experiences, setExperiences] = useState<string[]>([]);
  const [expInput, setExpInput] = useState('');

  const [filterType, setFilterType] = useState<'Tous' | 'Recherche' | 'Professionnel'>('Tous');
  const [sortBy, setSortBy] = useState<'match_desc' | 'match_asc'>('match_desc');
  const [isSaved, setIsSaved] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('campusbf_orientation_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.university) setUniversity(parsed.university);
        if (parsed.majorSelect) setMajorSelect(parsed.majorSelect);
        if (parsed.customMajor) setCustomMajor(parsed.customMajor);
        if (parsed.grades) setGrades(parsed.grades);
        if (parsed.extraSkills) setExtraSkills(parsed.extraSkills);
        if (parsed.experiences) setExperiences(parsed.experiences);
        if (parsed.result) {
          setResult(parsed.result);
          setStep(2);
        }
      } catch (e) {
        console.error("Failed to load profile", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Auto-save progress
  useEffect(() => {
    if (isLoaded) {
      const profileData = {
        university, majorSelect, customMajor, grades, extraSkills, experiences, result
      };
      localStorage.setItem('campusbf_orientation_profile', JSON.stringify(profileData));
    }
  }, [university, majorSelect, customMajor, grades, extraSkills, experiences, result, isLoaded]);

  const handleSaveProfile = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'Bonjour ! Je suis votre assistant d\'orientation académique. Avez-vous des questions sur votre parcours, les masters ou les métiers disponibles ?' }
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

  const addSkill = () => {
    if (skillInput.trim() && !extraSkills.includes(skillInput.trim())) {
      setExtraSkills([...extraSkills, skillInput.trim()]);
      setSkillInput('');
    }
  };
  const removeSkill = (skill: string) => setExtraSkills(extraSkills.filter(s => s !== skill));

  const addExp = () => {
    if (expInput.trim() && !experiences.includes(expInput.trim())) {
      setExperiences([...experiences, expInput.trim()]);
      setExpInput('');
    }
  };
  const removeExp = (exp: string) => setExperiences(experiences.filter(e => e !== exp));

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

      Compétences spécifiques (outils, langages, etc.) : ${extraSkills.join(', ') || 'Aucune précisée'}
      Expériences (projets, associations, stages) : ${experiences.join(', ') || 'Aucune précisée'}

      Analyse cette progression, ces notes, compétences et expériences. 
      1. Déduis-en 5 grandes compétences clés pour son profil et évalue-les sur 100.
      2. Calcule une moyenne générale estimée pour chaque semestre fourni (S1 à S6). S'il n'y a pas de notes pour un semestre, ne l'inclus pas.
      3. Sois exhaustif dans tes recommandations de masters (particulièrement pour l'informatique au Burkina Faso). Propose entre 4 et 6 masters, en incluant OBLIGATOIREMENT des masters "Recherche" et "Professionnel". Précise les débouchés.
      4. Propose une simulation de compatibilité avec 3 à 4 métiers spécifiques du marché burkinabè, en expliquant le lien entre les compétences de l'étudiant et les exigences du métier.

      Génère une analyse JSON stricte avec cette structure exacte, sans markdown autour :
      {
        "skills": [
          {"subject": "Nom Compétence 1 (ex: Logique)", "A": [score sur 100], "fullMark": 100, "description": "Brève description de la compétence"},
          {"subject": "Nom Compétence 2", "A": [score sur 100], "fullMark": 100, "description": "Brève description de la compétence"},
          {"subject": "Nom Compétence 3", "A": [score sur 100], "fullMark": 100, "description": "Brève description de la compétence"},
          {"subject": "Nom Compétence 4", "A": [score sur 100], "fullMark": 100, "description": "Brève description de la compétence"},
          {"subject": "Nom Compétence 5", "A": [score sur 100], "fullMark": 100, "description": "Brève description de la compétence"}
        ],
        "semesterAverages": [
          {"semester": "S1", "average": 13.5},
          {"semester": "S2", "average": 14.2}
        ],
        "masters": [
          {"name": "Nom du Master 1", "type": "Recherche", "match": [pourcentage], "description": "Brève description", "prospects": ["Débouché 1", "Débouché 2"]},
          {"name": "Nom du Master 2", "type": "Professionnel", "match": [pourcentage], "description": "Brève description", "prospects": ["Débouché 1", "Débouché 2"]}
        ],
        "careers": [
          {"title": "Nom du métier", "match": [pourcentage], "explanation": "Explication du lien avec les compétences de l'étudiant"}
        ],
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
          { subject: 'Analyse & Logique', A: 85, fullMark: 100, description: 'Forte capacité à résoudre des problèmes complexes.' },
          { subject: 'Pratique & Technique', A: 75, fullMark: 100, description: 'Bonne maîtrise des outils et langages appliqués.' },
          { subject: 'Théorie', A: 65, fullMark: 100, description: 'Compréhension des concepts fondamentaux.' },
          { subject: 'Communication', A: 60, fullMark: 100, description: 'Capacité à expliquer et documenter son travail.' },
          { subject: 'Méthodologie', A: 80, fullMark: 100, description: 'Rigueur dans l\'organisation et la gestion de projet.' },
        ],
        semesterAverages: [
          { semester: 'S1', average: 13 },
          { semester: 'S2', average: 15 },
        ],
        masters: [
          { name: `Master en ${actualMajor} Avancé`, type: 'Recherche', match: 85, description: 'Approfondissement des concepts vus en licence pour préparer un doctorat.', prospects: ['Enseignant-Chercheur', 'Data Scientist R&D'] },
          { name: 'Master Professionnel Spécialisé', type: 'Professionnel', match: 75, description: 'Formation axée sur la pratique en entreprise et l\'insertion professionnelle directe.', prospects: ['Ingénieur Logiciel', 'Chef de Projet IT'] },
          { name: 'Master en Ingénierie et Innovation', type: 'Professionnel', match: 70, description: 'Tourné vers les besoins de l\'industrie et la gestion de projets techniques.', prospects: ['Consultant SI', 'Architecte Logiciel'] }
        ],
        careers: [
          { title: 'Ingénieur Logiciel', match: 85, explanation: 'Vos bonnes notes en algorithmique et vos projets pratiques correspondent parfaitement aux attentes des ESN burkinabè.' },
          { title: 'Data Analyst', match: 75, explanation: 'Votre esprit logique et vos compétences analytiques sont des atouts majeurs pour ce poste très demandé dans les banques et télécoms.' }
        ],
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
      const context = result ? `Profil de l'étudiant : Licence ${actualMajor} à ${university}. Compétences: ${extraSkills.join(', ')}. Masters recommandés : ${result.masters.map(m => `${m.name} (${m.type})`).join(', ')}.` : '';
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Tu es un conseiller d'orientation pour les universités du Burkina Faso. ${context} 
L'étudiant te pose une question. Réponds de manière concise, encourageante et exhaustive, en n'hésitant pas à détailler les différences entre les parcours recherche et professionnel si pertinent.
S'il te demande comment atteindre un master ou un métier spécifique, donne-lui des conseils précis sur les compétences à développer et les actions à entreprendre.
Question : ${userMsg}`
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

      {/* Stepper */}
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-2 md:gap-4">
          <div className={cn("flex items-center gap-2", step >= 1 ? "text-indigo-600" : "text-slate-400")}>
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors", step >= 1 ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-100 text-slate-500")}>1</div>
            <span className="font-semibold text-sm hidden md:inline">Profil Académique</span>
          </div>
          <div className={cn("w-8 md:w-16 h-1 rounded-full transition-colors", step >= 2 ? "bg-indigo-600" : "bg-slate-200")}></div>
          <div className={cn("flex items-center gap-2", step >= 2 ? "text-indigo-600" : "text-slate-400")}>
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors", step >= 2 ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-slate-100 text-slate-500")}>2</div>
            <span className="font-semibold text-sm hidden md:inline">Analyse & Recommandations</span>
          </div>
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

          {/* Extra Profile Data */}
          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Extra Skills */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Compétences spécifiques (Outils, Langages...)</label>
              <div className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  placeholder="Ex: Python, React, Analyse de données..."
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                />
                <button onClick={addSkill} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors">
                  <Plus size={20} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {extraSkills.map(skill => (
                  <span key={skill} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm flex items-center gap-2">
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                  </span>
                ))}
              </div>
            </div>

            {/* Experiences */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Expériences (Projets, Associations, Stages)</label>
              <div className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  value={expInput}
                  onChange={e => setExpInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addExp())}
                  placeholder="Ex: Stage développeur, Club Informatique..."
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                />
                <button onClick={addExp} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors">
                  <Plus size={20} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {experiences.map(exp => (
                  <span key={exp} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm flex items-center gap-2">
                    {exp}
                    <button onClick={() => removeExp(exp)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Grades Summary Table */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Récapitulatif des notes saisies</h3>
            <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Semestre</th>
                    <th className="px-4 py-3 font-semibold">Matières et Notes</th>
                    <th className="px-4 py-3 font-semibold">Moyenne (est.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map(sem => {
                    const semGrades = grades[sem].filter(g => g.name.trim() !== '' && g.grade !== '');
                    if (semGrades.length === 0) return null;
                    const avg = semGrades.reduce((acc, curr) => acc + Number(curr.grade), 0) / semGrades.length;
                    return (
                      <tr key={sem} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{sem}</td>
                        <td className="px-4 py-3 text-slate-600">
                          <div className="flex flex-wrap gap-2">
                            {semGrades.map(g => (
                              <span key={g.id} className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-700">
                                {g.name}: <span className="ml-1 font-bold text-indigo-600">{g.grade}/20</span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-indigo-600">
                          {avg.toFixed(2)}/20
                        </td>
                      </tr>
                    );
                  })}
                  {Object.values(grades).every(sem => sem.filter(g => g.name.trim() !== '' && g.grade !== '').length === 0) && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                        Aucune note saisie pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 flex justify-between items-center border-t border-slate-100 pt-6">
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
              <CheckCircle2 size={16} />
              Progression sauvegardée automatiquement
            </div>
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
            <div className="flex items-center gap-4">
              <button 
                onClick={handleSaveProfile}
                className={cn(
                  "text-sm font-medium flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                  isSaved ? "bg-emerald-50 text-emerald-600" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
                {isSaved ? "Profil sauvegardé" : "Sauvegarder mon profil"}
              </button>
              <button 
                onClick={() => setStep(1)}
                className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
              >
                ← Modifier mon profil
              </button>
            </div>
          </div>

          {isAnalyzing ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Analyse par l'IA en cours...</h3>
              <p className="text-slate-500 text-sm text-center max-w-md">
                Nous analysons l'évolution de vos notes, vos compétences spécifiques et vos expériences pour déterminer vos points forts.
              </p>
            </div>
          ) : result && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Charts & Improvements */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 lg:col-span-1 flex flex-col gap-6">
                <div>
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
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-100 max-w-xs">
                                  <p className="font-bold text-slate-900">{data.subject} : {data.A}/100</p>
                                  <p className="text-xs text-slate-600 mt-1">{data.description}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {result.semesterAverages && result.semesterAverages.length > 0 && (
                  <div className="pt-6 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="text-indigo-500" size={16} />
                      Progression Académique
                    </h4>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={result.semesterAverages}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="semester" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 20]} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [`${value}/20`, 'Moyenne']}
                          />
                          <Line type="monotone" dataKey="average" stroke="#4f46e5" strokeWidth={3} dot={{ fill: '#4f46e5', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                
                <div className="pt-6 border-t border-slate-100 space-y-3">
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

              {/* Right Column: Recommendations */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 lg:col-span-2 space-y-8">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <GraduationCap className="text-emerald-500" size={20} />
                      Masters Recommandés
                    </h3>
                    <div className="flex items-center gap-2 text-sm">
                      <Filter size={16} className="text-slate-400" />
                      <select 
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="Tous">Tous les types</option>
                        <option value="Recherche">Recherche</option>
                        <option value="Professionnel">Professionnel</option>
                      </select>
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="match_desc">Pertinence (Max → Min)</option>
                        <option value="match_asc">Pertinence (Min → Max)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {result.masters
                      .filter(m => filterType === 'Tous' || m.type === filterType)
                      .sort((a, b) => sortBy === 'match_desc' ? b.match - a.match : a.match - b.match)
                      .map((master, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-emerald-200 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-slate-900">{master.name}</h4>
                            <span className={cn(
                              "inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                              master.type === 'Recherche' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                            )}>
                              {master.type}
                            </span>
                          </div>
                          <div className={cn(
                            "px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap ml-2",
                            master.match >= 80 ? "bg-emerald-100 text-emerald-700" :
                            master.match >= 60 ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-700"
                          )}>
                            {master.match}% Compatible
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{master.description}</p>
                        {master.prospects && master.prospects.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            <span className="text-xs font-medium text-slate-500 mr-1 flex items-center">Débouchés :</span>
                            {master.prospects.map((p, i) => (
                              <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded text-[10px]">{p}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Briefcase className="text-blue-500" size={20} />
                    Simulation Métiers (Marché Burkinabè)
                  </h3>
                  <div className="space-y-4">
                    {result.careers.map((career, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-white hover:border-blue-200 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-slate-900">{career.title}</h4>
                          <div className={cn(
                            "px-2 py-1 rounded-lg text-xs font-bold",
                            career.match >= 80 ? "bg-blue-100 text-blue-700" :
                            career.match >= 60 ? "bg-slate-100 text-slate-700" : "bg-slate-100 text-slate-500"
                          )}>
                            {career.match}% Match
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{career.explanation}</p>
                      </div>
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
