import React, { useState, useEffect } from 'react';
import { Calculator, Plus, Trash2, Save, Download, Sparkles, CheckCircle2, AlertCircle, RefreshCw, X, Award, GraduationCap, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export interface SubjectGrade {
  id: string;
  name: string;
  grade: number | string; // Note sur 20
  credits: number | string; // Crédits ou coefficient
}

export interface SemesterData {
  semesterName: string; // Ex: Semestre 1, Semestre 2
  subjects: SubjectGrade[];
}

const DEFAULT_SUBJECTS: SubjectGrade[] = [
  { id: '1', name: 'Algorithmique & Programmation', grade: 14, credits: 5 },
  { id: '2', name: 'Bases de Données Relationnelles', grade: 15.5, credits: 4 },
  { id: '3', name: 'Architecture des Ordinateurs', grade: 12, credits: 3 },
  { id: '4', name: 'Mathématiques pour l\'Informatique', grade: 10, credits: 4 },
  { id: '5', name: 'Anglais Général & Technique', grade: 16, credits: 2 },
  { id: '6', name: 'Droit du Numérique & Déontologie', grade: 13, credits: 2 }
];

interface SemesterGpaCalculatorProps {
  onClose?: () => void;
}

export const SemesterGpaCalculator: React.FC<SemesterGpaCalculatorProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [selectedSemester, setSelectedSemester] = useState('Semestre 1');
  const [subjects, setSubjects] = useState<SubjectGrade[]>(DEFAULT_SUBJECTS);
  const [savedSemesters, setSavedSemesters] = useState<Record<string, SubjectGrade[]>>({});

  useEffect(() => {
    // Load stored grades from localStorage
    const stored = localStorage.getItem('campusbf_gpa_data');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSavedSemesters(parsed);
        if (parsed['Semestre 1'] && parsed['Semestre 1'].length > 0) {
          setSubjects(parsed['Semestre 1']);
        }
      } catch (e) {
        console.warn("Could not parse saved GPA data:", e);
      }
    }
  }, []);

  const handleSubjectChange = (id: string, field: keyof SubjectGrade, value: string | number) => {
    setSubjects(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const handleAddSubject = () => {
    const newSub: SubjectGrade = {
      id: Date.now().toString(),
      name: `Matière ${subjects.length + 1}`,
      grade: '',
      credits: 3
    };
    setSubjects(prev => [...prev, newSub]);
  };

  const handleRemoveSubject = (id: string) => {
    if (subjects.length <= 1) {
      alert("Il faut conserver au moins une matière dans le tableau.");
      return;
    }
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  const handleSwitchSemester = (sem: string) => {
    // Save current semester before switching
    const updated = { ...savedSemesters, [selectedSemester]: subjects };
    setSavedSemesters(updated);
    localStorage.setItem('campusbf_gpa_data', JSON.stringify(updated));

    setSelectedSemester(sem);
    if (updated[sem] && updated[sem].length > 0) {
      setSubjects(updated[sem]);
    } else {
      setSubjects(DEFAULT_SUBJECTS);
    }
  };

  const handleSaveData = () => {
    const updated = { ...savedSemesters, [selectedSemester]: subjects };
    setSavedSemesters(updated);
    localStorage.setItem('campusbf_gpa_data', JSON.stringify(updated));
    alert(`Les notes du ${selectedSemester} ont été sauvegardées avec succès !`);
  };

  const handleResetData = () => {
    if (confirm("Voulez-vous réinitialiser le calculateur avec les matières par défaut ?")) {
      setSubjects(DEFAULT_SUBJECTS);
    }
  };

  // Calculations
  const validSubjects = subjects.map(s => ({
    grade: typeof s.grade === 'string' ? parseFloat(s.grade) || 0 : s.grade,
    credits: typeof s.credits === 'string' ? parseFloat(s.credits) || 0 : s.credits
  }));

  const totalCredits = validSubjects.reduce((acc, curr) => acc + (curr.credits > 0 ? curr.credits : 0), 0);
  const totalPoints = validSubjects.reduce((acc, curr) => acc + (curr.grade * curr.credits), 0);
  const average = totalCredits > 0 ? (totalPoints / totalCredits) : 0;
  
  const validatedCredits = validSubjects.reduce((acc, curr) => {
    if (curr.grade >= 10 || average >= 10) {
      return acc + curr.credits;
    }
    return acc;
  }, 0);

  const getMention = (avg: number) => {
    if (avg >= 16) return { label: 'Très Bien', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (avg >= 14) return { label: 'Bien', color: 'bg-teal-100 text-teal-800 border-teal-300' };
    if (avg >= 12) return { label: 'Assez Bien', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (avg >= 10) return { label: 'Passable', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { label: 'Ajourné / Rattrapage', color: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  const mention = getMention(average);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-slate-800 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Calculator size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Calculateur de Moyenne Semestrielle</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Système LMD & Universités du Burkina Faso</p>
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Semester Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {['Semestre 1', 'Semestre 2', 'Semestre 3', 'Semestre 4', 'Semestre 5', 'Semestre 6'].map((sem) => (
          <button
            key={sem}
            onClick={() => handleSwitchSemester(sem)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
              selectedSemester === sem
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            <GraduationCap size={14} />
            {sem}
          </button>
        ))}
      </div>

      {/* Result Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Average Card */}
        <div className="p-5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-2 right-2 p-2 bg-white/10 rounded-xl backdrop-blur-md">
            <Award size={20} className="text-emerald-200" />
          </div>
          <span className="text-xs text-emerald-100 font-semibold uppercase tracking-wider">Moyenne {selectedSemester}</span>
          <div className="my-2">
            <span className="text-3xl sm:text-4xl font-extrabold">{average.toFixed(2)}</span>
            <span className="text-lg font-medium text-emerald-200"> / 20</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border", mention.color)}>
              {mention.label}
            </span>
          </div>
        </div>

        {/* Credits Card */}
        <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Crédits / Coefficients</span>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{validatedCredits}</span>
            <span className="text-sm font-bold text-slate-400"> / {totalCredits} validés</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {validatedCredits === totalCredits ? 'Tous les crédits du semestre sont validés 🎉' : `${totalCredits - validatedCredits} crédits non validés`}
          </p>
        </div>

        {/* Status Card */}
        <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Décision du Jury</span>
          <div className="my-2 flex items-center gap-2">
            {average >= 10 ? (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                <CheckCircle2 size={24} />
                <span>Semestre Admis</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-lg">
                <AlertCircle size={24} />
                <span>Session de Rattrapage</span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {average >= 10 ? "Félicitations ! Tu as validé ton semestre." : "Révise bien les UE compensables pour valider le semestre."}
          </p>
        </div>
      </div>

      {/* Table of Subjects */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Détails des Unités d'Enseignement (UE)</h3>
          <button 
            onClick={handleAddSubject}
            className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold hover:bg-emerald-100 flex items-center gap-1.5 transition-all"
          >
            <Plus size={14} /> Ajouter une matière
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">Matière / UE</th>
                <th className="p-3 w-28 text-center">Note (/20)</th>
                <th className="p-3 w-28 text-center">Crédit/Coeff</th>
                <th className="p-3 w-28 text-center">Total Points</th>
                <th className="p-3 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {subjects.map((sub, idx) => {
                const gr = typeof sub.grade === 'string' ? parseFloat(sub.grade) || 0 : sub.grade;
                const cr = typeof sub.credits === 'string' ? parseFloat(sub.credits) || 0 : sub.credits;
                const points = gr * cr;
                const isValidated = gr >= 10 || average >= 10;

                return (
                  <tr key={sub.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-2.5">
                      <input 
                        type="text" 
                        value={sub.name}
                        onChange={(e) => handleSubjectChange(sub.id, 'name', e.target.value)}
                        className="w-full p-2 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-emerald-500 rounded-lg outline-none font-medium dark:text-slate-100"
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <input 
                        type="number" 
                        min="0"
                        max="20"
                        step="0.25"
                        placeholder="0.00"
                        value={sub.grade}
                        onChange={(e) => handleSubjectChange(sub.id, 'grade', e.target.value)}
                        className={cn(
                          "w-20 p-2 text-center font-bold rounded-lg border outline-none transition-all dark:bg-slate-900",
                          gr >= 10 ? "border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:text-emerald-300" : "border-rose-200 bg-rose-50/50 text-rose-800 dark:text-rose-300"
                        )}
                      />
                    </td>
                    <td className="p-2.5 text-center">
                      <input 
                        type="number" 
                        min="1"
                        max="20"
                        placeholder="1"
                        value={sub.credits}
                        onChange={(e) => handleSubjectChange(sub.id, 'credits', e.target.value)}
                        className="w-16 p-2 text-center font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none dark:text-slate-100"
                      />
                    </td>
                    <td className="p-2.5 text-center font-bold text-slate-700 dark:text-slate-300">
                      {points.toFixed(1)}
                    </td>
                    <td className="p-2.5 text-center">
                      <button 
                        onClick={() => handleRemoveSubject(sub.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button 
          onClick={handleResetData}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 flex items-center gap-1.5 transition-all"
        >
          <RefreshCw size={14} /> Réinitialiser
        </button>

        <button 
          onClick={handleSaveData}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
        >
          <Save size={16} />
          Sauvegarder mes notes ({selectedSemester})
        </button>
      </div>
    </div>
  );
};
