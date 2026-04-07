import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  document?: any;
}

export function DocumentModal({ isOpen, onClose, onSave, document }: DocumentModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    university: '',
    ufr: '',
    department: '',
    major: '',
    year: '',
    type: 'exam',
    downloadUrl: '',
    fileName: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (document && isOpen) {
      setFormData({
        title: document.title || '',
        subject: document.subject || '',
        university: document.university || '',
        ufr: document.ufr || '',
        department: document.department || '',
        major: document.major || '',
        year: document.year || '',
        type: document.type || 'exam',
        downloadUrl: document.downloadUrl || '',
        fileName: document.fileName || ''
      });
    } else if (isOpen) {
      setFormData({
        title: '',
        subject: '',
        university: '',
        ufr: '',
        department: '',
        major: '',
        year: '',
        type: 'exam',
        downloadUrl: '',
        fileName: ''
      });
    }
  }, [document, isOpen]);

  const isFormValid = !!formData.title?.trim() && !!formData.downloadUrl?.trim();
  
  if (!isOpen) return null;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!formData.title?.trim()) {
      setError("Le titre est obligatoire.");
      return;
    }
    if (!formData.downloadUrl?.trim()) {
      setError("L'URL du fichier est obligatoire.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      console.error("Error saving document:", err);
      setError(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{document ? 'Modifier le document' : 'Ajouter un document'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" disabled={loading}>
            <X size={20} />
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Titre <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="Titre du document"
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Sujet / Matière</label>
              <input
                type="text"
                placeholder="Ex: Algèbre"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
              <select
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                disabled={loading}
              >
                <option value="exam">Examen</option>
                <option value="exercise">Exercice</option>
                <option value="summary">Résumé</option>
                <option value="Mémoire">Mémoire</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Université / Établissement</label>
            <input
              type="text"
              placeholder="Nom de l'université"
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              value={formData.university}
              onChange={(e) => setFormData({ ...formData, university: e.target.value })}
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">UFR / Institut</label>
              <input
                type="text"
                placeholder="Ex: UFR/SEA"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.ufr}
                onChange={(e) => setFormData({ ...formData, ufr: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Département / Filière</label>
              <input
                type="text"
                placeholder="Ex: Informatique"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Année</label>
              <input
                type="text"
                placeholder="Ex: 2024"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">URL du fichier <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Lien de téléchargement"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.downloadUrl}
                onChange={(e) => setFormData({ ...formData, downloadUrl: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enregistrement...
              </>
            ) : (
              document ? 'Enregistrer les modifications' : 'Ajouter le document'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
