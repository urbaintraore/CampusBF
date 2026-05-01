import React, { useRef } from 'react';
import { 
  BookOpen, 
  FileText, 
  ShoppingBag, 
  Users, 
  GraduationCap, 
  Search, 
  MapPin, 
  Smartphone, 
  TrendingUp, 
  DollarSign, 
  ShieldCheck,
  Bike,
  Home,
  Star,
  Download,
  Phone,
  Mail
} from 'lucide-react';
import { motion } from 'motion/react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';

const UserGuide = () => {
  const guideRef = useRef<HTMLDivElement>(null);

  const downloadPDF = async () => {
    if (!guideRef.current) return;
    
    const tId = toast.loading('Génération du PDF...');
    try {
      const canvas = await html2canvas(guideRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: guideRef.current.scrollWidth,
        windowHeight: guideRef.current.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('Guide_Utilisateur_CampusBF.pdf');
      toast.success('Le guide a été téléchargé avec succès !', { id: tId });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF.', { id: tId });
    }
  };

  const categories = [
    {
      title: "Réussite Académique",
      icon: <GraduationCap className="text-emerald-600" />,
      features: [
        {
          name: "Documents Académiques",
          desc: "Accédez à une bibliothèque partagée de cours, TD, et anciens sujets d'examens classés par université et filière.",
          how: "Allez dans 'Documents', utilisez les filtres pour trouver votre université, et téléchargez ou lisez en ligne.",
          academicBenefit: "Accès immédiat à des ressources de qualité provenant d'autres étudiants ayant déjà validé l'unité d'enseignement.",
          financialBenefit: "Économie massive sur les frais de photocopies et l'achat de livres coûteux."
        },
        {
          name: "Préparation Concours",
          desc: "S'entraîner aux concours de la fonction publique (ENA, ENS, etc.) avec des quiz interactifs.",
          how: "Section 'Concours Fonction Publique'. Choisissez une catégorie et commencez le test chronométré.",
          academicBenefit: "Maîtrise de la culture générale et des tests de niveau requis par l'État.",
          financialBenefit: "Réduction des frais de cours de préparation privés souvent hors de prix."
        }
      ]
    },
    {
      title: "Services & Entraide",
      icon: <Users className="text-emerald-600" />,
      features: [
        {
          name: "Tutorat & Enseignants",
          desc: "Mise en relation avec des étudiants mentors ou des professeurs pour des cours de soutien.",
          how: "Consultez l'annuaire 'Tuteurs' ou 'Enseignants' et contactez-les directement via WhatsApp ou message.",
          academicBenefit: "Soutien personnalisé pour les matières difficiles et remédiation rapide.",
          financialBenefit: "Tarifs préférentiels 'étudiants' et possibilité pour les bons étudiants de gagner de l'argent en devenant tuteurs."
        },
        {
          name: "MotoRide (Covoiturage)",
          desc: "Service de transport partagé entre étudiants pour se rendre sur le campus.",
          how: "Utilisez 'MotoRide' pour voir les trajets disponibles ou proposez le vôtre pour partager les frais.",
          academicBenefit: "Moins de fatigue liée aux transports en commun, permet d'arriver à l'heure aux cours.",
          financialBenefit: "Division par deux des frais de carburant pour les conducteurs et trajets moins chers que les taxis pour les passagers."
        }
      ]
    },
    {
      title: "Vie Etudiante & Logement",
      icon: <Home className="text-emerald-600" />,
      features: [
        {
          name: "Colocation",
          desc: "Recherche de colocataires ou de chambres libres à proximité des universités.",
          how: "Postez une annonce dans 'Colocation' ou répondez à une demande existante.",
          academicBenefit: "Vivre dans un environnement calme avec d'autres étudiants facilite l'étude en groupe.",
          financialBenefit: "Partage du loyer, de l'eau et de l'électricité, rendant le logement abordable."
        },
        {
          name: "Marketplace",
          desc: "Vente et achat de matériel (ordinateurs, vélos, fournitures) entre étudiants.",
          how: "Accédez à 'Marketplace', publiez vos articles avec photos ou parcourez les offres.",
          academicBenefit: "S'équiper correctement (ordinateur, calculatrice) pour ses études à moindre coût.",
          financialBenefit: "Monétisation des objets inutilisés et achat de matériel d'occasion à prix réduit."
        }
      ]
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-20">
      <div className="flex justify-end mb-4">
        <button 
          onClick={downloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg active:scale-95"
        >
          <Download size={18} />
          Télécharger en PDF
        </button>
      </div>

      <div ref={guideRef} className="bg-white rounded-3xl p-4 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="text-center mb-12">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4"
        >
          Guide d'Utilisation <span className="text-emerald-600">CampusBF</span>
        </motion.h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Optimisez votre parcours universitaire en maîtrisant tous les outils mis à votre disposition.
        </p>
      </div>

      {/* Profils Utilisateurs Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100">
          <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center mb-4 text-emerald-600 font-bold">ET</div>
          <h3 className="font-bold text-gray-900 mb-2">Profil Étudiant</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Consomme des ressources, cherche du soutien, achète d'occasion et utilise le covoiturage pour réduire ses dépenses.
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100">
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4 text-blue-600 font-bold">EN</div>
          <h3 className="font-bold text-gray-900 mb-2">Profil Enseignant/Tuteur</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Partage son expertise, valorise ses compétences académiques et génère des revenus complémentaires grâce aux cours de soutien.
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
          <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mb-4 text-purple-600 font-bold">EP</div>
          <h3 className="font-bold text-gray-900 mb-2">Profil Entreprise</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Publie des offres de stage/emploi et des bons plans pour se faire connaître auprès de la plus grande communauté étudiante.
          </p>
        </div>
      </div>

      <div className="space-y-12">
        {categories.map((cat, idx) => (
          <div key={idx} className="space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
              {cat.icon}
              <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">{cat.title}</h2>
            </div>
            <div className="grid grid-cols-1 gap-8">
              {cat.features.map((feature, fIdx) => (
                <motion.div 
                  key={fIdx}
                  whileHover={{ y: -2 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col md:flex-row"
                >
                  <div className="p-6 md:w-1/2 bg-gray-50">
                    <h4 className="text-lg font-bold text-emerald-700 mb-2 flex items-center gap-2">
                      <ShieldCheck size={18} />
                      {feature.name}
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">{feature.desc}</p>
                    <div className="bg-white p-3 rounded-xl border border-gray-200">
                      <p className="text-xs font-bold text-gray-400 mb-1 uppercase">Comment faire ?</p>
                      <p className="text-xs text-gray-700">{feature.how}</p>
                    </div>
                  </div>
                  <div className="p-6 md:w-1/2 grid grid-cols-1 gap-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <TrendingUp size={16} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-600 uppercase">Impact Académique</p>
                        <p className="text-sm text-gray-600 mt-1">{feature.academicBenefit}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 border-t border-gray-50 pt-4">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <DollarSign size={16} className="text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-orange-600 uppercase">Impact Financier</p>
                        <p className="text-sm text-gray-600 mt-1">{feature.financialBenefit}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary Section */}
      <div className="mt-20 bg-emerald-600 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-4">Pourquoi utiliser CampusBF au quotidien ?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-emerald-200 mb-2">Pour votre succès</h3>
              <ul className="space-y-2 text-sm">
                <li>• Centralisation de toutes les informations du campus</li>
                <li>• Entraide communautaire instantanée</li>
                <li>• Outils d'aide à l'insertion (CV Builder, Mentorat)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-emerald-200 mb-2">Pour votre portefeuille</h3>
              <ul className="space-y-2 text-sm">
                <li>• Réduction drastique des dépenses de vie (logement, transport)</li>
                <li>• Revenus complémentaires avec le tutorat</li>
                <li>• Accès à des bons plans exclusifs négociés pour vous</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <GraduationCap size={200} />
        </div>
      </div>
      </div>
      
      {/* Contact & Footer */}
      <div className="mt-20 pt-12 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">À propos de CampusBF</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            CampusBF est la première plateforme intégrée au Burkina Faso dédiée à la réussite et au bien-être des étudiants. 
            Développée par des étudiants pour des étudiants, elle vise à briser les barrières académiques et financières.
          </p>
          <div className="flex items-center gap-3 text-sm text-emerald-600 font-medium">
            <Smartphone size={16} />
            <span>Disponible sur Web et Mobile</span>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Contact & Support</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="text-emerald-600 shrink-0 mt-1" size={18} />
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Adresse physique</p>
                <p className="text-sm text-gray-700">Campus Principal - Secteur 15, Ouagadougou, Burkina Faso</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="text-emerald-600 shrink-0 mt-1" size={18} />
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Administrateur</p>
                <p className="text-sm text-gray-700 font-bold">+226 63 37 52 57</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="text-emerald-600 shrink-0 mt-1" size={18} />
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Email Support</p>
                <p className="text-sm text-gray-700">support@campusbf.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;
