import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Upload, Loader2, CheckCircle, FileText, GraduationCap, Award } from 'lucide-react';

export default function TeacherOnboarding() {
  const { submitTeacherApplication } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    cvUrl: '',
    diplomaUrl: '',
    rankProofUrl: '',
    biography: '',
    specialties: '',
    domains: '',
    courses: '',
    academicRank: 'Assistant' as 'Assistant' | 'Maître Assistant' | 'Maître de Conférences' | 'Professeur Titulaire' | 'Autre'
  });

  const [fileNames, setFileNames] = useState({
    cvUrl: '',
    diplomaUrl: '',
    rankProofUrl: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof fileNames) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileNames({ ...fileNames, [field]: file.name });
      // In a real app, you would upload the file to a server here and get a URL back.
      // For this demo, we'll just use a fake URL or a local object URL.
      setFormData({ ...formData, [field]: URL.createObjectURL(file) });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate upload delay
    setTimeout(() => {
      submitTeacherApplication({
        cvUrl: formData.cvUrl || 'https://example.com/cv.pdf',
        diplomaUrl: formData.diplomaUrl || 'https://example.com/diploma.pdf',
        rankProofUrl: formData.rankProofUrl || 'https://example.com/rank.pdf',
        biography: formData.biography,
        specialties: formData.specialties.split(',').map(s => s.trim()),
        domains: formData.domains.split(',').map(d => d.trim()),
        courses: formData.courses.split(',').map(c => c.trim()),
        academicRank: formData.academicRank
      });
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Complétez votre profil Enseignant</h1>
          <p className="text-gray-500 mt-2">
            Pour rejoindre l'Annuaire des Enseignants, veuillez soumettre votre dossier académique.
            Il sera examiné par notre équipe d'administration.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Documents Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="text-emerald-600" size={20} />
              Documents Requis
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors cursor-pointer bg-gray-50 flex flex-col items-center justify-center">
                <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                <p className="text-sm font-medium text-gray-700">CV Actualisé</p>
                <p className="text-xs text-gray-500 mt-1 mb-2">PDF (Max 5MB)</p>
                {fileNames.cvUrl && <p className="text-xs text-emerald-600 font-medium truncate w-full px-2">{fileNames.cvUrl}</p>}
                <input type="file" className="hidden" accept=".pdf" onChange={(e) => handleFileChange(e, 'cvUrl')} />
              </label>
              <label className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors cursor-pointer bg-gray-50 flex flex-col items-center justify-center">
                <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                <p className="text-sm font-medium text-gray-700">Diplôme le plus élevé</p>
                <p className="text-xs text-gray-500 mt-1 mb-2">PDF, JPG (Max 5MB)</p>
                {fileNames.diplomaUrl && <p className="text-xs text-emerald-600 font-medium truncate w-full px-2">{fileNames.diplomaUrl}</p>}
                <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={(e) => handleFileChange(e, 'diplomaUrl')} />
              </label>
              <label className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors cursor-pointer bg-gray-50 flex flex-col items-center justify-center">
                <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                <p className="text-sm font-medium text-gray-700">Preuve du Grade</p>
                <p className="text-xs text-gray-500 mt-1 mb-2">Arrêté, Attestation...</p>
                {fileNames.rankProofUrl && <p className="text-xs text-emerald-600 font-medium truncate w-full px-2">{fileNames.rankProofUrl}</p>}
                <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={(e) => handleFileChange(e, 'rankProofUrl')} />
              </label>
            </div>
            <p className="text-xs text-gray-500 italic">* Les fichiers sélectionnés seront envoyés avec votre dossier.</p>
          </div>

          {/* Academic Profile Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Award className="text-emerald-600" size={20} />
              Profil Académique
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Grade Académique</label>
                <select 
                  name="academicRank"
                  required
                  value={formData.academicRank}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                >
                  <option value="Assistant">Assistant</option>
                  <option value="Maître Assistant">Maître Assistant</option>
                  <option value="Maître de Conférences">Maître de Conférences</option>
                  <option value="Professeur Titulaire">Professeur Titulaire</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Domaines d'expertise (séparés par des virgules)</label>
                <input 
                  type="text" 
                  name="domains"
                  required
                  value={formData.domains}
                  onChange={handleChange}
                  placeholder="Ex: Informatique, Intelligence Artificielle"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Spécialités (séparées par des virgules)</label>
                <input 
                  type="text" 
                  name="specialties"
                  required
                  value={formData.specialties}
                  onChange={handleChange}
                  placeholder="Ex: Machine Learning, Data Science"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Matières enseignées (séparées par des virgules)</label>
                <input 
                  type="text" 
                  name="courses"
                  required
                  value={formData.courses}
                  onChange={handleChange}
                  placeholder="Ex: Algorithmique, Bases de données"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Biographie courte</label>
              <textarea 
                name="biography"
                required
                value={formData.biography}
                onChange={handleChange}
                rows={4}
                placeholder="Présentez brièvement votre parcours académique et professionnel..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
              ></textarea>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : (
              <>
                <CheckCircle size={20} />
                Soumettre mon dossier
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
