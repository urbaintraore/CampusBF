import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Quiz, QuizQuestion } from '@/types';
import { X, Plus, Trash2, Save, ArrowRight } from 'lucide-react';

interface QuizCreatorProps {
  onClose: () => void;
}

export const QuizCreator: React.FC<QuizCreatorProps> = ({ onClose }) => {
  const { user, addQuiz } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('Licence 1');
  const [questions, setQuestions] = useState<Omit<QuizQuestion, 'id'>[]>([
    { 
      type: 'multiple_choice',
      question: '', 
      options: ['', '', '', ''], 
      pointsPerOption: [0, 0, 0, 0], 
      explanation: '',
      matchingPairs: [],
      correctTextAnswer: '',
      correctNumericAnswer: 0,
      tolerance: 0
    }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddQuestion = () => {
    setQuestions([...questions, { 
      type: 'multiple_choice',
      question: '', 
      options: ['', '', '', ''], 
      pointsPerOption: [0, 0, 0, 0], 
      explanation: '',
      matchingPairs: [],
      correctTextAnswer: '',
      correctNumericAnswer: 0,
      tolerance: 0
    }]);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: keyof QuizQuestion, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[optIndex] = value;
    setQuestions(newQuestions);
  };

  const handlePointsChange = (qIndex: number, optIndex: number, value: number) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].pointsPerOption[optIndex] = value;
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation
    if (!title || !subject || questions.length === 0) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    for (const q of questions) {
      if (!q.question && q.type !== 'description') {
        alert('Toutes les questions doivent avoir une consigne.');
        return;
      }
      if (q.type === 'multiple_choice' && q.options.some(opt => !opt)) {
        alert('Toutes les options du QCM doivent être remplies.');
        return;
      }
      if (q.type === 'matching' && (q.matchingPairs || []).length === 0) {
        alert('Veuillez ajouter au moins une paire pour l\'appariement.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const newQuiz: Omit<Quiz, 'id' | 'createdAt'> = {
        title,
        description,
        subject,
        level,
        creatorId: user.id,
        creatorName: `${user.firstName} ${user.lastName}`,
        type: 'teacher',
        questions: questions.map((q, i) => ({ ...q, id: `q-${Date.now()}-${i}` }))
      };

      await addQuiz(newQuiz);
      alert('Quiz créé avec succès !');
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la création du quiz.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
      <div className="bg-slate-50 border-b border-slate-200 p-6 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Créer un Quiz</h2>
          <p className="text-slate-500 text-sm mt-1">Ajoutez vos questions pour tester vos étudiants.</p>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        {/* Informations générales */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Informations générales</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Titre du Quiz *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: QCM Biologie Cellulaire"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Matière *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Biologie"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Niveau *</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              >
                <option value="Lycée">Lycée</option>
                <option value="Licence 1">Licence 1</option>
                <option value="Licence 2">Licence 2</option>
                <option value="Licence 3">Licence 3</option>
                <option value="Master 1">Master 1</option>
                <option value="Master 2">Master 2</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Révision pour le partiel du semestre 1"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-lg font-bold text-slate-900">Questions</h3>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <Plus size={16} /> Ajouter une question
            </button>
          </div>

          {questions.map((q, qIndex) => (
            <div key={qIndex} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 relative">
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(qIndex)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Type de question *</label>
                  <select
                    value={q.type}
                    onChange={(e) => handleQuestionChange(qIndex, 'type', e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
                  >
                    <option value="multiple_choice">Choix multiples (QCM)</option>
                    <option value="true_false">Vrai/Faux</option>
                    <option value="short_answer">Réponse courte</option>
                    <option value="numerical">Numérique</option>
                    <option value="matching">Appariement (Matching)</option>
                    <option value="cloze">Texte à trous (Cloze)</option>
                    <option value="essay">Essai / Composition</option>
                    <option value="description">Description (Consigne)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Question / Consigne {qIndex + 1} *</label>
                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                    placeholder="Posez votre question ici..."
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Dynamic fields based on type */}
              {q.type === 'cloze' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Modèle de texte (Utilisez [[gap1]], [[gap2]]...)</label>
                    <textarea
                      value={q.clozeTemplate}
                      onChange={(e) => handleQuestionChange(qIndex, 'clozeTemplate', e.target.value)}
                      placeholder="Ex: La [[gap1]] est la capitale de la France."
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700">Réponses pour chaque trou</label>
                    {q.clozeTemplate?.match(/\[\[(gap\d+)\]\]/g)?.map((match) => {
                      const gapId = match.replace('[[', '').replace(']]', '');
                      return (
                        <div key={gapId} className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-500 w-16">{gapId}:</span>
                          <input
                            type="text"
                            value={(q.clozeAnswers?.[gapId] as string) || ''}
                            onChange={(e) => {
                              const newAnswers = { ...(q.clozeAnswers || {}), [gapId]: e.target.value };
                              handleQuestionChange(qIndex, 'clozeAnswers', newAnswers);
                            }}
                            placeholder="Réponse correcte"
                            className="flex-1 p-2 bg-white border border-slate-200 rounded-xl outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {q.type === 'multiple_choice' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-700">Options de réponse et points attribués *</label>
                    <span className="text-xs text-slate-500">Attribuez des points (ex: 1 pour la bonne)</span>
                  </div>
                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-3">
                      <input
                        type="number"
                        value={q.pointsPerOption[optIndex]}
                        onChange={(e) => handlePointsChange(qIndex, optIndex, Number(e.target.value))}
                        className="w-20 p-3 bg-white border border-slate-200 rounded-xl text-center font-bold text-emerald-600"
                        placeholder="0"
                        min="0"
                        step="0.25"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                        placeholder={`Option ${optIndex + 1}`}
                        className="flex-1 p-3 bg-white border border-slate-200 rounded-xl outline-none"
                        required
                      />
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => {
                      const newQuestions = [...questions];
                      newQuestions[qIndex].options.push('');
                      newQuestions[qIndex].pointsPerOption.push(0);
                      setQuestions(newQuestions);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus size={14} /> Ajouter une option
                  </button>
                </div>
              )}

              {q.type === 'true_false' && (
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Vrai ou Faux ?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-xl border border-slate-200 flex-1">
                      <input 
                        type="radio" 
                        name={`tf-${qIndex}`} 
                        checked={q.correctAnswerIndex === 0} 
                        onChange={() => handleQuestionChange(qIndex, 'correctAnswerIndex', 0)}
                      />
                      <span className="font-bold text-slate-900">Vrai</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-white p-3 rounded-xl border border-slate-200 flex-1">
                      <input 
                        type="radio" 
                        name={`tf-${qIndex}`} 
                        checked={q.correctAnswerIndex === 1} 
                        onChange={() => handleQuestionChange(qIndex, 'correctAnswerIndex', 1)}
                      />
                      <span className="font-bold text-slate-900">Faux</span>
                    </label>
                  </div>
                </div>
              )}

              {q.type === 'short_answer' && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Réponse attendue *</label>
                  <input
                    type="text"
                    value={q.correctTextAnswer}
                    onChange={(e) => handleQuestionChange(qIndex, 'correctTextAnswer', e.target.value)}
                    placeholder="Le mot ou la phrase exacte..."
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
              )}

              {q.type === 'numerical' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Valeur numérique *</label>
                    <input
                      type="number"
                      value={q.correctNumericAnswer}
                      onChange={(e) => handleQuestionChange(qIndex, 'correctNumericAnswer', Number(e.target.value))}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Marge d'erreur (Tolérance)</label>
                    <input
                      type="number"
                      value={q.tolerance}
                      onChange={(e) => handleQuestionChange(qIndex, 'tolerance', Number(e.target.value))}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none"
                    />
                  </div>
                </div>
              )}

              {q.type === 'matching' && (
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Paires d'appariement *</label>
                  {(q.matchingPairs || []).map((pair, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={pair.left}
                        onChange={(e) => {
                          const newPairs = [...(q.matchingPairs || [])];
                          newPairs[pIdx].left = e.target.value;
                          handleQuestionChange(qIndex, 'matchingPairs', newPairs);
                        }}
                        placeholder="Côté gauche"
                        className="flex-1 p-2 bg-white border border-slate-200 rounded-lg outline-none"
                      />
                      <ArrowRight size={16} className="text-slate-400" />
                      <input
                        type="text"
                        value={pair.right}
                        onChange={(e) => {
                          const newPairs = [...(q.matchingPairs || [])];
                          newPairs[pIdx].right = e.target.value;
                          handleQuestionChange(qIndex, 'matchingPairs', newPairs);
                        }}
                        placeholder="Côté droit"
                        className="flex-1 p-2 bg-white border border-slate-200 rounded-lg outline-none"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const newPairs = (q.matchingPairs || []).filter((_, i) => i !== pIdx);
                          handleQuestionChange(qIndex, 'matchingPairs', newPairs);
                        }}
                        className="text-red-500 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button"
                    onClick={() => {
                      const newPairs = [...(q.matchingPairs || []), { left: '', right: '' }];
                      handleQuestionChange(qIndex, 'matchingPairs', newPairs);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus size={14} /> Ajouter une paire
                  </button>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <label className="text-sm font-bold text-slate-700">Explication (Optionnel)</label>
                <textarea
                  value={q.explanation}
                  onChange={(e) => handleQuestionChange(qIndex, 'explanation', e.target.value)}
                  placeholder="Expliquez pourquoi cette réponse est correcte..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none min-h-[80px]"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={20} />
            )}
            Enregistrer le Quiz
          </button>
        </div>
      </form>
    </div>
  );
};
