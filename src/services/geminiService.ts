import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion } from "@/types";

// Initialisation paresseuse de l'API Gemini pour éviter les crashs au démarrage
let aiClient: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  // Try to get key from multiple sources (process.env for server/node, import.meta.env for browser)
  const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
                 (import.meta as any).env?.VITE_GEMINI_API_KEY || 
                 (import.meta as any).env?.GEMINI_API_KEY;
  
  if (!apiKey && !aiClient) {
    console.warn("Clé API Gemini non trouvée. L'assistant IA pourrait ne pas fonctionner hors de l'aperçu AI Studio.");
  }
  
  // Recréer le client ou le retourner s'il existe déjà
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-to-prevent-crash' });
  }
  return aiClient;
};

/**
 * Fonction d'exemple pour générer du texte avec Gemini
 * @param prompt Le texte ou la question à envoyer à l'IA
 * @returns La réponse générée par l'IA
 */
export const generateText = async (prompt: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    
    return response.text || "Aucune réponse générée.";
  } catch (error) {
    console.error("Erreur lors de l'appel à Gemini (generateText):", error);
    throw new Error("Impossible de générer une réponse avec l'IA.");
  }
};

/**
 * Crée une session de chat avec l'assistant CampusBF
 * Cela permet à l'IA de se souvenir du contexte de la conversation
 */
export const createCampusAssistantChat = () => {
  const ai = getAiClient();
  return ai.chats.create({
    model: "gemini-1.5-flash",
    config: {
      systemInstruction: "Tu es un assistant intelligent pour CampusBF, une plateforme communautaire universitaire au Burkina Faso. Tes fonctionnalités incluent : la mise en relation avec des répétiteurs et enseignants, le partage de documents académiques, la recherche de stages et emplois, un marketplace étudiant, des forums communautaires, l'organisation d'événements, la recherche de camarades, et la participation à des concours (Contests).\n\nIMPORTANT :\n1. CampusBF est une plateforme indépendante et n'est PAS la plateforme gouvernementale Campus Faso. Ne confonds jamais les deux.\n2. CampusBF NE gère PAS les inscriptions/réinscriptions, NE gère PAS le paiement des frais de scolarité, et NE propose PAS de suivi pédagogique (notes, emplois du temps). Si un utilisateur pose une question sur ces sujets, réponds poliment que ces fonctionnalités ne sont pas disponibles sur CampusBF.\n3. Règles des Concours : Pour participer à certains concours, les utilisateurs doivent inviter un nombre minimum d'étudiants via leur lien d'invitation unique (disponible sur la page du concours).\n4. Règles des Documents : Seuls les utilisateurs avec un profil complet (sauf les étudiants) peuvent partager des documents. Pour qu'un étudiant puisse voir ou télécharger un document, il doit d'abord rejoindre un groupe dans la section Communauté et y publier ou répondre à un message.\n5. Sois concis, amical et utilise des emojis de temps en temps.",
    }
  });
};

/**
 * Génère un quiz interactif avec Gemini
 */
export interface GenerateQuizOptions {
  difficulty?: string;
  instructions?: string;
  language?: string;
}

export const generateQuizWithAI = async (subject: string, level: string, numQuestions: number = 20, options?: GenerateQuizOptions): Promise<QuizQuestion[]> => {
  try {
    const ai = getAiClient();
    const difficultyStr = options?.difficulty ? `\nDifficulté souhaitée : ${options.difficulty}.` : '';
    const instructionsStr = options?.instructions ? `\nInstructions spécifiques de l'utilisateur : ${options.instructions}` : '';
    const languageStr = options?.language ? `\nLa langue du quiz doit être : ${options.language}.` : '\nLa langue du quiz doit être : Français.';

    const prompt = `Génère un quiz interactif riche de niveau ${level} sur le sujet suivant : "${subject}".
Le quiz doit contenir exactement ${numQuestions} questions.${difficultyStr}${languageStr}${instructionsStr}
Utilise une variété de types de questions inspirés de Moodle pour rendre le quiz engageant :
1. multiple_choice : Choix multiples classiques (QCM).
2. true_false : Vrai ou Faux.
3. short_answer : L'étudiant doit taper un mot ou une phrase courte (fournis correctTextAnswer).
4. numerical : L'étudiant doit fournir un nombre (fournis correctNumericAnswer et tolerance).
5. matching : Associer des éléments (fournis matchingPairs).
6. description : Un bloc informatif ou une consigne entre des questions (ne nécessite pas de réponse).
7. cloze : Texte à trous (fournis clozeTemplate avec des [[gap1]] et clozeAnswers comme un tableau d'objets { gapId: "gap1", answer: "réponse" }).
8. calculated : Question numérique avec une formule simple (fournis formula et correctNumericAnswer pour un exemple).

Pour chaque question :
- Attribue des points appropriés dans pointsPerOption ou via le score global.
- Fournis une explication pédagogique claire.
- Assure-toi que les questions sont pertinentes au niveau ${level}.

Retourne le résultat sous forme d'un tableau d'objets JSON respectant strictement le schéma fourni.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash", // Modifié de pro vers flash
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { 
                type: Type.STRING, 
                enum: ['multiple_choice', 'true_false', 'matching', 'short_answer', 'numerical', 'calculated', 'essay', 'cloze', 'description']
              },
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              pointsPerOption: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER }
              },
              explanation: { type: Type.STRING },
              matchingPairs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    left: { type: Type.STRING },
                    right: { type: Type.STRING }
                  }
                }
              },
              correctTextAnswer: { type: Type.STRING },
              correctNumericAnswer: { type: Type.NUMBER },
              tolerance: { type: Type.NUMBER },
              formula: { type: Type.STRING },
              clozeTemplate: { type: Type.STRING },
              clozeAnswers: { 
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    gapId: { type: Type.STRING },
                    answer: { type: Type.STRING }
                  },
                  required: ["gapId", "answer"]
                }
              }
            },
            required: ["id", "type", "question", "explanation"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini n'a renvoyé aucun texte.");
    }
    
    const rawQuestions: any[] = JSON.parse(text);
    
    // Conversion et nettoyage
    const questions: QuizQuestion[] = rawQuestions.map((q, index) => {
      const sanitized: any = {
        ...q,
        id: `ai-q-${Date.now()}-${index}`
      };

      // Si c'est un Cloze, convertir le tableau de réponses en objet
      if (q.type === 'cloze' && Array.isArray(q.clozeAnswers)) {
        sanitized.clozeAnswers = {};
        q.clozeAnswers.forEach((item: any) => {
          sanitized.clozeAnswers[item.gapId] = item.answer;
        });
      }

      return sanitized as QuizQuestion;
    });
    
    return questions;
  } catch (error: any) {
    console.error("Erreur détaillée lors de la génération du quiz:", error);
    throw new Error(`Erreur lors de la génération du quiz : ${error.message || 'Erreur inconnue'}`);
  }
};
export const summarizeDocument = async (documentTitle: string, documentDescription: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `En tant qu'assistant académique de CampusBF, donne-moi un bref aperçu de ce que pourrait contenir ce document et pourquoi il serait utile pour un étudiant, en te basant sur son titre et sa description.\n\nTitre: ${documentTitle}\nDescription: ${documentDescription}\n\nFais une réponse courte (2-3 phrases maximum) et motivante.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    
    return response.text || "Résumé non disponible.";
  } catch (error) {
    console.error("Erreur lors du résumé:", error);
    return "Impossible de générer un aperçu pour le moment.";
  }
};
