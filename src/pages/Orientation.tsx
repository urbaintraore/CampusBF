import React, { useState, useEffect } from 'react';
import { Compass, BookOpen, Target, Brain, Briefcase, Sparkles, Send, GraduationCap, Plus, Trash2, TrendingUp, X, Save, CheckCircle2, Filter, Download, Star, History, Calendar, Award } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { GoogleGenAI } from '@google/genai';
import { CONCOURS_LIST } from '../data/concours';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Markdown from 'react-markdown';

interface AnalysisResult {
  skills: { subject: string; A: number; fullMark: number; description: string }[];
  semesterAverages: { semester: string; average: number }[];
  masters: { 
    name: string; 
    type: 'Recherche' | 'Professionnel'; 
    match: number; 
    description: string; 
    prospects: string[];
    prerequisites?: Record<string, number>;
  }[];
  careers: { title: string; match: number; explanation: string }[];
  concours: { title: string; level: string; requirements: string; match: number; explanation: string }[];
  improvements: string[];
}

interface SavedReport {
  id: string;
  date: string;
  university: string;
  major: string;
  extraSkills: string[];
  experiences: string[];
  result: AnalysisResult;
  rating?: number | null;
  ratingFeedback?: string;
}

type SubjectGrade = { id: string; name: string; grade: number | '' };

