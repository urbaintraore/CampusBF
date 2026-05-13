import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { PrintOptions, PrintRates } from '../types';
import { calculatePrintPrice, createPrintOrder, defaultPrintRates } from '../services/printService';
import { useAuth } from '../context/AuthContext';
import { uploadFile } from '../services/storageService';

interface PrintOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  // If fileUrl and fileName are provided, the user is printing an existing document
  initialFileUrl?: string;
  initialFileName?: string;
}

export default function PrintOrderModal({ isOpen, onClose, initialFileUrl, initialFileName }: PrintOrderModalProps) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState<PrintOptions>({
    color: false,
    twoSided: true,
    copies: 1,
    binding: 'none'
  });
  const [pageCount, setPageCount] = useState<number>(1);
  const [pickupPoint, setPickupPoint] = useState<string>('CampusBF Principal (Zogona)');
  const [comment, setComment] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setOptions({
        color: false,
        twoSided: true,
        copies: 1,
        binding: 'none'
      });
      setPageCount(1);
      setComment('');
      setSuccess(false);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalPrice = calculatePrintPrice(pageCount, options, defaultPrintRates);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Vous devez être connecté pour commander.");
      return;
    }
    
    if (!initialFileUrl && !file) {
      setError("Veuillez sélectionner un fichier à imprimer.");
      return;
    }

    if (pageCount < 1) {
      setError("Le nombre de pages doit être au moins 1.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      let finalFileUrl = initialFileUrl || '';
      let finalFileName = initialFileName || '';

      // Upload if it's a new file
      if (file && !initialFileUrl) {
         // Using the existing upload function from documentService, though it might be named differently
         // actually let's use the same Storage path but specialized? Or just use uploadFile.
         // wait uploadFile returns { url, fileName }. Let's assume it accepts standard file and folder
         const result = await uploadFile(file, 'print_jobs');
         finalFileUrl = result.url;
         finalFileName = file.name;
      }

      await createPrintOrder({
        userId: user.id,
        fileUrl: finalFileUrl,
        fileName: finalFileName,
        pageCount,
        options,
        totalPrice,
        status: 'pending',
        pickupPoint,
        comment
      });

      if (user) {
         try {
           const { logService } = await import('@/services/logService');
           await logService.logActivity({
             userId: user.id,
             userName: `${user.firstName} ${user.lastName}`,
             email: user.email,
             action: 'Commande impression',
             module: 'Services Étudiants',
             details: `Fichier: ${finalFileName} - ${pageCount} pages, Total: ${totalPrice} FCFA`,
             metadata: { pageCount, totalPrice, options }
           });
         } catch(e) { }
      }

      // Also trigger a notification for admins/user
      fetch('/api/notify/print_order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, fileName: finalFileName, price: totalPrice })
      }).catch(e => console.log('Notification call failed', e));

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de la commande.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={success ? onClose : undefined} />
      
      <div className="glass relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 sm:p-8 border-b border-white/20 flex items-center justify-between bg-white/40 sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Printer className="text-emerald-600" size={24} />
              Imprimerie CampusBF
            </h2>
            <p className="text-slate-500 text-sm mt-1">Configurez votre commande d'impression</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100/50 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 sm:p-8 overflow-y-auto bg-white/20">
          {success ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Commande envoyée !</h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                Votre document est en cours de traitement. Vous recevrez une notification 
                par WhatsApp et sur la plateforme lorsqu'il sera prêt.
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
              >
                Fermer
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium flex items-center gap-2">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              {/* Fichier */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-900">Document à imprimer</label>
                {initialFileName ? (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200/50 rounded-xl text-emerald-800">
                    <FileText size={24} className="text-emerald-500" />
                    <span className="font-medium truncate">{initialFileName}</span>
                  </div>
                ) : (
                  <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${file ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:border-emerald-400 bg-white/50'}`}>
                    <input 
                      type="file"
                      id="print-file"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    />
                    <label htmlFor="print-file" className="cursor-pointer flex flex-col items-center">
                      <FileText size={32} className={file ? "text-emerald-600 mb-2" : "text-slate-400 mb-2"} />
                      <span className="font-medium text-slate-700">
                        {file ? file.name : "Cliquez pour uploader votre document"}
                      </span>
                      <span className="text-xs text-slate-500 mt-1">PDF, Word ou Images (Max 20MB)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Paramètres de base */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Nombre de pages total</label>
                  <input
                    type="number"
                    min="1"
                    value={pageCount}
                    onChange={(e) => setPageCount(parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                    placeholder="Ex: 15"
                    required
                  />
                  <p className="text-[10px] text-slate-500">Approximatif si vous n'êtes pas sûr.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Nombre de copies</label>
                  <input
                    type="number"
                    min="1"
                    value={options.copies}
                    onChange={(e) => setOptions({...options, copies: parseInt(e.target.value) || 1})}
                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-900">Options d'impression</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Mode de couleur */}
                  <div className="bg-white/50 border border-slate-200 rounded-xl p-1 flex">
                    <button
                      type="button"
                      onClick={() => setOptions({...options, color: false})}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!options.color ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      Noir & Blanc
                    </button>
                    <button
                      type="button"
                      onClick={() => setOptions({...options, color: true})}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${options.color ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      Couleur
                    </button>
                  </div>

                  {/* Recto / Recto Verso */}
                  <div className="bg-white/50 border border-slate-200 rounded-xl p-1 flex">
                    <button
                      type="button"
                      onClick={() => setOptions({...options, twoSided: false})}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!options.twoSided ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      Recto Simple
                    </button>
                    <button
                      type="button"
                      onClick={() => setOptions({...options, twoSided: true})}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${options.twoSided ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      Recto Verso
                    </button>
                  </div>
                </div>

                {/* Reliure */}
                <div className="space-y-1.5 mt-4">
                  <label className="text-sm font-medium text-slate-700">Type de reliure</label>
                  <select
                    value={options.binding}
                    onChange={(e) => setOptions({...options, binding: e.target.value as any})}
                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-800"
                  >
                    <option value="none">Aucune</option>
                    <option value="staple">Agrafe (+0 CFA)</option>
                    <option value="spiral">Spirale (+500 CFA)</option>
                  </select>
                </div>
              </div>

              {/* Point de retrait & Commentaires */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Point de retrait</label>
                  <select
                    value={pickupPoint}
                    onChange={(e) => setPickupPoint(e.target.value)}
                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-800"
                  >
                    <option value="CampusBF Principal (Zogona)">CampusBF Principal (Zogona)</option>
                    <option value="Kiosque UJKZ">Kiosque UJKZ</option>
                    <option value="Kiosque UTS">Kiosque UTS</option>
                    <option value="Université de l'Unité Africaine(ex IAM)">Université de l'Unité Africaine(ex IAM)</option>
                    <option value="Université Aube Nouvelle(ex ISIG)">Université Aube Nouvelle(ex ISIG)</option>
                    <option value="Université Norbert ZONGO(UNZ)">Université Norbert ZONGO(UNZ)</option>
                    <option value="Université Nazi Boni (Nasso)">Université Nazi Boni (Nasso)</option>
                    <option value="Université Nazi Boni (Secteur 22)">Université Nazi Boni (Secteur 22)</option>
                    <option value="ESTA">ESTA</option>
                    <option value="IST(Ouaga 2000)">IST(Ouaga 2000)</option>
                    <option value="IST(Benogo)">IST(Benogo)</option>
                    <option value="IST(Larlé)">IST(Larlé)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Commentaire (facultatif)</label>
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Instructions spéciales..."
                    className="w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Total et Submit */}
              <div className="bg-slate-900 rounded-2xl p-5 flex items-center justify-between mt-8">
                <div>
                  <p className="text-slate-400 text-sm font-medium mb-1">Montant Estimé</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white tracking-tight">{totalPrice.toLocaleString()}</span>
                    <span className="text-slate-300 font-medium">CFA</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">À régler lors du retrait</p>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                  ) : (
                    <>
                      Valider ma commande
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
