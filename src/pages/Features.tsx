import React, { useState } from 'react';
import { 
  FileText, GraduationCap, ShoppingBag, Briefcase, 
  Compass, Users, Bike, Calendar, Library, 
  UserCheck, MessageSquare, Sparkles, Download, Loader2,
  WifiOff, BookOpen, Trophy, Tag, Home, Brain, TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';

const features = [
  {
    icon: FileText,
    title: "Documents Académiques",
    description: "Accédez à une vaste bibliothèque de cours, TD, TP et anciens sujets partagés par la communauté.",
    color: "bg-blue-50 text-blue-600",
    link: "/documents",
    roles: ['student', 'teacher', 'admin']
  },
  {
    icon: GraduationCap,
    title: "Répétiteurs & Prof de maison",
    description: "Trouvez des répétiteurs qualifiés pour un accompagnement personnalisé. Idéal pour les parents soucieux de la réussite de leurs enfants.",
    color: "bg-emerald-50 text-emerald-600",
    link: "/tutors",
    highlight: true,
    roles: ['student', 'parent', 'admin']
  },
  {
    icon: ShoppingBag,
    title: "Marketplace Étudiante",
    description: "Achetez et vendez vos livres, fournitures et matériels informatiques en toute sécurité sur le campus.",
    color: "bg-amber-50 text-amber-600",
    link: "/marketplace",
    roles: ['student', 'teacher', 'alumni', 'admin']
  },
  {
    icon: Briefcase,
    title: "Stages & Emplois & Bourses",
    description: "Découvrez les meilleures opportunités de stages, d'emplois et de bourses adaptées à votre profil.",
    color: "bg-indigo-50 text-indigo-600",
    link: "/internships",
    roles: ['student', 'alumni', 'admin']
  },
  {
    icon: BookOpen,
    title: "Formations & Ateliers",
    description: "Développez de nouvelles compétences avec des formations académiques et professionnelles, en ligne ou en présentiel.",
    color: "bg-emerald-50 text-emerald-600",
    link: "/trainings",
    roles: ['student', 'teacher', 'admin', 'alumni']
  },
  {
    icon: Compass,
    title: "Orientation & Conseils",
    description: "Bénéficiez de conseils d'experts pour choisir votre filière et construire votre projet professionnel.",
    color: "bg-rose-50 text-rose-600",
    link: "/orientation",
    roles: ['student', 'parent', 'admin']
  },
  {
    icon: Users,
    title: "Communauté & Forums",
    description: "Rejoignez des groupes d'étude et participez à des discussions passionnantes avec vos pairs.",
    color: "bg-purple-50 text-purple-600",
    link: "/community",
    roles: ['student', 'teacher', 'alumni', 'admin']
  },
  {
    icon: Bike,
    title: "MotoRide (Covoiturage)",
    description: "Facilitez vos déplacements vers le campus en partageant vos trajets avec d'autres étudiants.",
    color: "bg-orange-50 text-orange-600",
    link: "/motoride",
    roles: ['student', 'teacher', 'admin']
  },
  {
    icon: Calendar,
    title: "Événements Campus",
    description: "Ne manquez aucun événement important : conférences, ateliers, hackathons et activités culturelles.",
    color: "bg-teal-50 text-teal-600",
    link: "/events",
    roles: ['student', 'teacher', 'parent', 'admin']
  },
  {
    icon: Trophy,
    title: "Concours CampusBF",
    description: "Participez à des concours académiques et thématiques pour gagner des prix et booster votre profil.",
    color: "bg-amber-50 text-amber-600",
    link: "/contests",
    roles: ['student', 'teacher', 'admin', 'alumni']
  },
  {
    icon: Brain,
    title: "Quiz & Révisions",
    description: "Améliorez vos connaissances avec des quiz interactifs générés par IA ou créés par des enseignants, et utilisez des flashcards pour mémoriser efficacement.",
    color: "bg-purple-50 text-purple-600",
    link: "/quizzes",
    roles: ['student', 'teacher', 'admin']
  },
  {
    icon: TrendingUp,
    title: "Classements",
    description: "Suivez votre progression par rapport à vos camarades et contribuez au prestige de votre université dans le classement général.",
    color: "bg-indigo-50 text-indigo-600",
    link: "/ranking",
    roles: ['student', 'teacher', 'admin', 'alumni']
  },
  {
    icon: FileText,
    title: "Générateur de CV",
    description: "Créez un CV professionnel et moderne en quelques secondes à partir de vos informations de profil.",
    color: "bg-blue-50 text-blue-600",
    link: "/cv-generator",
    roles: ['student', 'admin', 'alumni']
  },
  {
    icon: Tag,
    title: "Bons Plans & Réductions",
    description: "Profitez de réductions exclusives chez nos partenaires (restauration, transport, loisirs) sur présentation de votre profil CampusBF.",
    color: "bg-emerald-50 text-emerald-600",
    link: "/deals",
    roles: ['student', 'admin', 'alumni']
  },
  {
    icon: Home,
    title: "Colocation CampusBF",
    description: "Trouvez des colocataires fiables et sécurisés près de votre université grâce à notre système de vérification étudiante.",
    color: "bg-emerald-50 text-emerald-600",
    link: "/colocation",
    roles: ['student', 'admin']
  },
  {
    icon: Library,
    title: "Annuaire des Enseignants",
    description: "Consultez les profils des enseignants et contactez-les pour des questions académiques ou du mentorat.",
    color: "bg-cyan-50 text-cyan-600",
    link: "/teachers",
    roles: ['student', 'parent', 'admin']
  },
  {
    icon: UserCheck,
    title: "Mentorat & Accompagnement",
    description: "Connectez-vous avec des mentors qualifiés (Alumni, Enseignants, Parents, Masters et Doctorants) pour guider votre parcours.",
    color: "bg-violet-50 text-violet-600",
    link: "/mentorship",
    roles: ['student', 'alumni', 'admin', 'teacher', 'parent', 'institution']
  },
  {
    icon: WifiOff,
    title: "Mode Hors-ligne",
    description: "Consultez vos offres, événements et messages même sans connexion internet grâce à notre mode hors-ligne intelligent.",
    color: "bg-slate-100 text-slate-700",
    link: "#",
    roles: ['student', 'teacher', 'parent', 'alumni', 'admin']
  }
];

export default function Features() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const filteredFeatures = features.filter(f => !f.roles || (user && f.roles.includes(user.role)));

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Colors
      const emerald = [5, 150, 105]; // #059669
      const slate = [15, 23, 42];   // #0f172a
      const lightSlate = [100, 116, 139]; // #64748b

      // Header
      pdf.setFillColor(emerald[0], emerald[1], emerald[2]);
      pdf.roundedRect(pageWidth / 2 - 10, 15, 20, 20, 5, 5, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('C', pageWidth / 2, 29, { align: 'center' });

      pdf.setTextColor(slate[0], slate[1], slate[2]);
      pdf.setFontSize(28);
      pdf.text('CampusBF', pageWidth / 2, 45, { align: 'center' });
      
      pdf.setTextColor(emerald[0], emerald[1], emerald[2]);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RÉUSSIR ENSEMBLE AU BURKINA FASO', pageWidth / 2, 52, { align: 'center' });

      // About Section
      pdf.setFillColor(240, 253, 244); // bg-emerald-50
      pdf.roundedRect(15, 65, pageWidth - 30, 30, 8, 8, 'F');
      pdf.setDrawColor(209, 250, 229); // border-emerald-100
      pdf.roundedRect(15, 65, pageWidth - 30, 30, 8, 8, 'D');
      
      pdf.setTextColor(6, 78, 59); // text-emerald-900
      pdf.setFontSize(14);
      pdf.text('À propos de CampusBF', 25, 75);
      
      pdf.setTextColor(6, 95, 70); // text-emerald-800
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const aboutText = "La plateforme numérique de référence pour les étudiants, parents et enseignants du Burkina Faso. Simplifiez votre vie académique et accédez à des services exclusifs.";
      const splitAbout = pdf.splitTextToSize(aboutText, pageWidth - 50);
      pdf.text(splitAbout, 25, 82);

      // Features Grid
      let yPos = 110;
      const col1X = 15;
      const col2X = pageWidth / 2 + 5;
      const cardWidth = (pageWidth - 40) / 2;
      
      pdf.setTextColor(slate[0], slate[1], slate[2]);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Nos Services & Fonctionnalités', 15, 105);

      features.forEach((feature, idx) => {
        const isSecondCol = idx % 2 !== 0;
        const x = isSecondCol ? col2X : col1X;
        const currentY = yPos;

        // Card Background
        pdf.setDrawColor(226, 232, 240); // border-slate-200
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(x, currentY, cardWidth, 35, 5, 5, 'FD');

        // Title
        pdf.setTextColor(slate[0], slate[1], slate[2]);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(feature.title, x + 5, currentY + 10);

        // Description
        pdf.setTextColor(lightSlate[0], lightSlate[1], lightSlate[2]);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        const splitDesc = pdf.splitTextToSize(feature.description, cardWidth - 10);
        pdf.text(splitDesc, x + 5, currentY + 16);

        if (isSecondCol) {
          yPos += 42;
        }
        
        // Add new page if needed
        if (yPos > 260 && idx < features.length - 1) {
          pdf.addPage();
          yPos = 20;
        }
      });

      // Footer
      const footerY = pdf.internal.pageSize.getHeight() - 20;
      pdf.setDrawColor(241, 245, 249);
      pdf.line(15, footerY - 10, pageWidth - 15, footerY - 10);
      
      pdf.setTextColor(lightSlate[0], lightSlate[1], lightSlate[2]);
      pdf.setFontSize(9);
      pdf.text('Rejoignez-nous sur CampusBF', pageWidth / 2, footerY, { align: 'center' });
      
      pdf.setTextColor(slate[0], slate[1], slate[2]);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('WhatsApp: +226 63 37 52 57   |   Site: campusbf.com', pageWidth / 2, footerY + 7, { align: 'center' });

      pdf.save('CampusBF-Fonctionnalites.pdf');
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      console.log('Erreur PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold">
            <Sparkles size={16} />
            Découvrez CampusBF
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-slate-900 tracking-tight">
            Toutes les fonctionnalités pour votre <span className="text-emerald-600">réussite</span>
          </h1>
        </div>
        <div className="flex flex-col items-center md:items-end gap-2">
          <button 
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto justify-center"
          >
            {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            Télécharger en PDF
          </button>
          <p className="text-[10px] text-slate-400 font-medium italic">
            Parfait pour partager dans vos groupes WhatsApp !
          </p>
        </div>
      </div>

      <p className="text-lg text-slate-500 font-medium max-w-3xl">
        CampusBF est la plateforme tout-en-un conçue pour accompagner les étudiants, les enseignants et les parents dans l'écosystème académique du Burkina Faso.
      </p>

      {user?.role === 'parent' && (
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl shadow-emerald-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center flex-shrink-0 shadow-inner ring-1 ring-white/30">
              <GraduationCap size={48} />
            </div>
            <div className="flex-1 text-center md:text-left space-y-4">
              <h2 className="text-3xl font-display font-bold">Focus Parent : Trouvez un Répétiteur</h2>
              <p className="text-emerald-50 text-lg leading-relaxed max-w-2xl">
                En tant que parent, la réussite de votre enfant est votre priorité. CampusBF vous permet de parcourir des profils vérifiés de répétiteurs qualifiés, de consulter leurs tarifs et de les contacter directement pour un soutien scolaire sur mesure.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-2">
                <Link 
                  to="/tutors" 
                  className="px-8 py-3.5 bg-white text-emerald-700 rounded-2xl font-bold hover:bg-emerald-50 transition-all shadow-lg active:scale-95"
                >
                  Trouver un Répétiteur
                </Link>
                <Link 
                  to="/teachers" 
                  className="px-8 py-3.5 bg-emerald-500/30 backdrop-blur-md text-white border border-white/30 rounded-2xl font-bold hover:bg-emerald-500/40 transition-all active:scale-95"
                >
                  Annuaire Enseignants
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFeatures.map((feature, idx) => (
          <Link 
            key={idx} 
            to={feature.link}
            className={cn(
              "p-8 rounded-[2rem] border transition-all duration-300 group hover:-translate-y-2 flex flex-col h-full",
              feature.highlight 
                ? "bg-white border-emerald-200 shadow-lg shadow-emerald-100/50 hover:border-emerald-400" 
                : "bg-white border-slate-200/60 shadow-sm hover:shadow-xl hover:border-emerald-200"
            )}
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform", feature.color)}>
              <feature.icon size={28} />
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900 mb-3 group-hover:text-emerald-700 transition-colors">
              {feature.title}
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-1">
              {feature.description}
            </p>
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm group-hover:gap-3 transition-all">
              Découvrir <MessageSquare size={16} />
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-center space-y-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-display font-bold">Besoin d'aide ou d'une fonctionnalité spécifique ?</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Notre équipe travaille constamment pour améliorer CampusBF. Si vous avez des suggestions ou si vous rencontrez des difficultés, n'hésitez pas à nous contacter.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <a 
              href="https://wa.me/22663375257" 
              target="_blank" 
              rel="noreferrer"
              className="px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2"
            >
              <MessageSquare size={20} />
              Nous contacter sur WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