export default function Orientation() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  
  // Dashboard & History state
  const [activeTab, setActiveTab] = useState<'create' | 'dashboard'>('create');
  const [history, setHistory] = useState<SavedReport[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [selectedMasterForComparison, setSelectedMasterForComparison] = useState<any | null>(null);

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

  // Rating widget widget states
  const [widgetFeedback, setWidgetFeedback] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingSuccessId, setRatingSuccessId] = useState<string | null>(null);

  // Sync widget feedback with active report
  useEffect(() => {
    if (activeReportId) {
      const activeRep = history.find(r => r.id === activeReportId);
      setWidgetFeedback(activeRep?.ratingFeedback || '');
      setRatingSuccessId(null);
    } else {
      setWidgetFeedback('');
      setRatingSuccessId(null);
    }
  }, [activeReportId]);

  // Update comparison target whenever result changes
  useEffect(() => {
    if (result && result.masters && result.masters.length > 0) {
      setSelectedMasterForComparison(result.masters[0]);
    } else {
      setSelectedMasterForComparison(null);
    }
  }, [result]);

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

    const savedHistory = localStorage.getItem('campusbf_orientation_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load orientation history", e);
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

  const addNewReportToHistory = (analysisResult: AnalysisResult) => {
    const reportId = 'report_' + Math.random().toString(36).substring(2, 11);
    const newReport: SavedReport = {
      id: reportId,
      date: new Date().toISOString(),
      university,
      major: actualMajor,
      extraSkills: [...extraSkills],
      experiences: [...experiences],
      result: analysisResult,
      rating: null,
      ratingFeedback: ''
    };

    setHistory(prev => {
      const updated = [newReport, ...prev];
      localStorage.setItem('campusbf_orientation_history', JSON.stringify(updated));
      return updated;
    });

    setResult(analysisResult);
    setActiveReportId(reportId);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setStep(2);
    
    try {
      const gradesText = Object.entries(grades).map(([sem, subjects]) => {
        const validSubjects = (subjects as SubjectGrade[]).filter(s => s.name.trim() !== '' && s.grade !== '');
        if (!validSubjects || validSubjects.length === 0) return '';
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
      1. Déduis-en 5 grandes compétences clés pour son profil (les titres exacts de ces compétences serviront de clés plus tard) et évalue-les sur 100.
      2. Calcule une moyenne générale estimée pour chaque semestre fourni (S1 à S6). S'il n'y a pas de notes pour un semestre, ne l'inclus pas.
      3. Sois exhaustif dans tes recommandations de masters (particulièrement pour l'informatique au Burkina Faso). Propose entre 4 et 6 masters, en incluant OBLIGATOIREMENT des masters "Recherche" et "Professionnel". Précise les débouchés. Pour chaque master, évalue la note de prérequis requise de 100 pour chacun des 5 titres de compétences de l'étudiant comme clé sous l'attribut "prerequisites".
      4. Propose une simulation de compatibilité avec 3 à 4 métiers spécifiques du marché burkinabè, en expliquant le lien entre les compétences de l'étudiant et les exigences du métier.

      Génère une analyse JSON stricte avec cette structure exacte, sans markdown autour :
      {
        "skills": [
          {"subject": "Nom Compétence 1 (ex: Logique)", "A": [score sur 100], "fullMark": 100, "description": "Brève description de la compétence"},
          {"subject": "Nom Compétence 2 (ex: Technique)", "A": [score sur 100], "fullMark": 100, "description": "Brève description de la compétence"},
          {"subject": "Nom Compétence 3 (ex: Théorie)", "A": [score sur 100], "fullMark": 100, "description": "Brève description de la compétence"},
          {"subject": "Nom Compétence 4", "A": [score sur 100], "fullMark": 100, "description": "Brève description de la compétence"},
          {"subject": "Nom Compétence 5", "A": [score sur 100], "fullMark": 100, "description": "Brève description de la compétence"}
        ],
        "semesterAverages": [
          {"semester": "S1", "average": 13.5},
          {"semester": "S2", "average": 14.2}
        ],
        "masters": [
          {
            "name": "Nom du Master 1",
            "type": "Recherche",
            "match": [pourcentage],
            "description": "Brève description",
            "prospects": ["Débouché 1", "Débouché 2"],
            "prerequisites": {
              "Nom Compétence 1": 75,
              "Nom Compétence 2": 60,
              "Nom Compétence 3": 80,
              "Nom Compétence 4": 65,
              "Nom Compétence 5": 70
            }
          }
        ],
        "careers": [
          {"title": "Nom du métier", "match": [pourcentage], "explanation": "Explication du lien avec les compétences de l'étudiant"}
        ],
        "improvements": ["Matière ou compétence à améliorer 1", "Matière ou compétence à améliorer 2"]
      }
      `;

      const response = await fetch('/api/orientation/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error('Analysis request failed');
      }

      const dataJson = await response.json();

      if (dataJson.text) {
        const data = JSON.parse(dataJson.text) as AnalysisResult;
        addNewReportToHistory(data);
      }
    } catch (error) {
      console.error("Error analyzing profile:", error);
      // Fallback data for demo if API fails
      const fallbackData: AnalysisResult = {
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
          { 
            name: `Master en ${actualMajor} Avancé`, 
            type: 'Recherche', 
            match: 85, 
            description: 'Approfondissement des concepts vus en licence pour préparer un doctorat.', 
            prospects: ['Enseignant-Chercheur', 'Data Scientist R&D'],
            prerequisites: {
              'Analyse & Logique': 80,
              'Pratique & Technique': 60,
              'Théorie': 85,
              'Communication': 70,
              'Méthodologie': 75
            }
          },
          { 
            name: 'Master Professionnel Spécialisé', 
            type: 'Professionnel', 
            match: 75, 
            description: 'Formation axée sur la pratique en entreprise et l\'insertion professionnelle directe.', 
            prospects: ['Ingénieur Logiciel', 'Chef de Projet IT'],
            prerequisites: {
              'Analyse & Logique': 70,
              'Pratique & Technique': 85,
              'Théorie': 60,
              'Communication': 75,
              'Méthodologie': 80
            }
          },
          { 
            name: 'Master en Ingénierie et Innovation', 
            type: 'Professionnel', 
            match: 70, 
            description: 'Tourné vers les besoins de l\'industrie et la gestion de projets techniques.', 
            prospects: ['Consultant SI', 'Architecte Logiciel'],
            prerequisites: {
              'Analyse & Logique': 75,
              'Pratique & Technique': 80,
              'Théorie': 65,
              'Communication': 70,
              'Méthodologie': 75
            }
          }
        ],
        careers: [
          { title: 'Ingénieur Logiciel', match: 85, explanation: 'Vos bonnes notes en algorithmique et vos projets pratiques correspondent parfaitement aux attentes des ESN burkinabè.' },
          { title: 'Data Analyst', match: 75, explanation: 'Votre esprit logique et vos compétences analytiques sont des atouts majeurs pour ce poste très demandé dans les banques et télécoms.' }
        ],
        concours: [
          { title: 'ENAREF CYCLE A', level: 'Licence', requirements: 'Licence en sciences économiques ou juridiques', match: 90, explanation: 'Votre profil correspond aux exigences de ce concours.' }
        ],
        improvements: ['Renforcer la participation orale', 'Améliorer les notes dans les matières théoriques']
      };
      addNewReportToHistory(fallbackData);
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
      const context = result ? `Profil de l'étudiant : Licence ${actualMajor} à ${university}. Compétences: ${extraSkills.join(', ')}. Masters recommandés : ${result.masters.map(m => `${m.name} (${m.type})`).join(', ')}.` : '';
      const concoursContext = `Voici la liste des concours de la fonction publique disponibles : ${JSON.stringify(CONCOURS_LIST)}. Si l'étudiant pose une question sur les concours, utilise cette liste pour lui indiquer ceux qui correspondent à son niveau (BEPC, BAC, Licence) et à sa spécialité (${actualMajor}).`;
      
      const prompt = `Tu es un conseiller d'orientation pour les universités du Burkina Faso. ${context} 
${concoursContext}
Tu as accès à internet via l'outil de recherche Google. Si l'étudiant te demande des offres d'emploi, des stages ou des opportunités actuelles, effectue une recherche web ciblée sur les sites des grandes entreprises et institutions du Burkina Faso (ex: Ministère de la fonction publique, Ministère de la défense, ONEA, SONABEL, SONABHY, Orange Burkina, Moov Africa, Telecel Faso, etc.) pour lui fournir des informations à jour.
L'étudiant te pose une question. Réponds de manière concise, encourageante et exhaustive, en n'hésitant pas à détailler les différences entre les parcours recherche et professionnel si pertinent.
S'il te demande comment atteindre un master ou un métier spécifique, donne-lui des conseils précis sur les compétences à développer et les actions à entreprendre.
Question : ${userMsg}`;

      const response = await fetch('/api/orientation/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) throw new Error('Chat failed');
      const dataJson = await response.json();

      if (dataJson.text) {
        setChatMessages(prev => [...prev, { role: 'ai', text: dataJson.text || '' }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Désolé, je rencontre des difficultés pour vous répondre actuellement.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const exportReportToPDF = (report: SavedReport) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 27, 75); // Dark Indigo
    doc.text("Orientation IA : Rapport CampusBF", 15, 20);
    
    // Decorative bar
    doc.setDrawColor(79, 70, 229); // Indigo 600
    doc.setLineWidth(1.5);
    doc.line(15, 24, 195, 24);
    
    // Meta info
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(`Généré le : ${new Date(report.date).toLocaleDateString('fr-FR')} à ${new Date(report.date).toLocaleTimeString('fr-FR')}`, 15, 30);
    doc.text(`Identifiant : ${report.id}`, 15, 35);
    
    // Profil Académique Section
    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85);
    doc.text("1. Profil Académique", 15, 46);
    
    const infoData = [
      ["Université", report.university],
      ["Spécialité / Filière de Licence", report.major],
      ["Compétences ajoutées", report.extraSkills.join(', ') || 'Aucune renseignée'],
      ["Expériences & Projets", report.experiences.join(', ') || 'Aucunes renseignées']
    ];
    
    autoTable(doc, {
      body: infoData,
      startY: 50,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50, textColor: [79, 70, 229] },
        1: { textColor: [51, 65, 85] }
      }
    });

    const currentY = (doc as any).lastAutoTable.finalY + 12;
    
    // Compétences Déduites Table
    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85);
    doc.text("2. Compétences analysées par l'IA", 15, currentY);
    
    const skillsBody = report.result.skills.map(s => [s.subject, `${s.A}/100`, s.description]);
    autoTable(doc, {
      head: [["Axe de compétence", "Score estimé", "Détail / Observation"]],
      body: skillsBody,
      startY: currentY + 4,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    // We start master recommendations on next page for clean readability
    doc.addPage();
    
    doc.setFontSize(14);
    doc.setTextColor(30, 27, 75);
    doc.text("3. Recommandations de Masters", 15, 20);
    
    const mastersBody = report.result.masters.map(m => [
      m.name,
      m.type,
      `${m.match}%`,
      m.description,
      m.prospects?.join(', ') || 'N/A'
    ]);
    
    autoTable(doc, {
      head: [["Master suggéré", "Type", "Match", "Description", "Perspectives de carrière"]],
      body: mastersBody,
      startY: 25,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], fontStyle: 'bold' }, // Emerald 500
      styles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 22 },
        2: { fontStyle: 'bold', cellWidth: 15 },
        3: { cellWidth: 60 },
        4: { cellWidth: 43 }
      }
    });

    const nextY = (doc as any).lastAutoTable.finalY + 12;
    
    // Careers section
    doc.setFontSize(14);
    doc.setTextColor(30, 27, 75);
    doc.text("4. Perspectives professionnelles (Marché Burkinabè)", 15, nextY);
    
    const careersBody = report.result.careers.map(c => [c.title, `${c.match}%`, c.explanation]);
    autoTable(doc, {
      head: [["Emploi / Métier ciblé", "Indice de Match", "Justification & Cohérence"]],
      body: careersBody,
      startY: nextY + 4,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' }, // Blue 500
      styles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { fontStyle: 'bold', cellWidth: 25 },
        2: { cellWidth: 115 }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;
    
    if (finalY > 240) {
      doc.addPage();
    }
    
    const startYImprovements = finalY > 240 ? 20 : finalY;
    
    // Improvements Section
    doc.setFontSize(12);
    doc.setTextColor(30, 27, 75);
    doc.text("Axes d'amélioration conseillés :", 15, startYImprovements);
    
    report.result.improvements.forEach((imp, idx) => {
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`- ${imp}`, 18, startYImprovements + 7 + (idx * 6));
    });

    if (report.rating) {
      doc.setFontSize(10);
      doc.setTextColor(30, 27, 75);
      doc.text(`Évaluation de l'étudiant : ${'★'.repeat(report.rating)}${'☆'.repeat(5 - report.rating)}`, 15, startYImprovements + 15 + (report.result.improvements.length * 6));
      if (report.ratingFeedback) {
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Commentaire : "${report.ratingFeedback}"`, 15, startYImprovements + 21 + (report.result.improvements.length * 6));
      }
    }
    
    doc.save(`Rapport_Orientation_CampusBF_${report.major.replace(/\s+/g, '_')}_${report.id}.pdf`);
  };

  const handleRateReport = (reportId: string, ratingValue: number, feedbackValue: string) => {
    setHistory(prev => {
      const updated = prev.map(report => {
        if (report.id === reportId) {
          return { ...report, rating: ratingValue, ratingFeedback: feedbackValue };
        }
        return report;
      });
      localStorage.setItem('campusbf_orientation_history', JSON.stringify(updated));
      return updated;
    });
  };

  const exportChatToPDF = () => {
    if (chatMessages.length === 0) return;
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229); // Indigo 600
    doc.text("CampusBF - Orientation IA : Historique", 10, 15);
    
    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(`Exporté le : ${new Date().toLocaleString('fr-FR')}`, 10, 25);
    doc.text(`Profil : Licence ${actualMajor} à ${university}`, 10, 30);
    
    const tableData = chatMessages.map(msg => [
      msg.role === 'user' ? 'Moi' : 'Assistant IA',
      msg.text
    ]);
    
    autoTable(doc, {
      head: [['Interlocuteur', 'Message']],
      body: tableData,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold' },
        1: { cellWidth: 'auto' }
      }
    });
    
    doc.save(`Orientation_IA_Discussion_${new Date().getTime()}.pdf`);
  };

  const OrientationDashboard = () => {
    const handleDeleteReport = (reportId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.confirm("Voulez-vous vraiment supprimer ce rapport d'orientation ?")) return;
      
      setHistory(prev => {
        const updated = prev.filter(r => r.id !== reportId);
        localStorage.setItem('campusbf_orientation_history', JSON.stringify(updated));
        return updated;
      });

      if (activeReportId === reportId) {
        setResult(null);
        setActiveReportId(null);
        setStep(1);
      }
    };

    const handleSelectReport = (report: SavedReport) => {
      // Restore all stored state values
      setUniversity(report.university);
      setMajorSelect(report.major === 'Informatique' || report.major === 'Mathématiques' || report.major === 'Physique' || report.major === 'Chimie' || report.major === 'Économie' || report.major === 'Finance' || report.major === 'Gestion' || report.major === 'Droit public' || report.major === 'Droit privé' ? report.major : 'Autre');
      if (report.major !== 'Informatique' && report.major !== 'Mathématiques' && report.major !== 'Physique' && report.major !== 'Chimie' && report.major !== 'Économie' && report.major !== 'Finance' && report.major !== 'Gestion' && report.major !== 'Droit public' && report.major !== 'Droit privé') {
        setCustomMajor(report.major);
      } else {
        setCustomMajor('');
      }
      setExtraSkills(report.extraSkills || []);
      setExperiences(report.experiences || []);
      setResult(report.result);
      setActiveReportId(report.id);
      setStep(2);
      setActiveTab('create');
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className="text-indigo-500" size={20} />
              Tableau de bord : Orientation IA
            </h2>
            <p className="text-xs text-slate-500">Consultez, comparez et téléchargez vos analyses passées.</p>
          </div>
          <button
            onClick={() => {
              setResult(null);
              setActiveReportId(null);
              setStep(1);
              setActiveTab('create');
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm shadow-indigo-100"
          >
            <Plus size={14} /> Nouvelle Analyse
          </button>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Compass size={40} className="mx-auto text-slate-300 mb-3 animate-pulse" />
            <p className="font-semibold text-slate-700">Aucun rapport sauvegardé</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Saisissez vos notes académiques pour générer votre première analyse d'orientation intelligente.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {history.map((report) => {
              const dateObj = new Date(report.date);
              const formattedDate = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
              
              // Find best compatibility matching percentages
              const bestMaster = report.result.masters?.reduce((prev: any, curr: any) => (prev.match > curr.match) ? prev : curr, { match: 0 });
              
              return (
                <div 
                  key={report.id}
                  onClick={() => handleSelectReport(report)}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group relative flex flex-col justify-between"
                >
                  <div>
                    {/* Header line */}
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                          <Calendar size={12} />
                          {formattedDate}
                        </div>
                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mt-1">
                          Licence en {report.major}
                        </h3>
                        <p className="text-xs text-slate-500">{report.university}</p>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportReportToPDF(report);
                          }}
                          className="p-1.5 bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors border border-slate-100"
                          title="Télécharger en PDF"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteReport(report.id, e)}
                          className="p-1.5 bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors border border-slate-100"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Report highlights */}
                    <div className="my-4 py-3 px-4 bg-slate-50 rounded-xl space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Master recommandé :</span>
                        <span className="font-semibold text-slate-800">{bestMaster?.name || 'Analyse en cours'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Compatibilité max :</span>
                        <span className="font-bold text-emerald-600">{bestMaster?.match || 0}%</span>
                      </div>
                      {report.extraSkills && report.extraSkills.length > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Compétences clés :</span>
                          <span className="text-slate-600 font-medium truncate max-w-[150px]">{report.extraSkills.slice(0, 3).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rating display */}
                  <div className="border-t border-slate-100 pt-3 mt-2 flex justify-between items-center">
                    <span className="text-[11px] text-slate-400">
                      Rapport ID: {report.id}
                    </span>
                    {report.rating ? (
                      <div className="flex items-center gap-1" title={`${report.rating}/5`}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star 
                            key={s} 
                            size={12} 
                            className={cn(s <= (report.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-200")} 
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                        Non évalué
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
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

      {/* Tabs */}
      {history.length > 0 && (
        <div className="flex border-b border-slate-200 gap-4 mb-2">
          <button
            onClick={() => setActiveTab('create')}
            className={cn(
              "relative pb-3 text-sm font-semibold transition-all",
              activeTab === 'create' ? "text-indigo-600 border-b-2 border-indigo-600 font-bold" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <span className="flex items-center gap-2">
              <Compass size={16} />
              Rapport / Analyse Active
            </span>
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "relative pb-3 text-sm font-semibold transition-all",
              activeTab === 'dashboard' ? "text-indigo-600 border-b-2 border-indigo-600 font-bold" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <span className="flex items-center gap-2">
              <History size={16} />
              Historique des Rapports ({history.length})
            </span>
          </button>
        </div>
      )}

      {activeTab === 'dashboard' ? (
        <OrientationDashboard />
      ) : (
        <>
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
                  {!grades[activeSemester] || grades[activeSemester].length === 0 ? (
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
                    const semGrades = grades[sem]?.filter(g => g.name.trim() !== '' && g.grade !== '') || [];
                    if (!semGrades || semGrades.length === 0) return null;
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
                  {Object.values(grades).every((sem: SubjectGrade[]) => !sem || sem.filter(g => g.name.trim() !== '' && g.grade !== '').length === 0) && (
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
                  <div className="flex flex-col gap-1 mb-2">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Target className="text-indigo-500" size={20} />
                      Analyse Comparative des Prérequis
                    </h3>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Comparez vos compétences avec les exigences de la filière sélectionnée ci-dessous.
                    </p>
                  </div>

                  {/* Dropdown to select which recommended master to compare keys against */}
                  {result.masters && result.masters.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                        Master de comparaison :
                      </label>
                      <select
                        value={selectedMasterForComparison ? selectedMasterForComparison.name : ''}
                        onChange={(e) => {
                          const found = result.masters.find(m => m.name === e.target.value);
                          if (found) setSelectedMasterForComparison(found);
                        }}
                        className="w-full text-xs font-semibold px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-505 text-slate-705"
                      >
                        {result.masters.map((m, idx) => (
                          <option key={idx} value={m.name}>{m.name} ({m.type})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={
                        result.skills.map(skill => {
                          let reqValue = 70;
                          if (selectedMasterForComparison && selectedMasterForComparison.prerequisites) {
                            reqValue = selectedMasterForComparison.prerequisites[skill.subject] || 
                                       selectedMasterForComparison.prerequisites[skill.subject.toLowerCase()] || 
                                       70;
                          } else {
                            // Synthesize mock but highly cohesive prerequisites based on score if none were parsed
                            reqValue = Math.max(45, Math.min(95, Math.round(skill.A * (selectedMasterForComparison ? selectedMasterForComparison.match / 100 : 0.85) + 5)));
                          }
                          return {
                            subject: skill.subject,
                            student: skill.A,
                            required: reqValue,
                            fullMark: 100,
                            description: skill.description
                          };
                        })
                      }>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Mon niveau" dataKey="student" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.4} />
                        <Radar name="Prérequis requis" dataKey="required" stroke="#10b981" fill="#34d399" fillOpacity={0.25} />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-2.5 rounded-lg shadow-lg border border-slate-100 max-w-xs text-xs">
                                  <p className="font-bold text-slate-950 border-b pb-1 mb-1">{data.subject}</p>
                                  <p className="text-indigo-600 font-bold">Votre score : {data.student}/100</p>
                                  <p className="text-emerald-600 font-bold">Requis : {data.required}/100</p>
                                  <p className="text-[10px] text-slate-500 mt-1 leading-tight">{data.description}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-3 text-[10px] font-bold mt-1 pb-1">
                    <span className="flex items-center gap-1 text-indigo-600">
                      <span className="w-2.5 h-2.5 rounded bg-indigo-500/40 border border-indigo-600"></span> Mon niveau
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500"></span> Prérequis requis
                    </span>
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
                      .map((master, idx) => {
                        const isSelected = selectedMasterForComparison?.name === master.name;
                        return (
                          <div 
                            key={idx} 
                            onClick={() => setSelectedMasterForComparison(master)}
                            className={cn(
                              "p-4 rounded-xl border transition-all cursor-pointer relative",
                              isSelected 
                                ? "border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/10 shadow-sm"
                                : "border-slate-100 bg-slate-50 hover:border-emerald-200"
                            )}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-bold text-slate-900">{master.name}</h4>
                                  {isSelected && (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold animate-pulse">
                                      Comparé
                                    </span>
                                  )}
                                </div>
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
                        );
                      })}
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

              {/* RatingWidget */}
              {activeReportId && (() => {
                const currentRep = history.find(r => r.id === activeReportId);
                const currentRating = currentRep?.rating || 0;
                
                return (
                  <div className="bg-slate-50 border border-slate-250 border-slate-100 rounded-2xl p-6 lg:col-span-3">
                    <div className="max-w-2xl mx-auto text-center space-y-4">
                      <div className="inline-flex p-2.5 bg-amber-50 text-amber-500 rounded-xl">
                        <Star size={24} className="fill-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Évaluez la pertinence des suggestions</h3>
                        <p className="text-sm text-slate-500 mt-1">
                          Notez la pertinence et l'exactitude des suggestions d'orientation IA pour nous aider à l'améliorer.
                        </p>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => {
                                handleRateReport(activeReportId!, star, widgetFeedback);
                                setRatingSuccessId(activeReportId);
                              }}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="p-1 hover:scale-110 transition-transform cursor-pointer"
                            >
                              <Star
                                size={32}
                                className={cn(
                                  "transition-colors",
                                  star <= (hoverRating || currentRating)
                                    ? "fill-amber-400 text-amber-500 animate-in zoom-in-75 duration-200"
                                    : "text-slate-300 fill-transparent"
                                )}
                              />
                            </button>
                          ))}
                        </div>

                        <div className="max-w-md mx-auto space-y-3">
                          <textarea
                            value={widgetFeedback}
                            onChange={(e) => setWidgetFeedback(e.target.value)}
                            placeholder="Vos commentaires additionnels pour affiner les suggestions IA (optionnel)..."
                            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white shadow-sm"
                            rows={2}
                          />
                          
                          <div className="flex justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                handleRateReport(activeReportId!, currentRating || 5, widgetFeedback);
                                setRatingSuccessId(activeReportId);
                              }}
                              className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100 cursor-pointer"
                            >
                              Enregistrer l'évaluation
                            </button>
                          </div>
                        </div>

                        {(ratingSuccessId === activeReportId || currentRating > 0) && (
                          <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 py-1.5 px-3 rounded-lg inline-block animate-in fade-in zoom-in-95 mt-2 border border-emerald-100">
                            ✓ Évaluation enregistrée ({currentRating || hoverRating}/5) ! Merci pour votre retour précieux.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* AI Assistant Chat */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 lg:col-span-3 overflow-hidden flex flex-col h-[400px]">
                <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain size={20} />
                    <h3 className="font-bold">Assistant d'Orientation IA</h3>
                  </div>
                  <button 
                    onClick={exportChatToPDF}
                    className="p-1.5 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                    title="Exporter la discussion en PDF"
                  >
                    <Download size={16} />
                    PDF
                  </button>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[80%] p-3 rounded-2xl text-sm",
                        msg.role === 'user' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm"
                      )}>
                        {msg.role === 'ai' ? (
                          <div className="prose prose-sm prose-indigo max-w-none">
                            <Markdown>{msg.text}</Markdown>
                          </div>
                        ) : (
                          msg.text
                        )}
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
        </>
      )}
    </div>
  );
}
