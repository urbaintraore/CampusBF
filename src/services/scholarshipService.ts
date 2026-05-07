import { collection, query, where, getDocs, orderBy, limit, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Scholarship, User } from '@/types';
import { GoogleGenAI, Type } from "@google/genai";

const DEFAULT_MODEL = "gemini-3-flash-preview";

const getAiClient = (): GoogleGenAI => {
  const apiKey = (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') 
    ? process.env.GEMINI_API_KEY 
    : (import.meta as any).env?.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  
  return new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
};

/**
 * Service pour la gestion des bourses et opportunités
 */
export const scholarshipService = {
  /**
   * Récupère les bourses depuis Firestore
   */
  getScholarships: async (filters?: { level?: string, domain?: string, country?: string }): Promise<Scholarship[]> => {
    try {
      const boursesRef = collection(db, 'bourses');
      let q = query(boursesRef, orderBy('date_publication', 'desc'), limit(100));

      if (filters) {
        if (filters.level && filters.level !== 'all') {
          q = query(boursesRef, where('niveau', '==', filters.level), orderBy('date_publication', 'desc'), limit(100));
        }
      }

      const snapshot = await getDocs(q);
      let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scholarship));

      // Post-filtering for other fields if needed (Firestore index limits)
      if (filters) {
        if (filters.domain && filters.domain !== 'all') {
          results = results.filter(b => b.domaine && b.domaine.toLowerCase().includes(filters.domain!.toLowerCase()));
        }
        if (filters.country && filters.country !== 'all') {
          results = results.filter(b => b.pays && b.pays.toLowerCase().includes(filters.country!.toLowerCase()));
        }
      }

      return results;
    } catch (error) {
      console.error("Error fetching scholarships:", error);
      return [];
    }
  },

  /**
   * Utilise Gemini pour analyser une offre de bourse et générer un résumé/conseils
   */
  analyzeScholarship: async (scholarship: Partial<Scholarship>, userProfile?: User): Promise<{ resume_ia: string, conseils_ia: string, match_score: number }> => {
    try {
      const ai = getAiClient();
      
      const userContext = userProfile ? `
        Profil de l'étudiant :
        - Niveau : ${userProfile.level}
        - Filière : ${userProfile.major}
        - Compétences : ${userProfile.skills?.join(', ') || 'Non spécifiées'}
      ` : "";

      const prompt = `Tu es un expert en bourses internationales pour les étudiants africains.
      Analyse l'offre de bourse suivante :
      
      Titre: ${scholarship.titre}
      Pays: ${scholarship.pays}
      Niveau: ${scholarship.niveau}
      Domaine: ${scholarship.domaine}
      Description: ${scholarship.description}
      
      ${userContext}
      
      TACHE :
      1. Génère un résumé concis et motivant de l'opportunité (max 3 phrases).
      2. Donne 3 conseils stratégiques spécifiques pour postuler à cette bourse particulière.
      3. Si un profil étudiant est fourni, calcule un score de correspondance (0-100) basé sur l'adéquation entre son profil et les critères de la bourse.
      
      Réponds UNIQUEMENT avec un format JSON :
      {
        "resume_ia": "...",
        "conseils_ia": "Conseil 1 | Conseil 2 | Conseil 3",
        "match_score": 85
      }`;

      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              resume_ia: { type: Type.STRING },
              conseils_ia: { type: Type.STRING },
              match_score: { type: Type.NUMBER }
            },
            required: ["resume_ia", "conseils_ia", "match_score"]
          }
        }
      });

      const result = JSON.parse(response.text);
      return result;
    } catch (error) {
      console.error("AI Analysis error:", error);
      return { 
        resume_ia: "Résumé indisponible.", 
        conseils_ia: "Préparez bien votre dossier | Vérifiez les dates limites | Contactez l'université", 
        match_score: 50 
      };
    }
  },

  /**
   * Simulation/Triggers de recherche automatique
   * Dans une version réelle, cela appellerait une API externe ou un scrapper.
   * Ici, on simule l'ajout d'une nouvelle bourse via IA
   */
  syncNewScholarships: async (): Promise<number> => {
    try {
      const ai = getAiClient();
      
      const prompt = `Génère 3 offres de bourses internationales RÉELLES et ACTUALLES (ex: Fulbright, Chevening, DAAD, bourses d'excellence France) adaptées aux étudiants du Burkina Faso.
      
      TRADUCTION : Toutes les descriptions, titres et contenus doivent être en FRANÇAIS.
      
      Réponds UNIQUEMENT avec un tableau JSON d'objets respectant ce schéma :
      [
        {
          "titre": "...",
          "pays": "...",
          "niveau": "Licence/Master/PhD",
          "domaine": "...",
          "description": "Exigences et avantages en français...",
          "date_limite": "YYYY-MM-DD",
          "lien_officiel": "...",
          "source": "...",
          "tags": ["...", "..."]
        }
      ]`;

      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                titre: { type: Type.STRING },
                pays: { type: Type.STRING },
                niveau: { type: Type.STRING },
                domaine: { type: Type.STRING },
                description: { type: Type.STRING },
                date_limite: { type: Type.STRING },
                lien_officiel: { type: Type.STRING },
                source: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["titre", "pays", "niveau", "domaine", "lien_officiel"]
            }
          }
        }
      });

      const bourses = JSON.parse(response.text);
      let count = 0;

      for (const bourse of bourses) {
        // Vérifier si elle existe déjà (par titre + pays pour simplifier)
        const q = query(collection(db, 'bourses'), where('titre', '==', bourse.titre));
        const existing = await getDocs(q);
        
        if (existing.empty) {
          await addDoc(collection(db, 'bourses'), {
            ...bourse,
            date_publication: serverTimestamp(),
            createdAt: serverTimestamp()
          });
          count++;
        }
      }

      return count;
    } catch (error) {
      console.error("Sync error:", error);
      return 0;
    }
  },

  /**
   * Traduit un texte en français en utilisant Gemini
   */
  translateToFrench: async (text: string): Promise<string> => {
    try {
      const ai = getAiClient();
      const prompt = `Traduis le texte suivant en français (France), en gardant un ton académique et professionnel :\n\n${text}`;
      const response = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt
      });
      return response.text;
    } catch (error) {
      console.error("Translation error:", error);
      return text;
    }
  }
};
