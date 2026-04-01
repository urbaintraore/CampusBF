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
    type: 'exam',
    downloadUrl: '',
    fileName: ''
  });

  useEffect(() => {
    if (document) {
      setFormData({
        title: document.title || '',
        subject: document.subject || '',
        university: document.university || '',
        type: document.type || 'exam',
        downloadUrl: document.downloadUrl || '',
        fileName: document.fileName || ''
      });
    } else {
      setFormData({
        title: '',
        subject: '',
        university: '',
        type: 'exam',
        downloadUrl: '',
        fileName: ''
      });
    }
  }, [document, isOpen]);

  const isFormValid = !!(formData.title?.trim() && formData.subject?.trim() && formData.university?.trim() && formData.downloadUrl?.trim());
  
  const isChanged = !document || (
    formData.title !== (document.title || '') ||
    formData.subject !== (document.subject || '') ||
    formData.university !== (document.university || '') ||
    formData.type !== (document.type || 'exam') ||
    formData.downloadUrl !== (document.downloadUrl || '')
  );

  const canSave = isFormValid && isChanged;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{document ? 'Modifier le document' : 'Ajouter un document'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Titre"
            className="w-full p-2 border rounded-lg"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <input
            type="text"
            placeholder="Sujet"
            className="w-full p-2 border rounded-lg"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          />
          <input
            type="text"
            placeholder="Université"
            className="w-full p-2 border rounded-lg"
            value={formData.university}
            onChange={(e) => setFormData({ ...formData, university: e.target.value })}
          />
          <select
            className="w-full p-2 border rounded-lg"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            <option value="exam">Examen</option>
            <option value="exercise">Exercice</option>
            <option value="summary">Résumé</option>
            <option value="thesis">Thèse</option>
          </select>
          <input
            type="text"
            placeholder="URL de téléchargement"
            className="w-full p-2 border rounded-lg"
            value={formData.downloadUrl}
            onChange={(e) => setFormData({ ...formData, downloadUrl: e.target.value })}
          />
          <button
            onClick={() => onSave(formData)}
            disabled={!canSave}
            className={`w-full py-2 rounded-lg font-bold transition-colors ${
              canSave 
                ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
