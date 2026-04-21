import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion } from "@/types";

// Initialisation paresseuse de l'API Gemini pour éviter les crashs au démarrage
let aiClient: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  // Check for a custom API key saved by the user in localStorage first
  const customKey = typeof window !== 'undefined' ? localStorage.getItem('CAMPUSBF_QUIZ_API_KEY') : null;
  
  // Try to get key from multiple sources
  const rawKey = customKey ||
                 (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
                 (import.meta as any).env?.VITE_GEMINI_API_KEY || 
                 (import.meta as any).env?.GEMINI_API_KEY;
  
  // Provide a dummy key if none is found to prevent synchronous crashes in the browser
  const apiKey = (!rawKey || rawKey.toLowerCase() === 'free' || rawKey === 'dummy-key-to-prevent-crash') 
                 ? 'AIzaSyDummyKey_To_Prevent_Browser_Crash' 
                 : rawKey;

  if (apiKey === 'AIzaSyDummyKey_To_Prevent_Browser_Crash' && !aiClient) {
    console.warn("Clé API Gemini valide non trouvée. Veuillez configurer la clé API.");
  }
  
  // Re-create the client if the key has changed or it doesn't exist
  if (!aiClient || (aiClient as any)._apiKey !== apiKey) {
    aiClient = new GoogleGenAI({ apiKey });
    // Tag the instance with the key so we can detect changes
    if (aiClient) {
       (aiClient as any)._apiKey = apiKey;
    }
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

export const generateAdvancedQuizWithAI = async (
  courseText: string,
  subject: string,
  level: string,
  numQuestions: number,
  options?: {
    difficulty?: string;
    language?: string;
    instructions?: string;
    questionTypes?: string[];
  }
): Promise<{ title: string; questions: QuizQuestion[] }> => {
  try {
    const ai = getAiClient();
    const lang = options?.language || 'Français';
    const typesStr = options?.questionTypes?.join(', ') || 'multiple_choice, true_false, short_answer';
    
    const prompt = `Génère un quiz universitaire à partir du texte source ci-dessous.

Matière : ${subject}
Niveau universitaire : ${level}
Nombre de questions : ${numQuestions}
Langue requise : ${lang}
${options?.difficulty ? `Difficulté : ${options.difficulty}` : ''}
${options?.instructions ? `Instructions : ${options.instructions}` : ''}
Types de questions autorisés : ${typesStr}

Texte source :
"""
${courseText}
"""

Contraintes strictes :
- Renvoie un objet JSON contenant "title" et "questions".
- Chaque question doit être claire, extraite du texte fourni.
- Fournir une explication complète ("explanation") pour chaque question.
- Utilise des questions de types variés si possible selon les types demandés.

Modèle de format attendu pour l'output :
{
  "title": "Titre suggéré du quiz",
  "questions": [
    // format standard attendu pour vos questions (id, type, question, options, pointsPerOption, correctAnswerIndex, explanation, etc.)
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash", // Utilisation de flash pour éviter l'erreur 404 liée à l'accès pro
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { 
                    type: Type.STRING, 
                    enum: ['multiple_choice', 'true_false', 'short_answer', 'matching', 'numerical', 'cloze', 'calculated', 'drag_drop', 'essay', 'description']
                  },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  pointsPerOption: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                  correctAnswerIndex: { type: Type.NUMBER },
                  explanation: { type: Type.STRING },
                  correctTextAnswer: { type: Type.STRING },
                  correctNumericAnswer: { type: Type.NUMBER },
                },
                required: ["id", "type", "question", "explanation"]
              }
            }
          },
          required: ["title", "questions"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("L'IA n'a renvoyé aucun résultat.");
    }

    const data = JSON.parse(resultText);
    
    // Traitement post-génération pour assurer la compatibilité
    const processedQuestions = data.questions.map((q: any) => {
      if (!q.options) q.options = [];
      if (!q.id) q.id = 'q_' + Math.random().toString(36).substring(2, 9);
      if (q.type === 'true_false' && q.options.length !== 2) {
        q.options = ['Vrai', 'Faux'];
      }
      return q as QuizQuestion;
    });

    return {
      title: data.title || `Quiz généré : ${subject}`,
      questions: processedQuestions
    };
  } catch (error: any) {
    console.error("Advanced Quiz Generation Error:", error);
    if (error.status === 403) {
      throw new Error("Erreur d'autorisation. Veuillez vérifier votre clé API Gemini.");
    } else if (error.message && error.message.includes('JSON')) {
      throw new Error("L'IA n'a pas répondu dans un format valide. Veuillez réessayer avec moins de questions.");
    }
    throw new Error(`La génération a échoué: ${error.message || "Erreur inconnue"}`);
  }
};

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
      model: "gemini-1.5-flash",
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
    
    // Check for specific API Key errors
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('API key not valid')) {
       throw new Error("La Clé API Gemini est invalide ou incorrecte. Vérifiez qu'elle est bien copiée.");
    }
    if (error.message?.includes('429') || error.message?.toLowerCase().includes('quota') || error.message?.toLowerCase().includes('exhausted')) {
       throw new Error("Votre quota d'utilisation gratuite de l'API Gemini est dépassé. Veuillez réessayer plus tard ou configurer la facturation sur votre projet Google.");
    }
    if (error.message?.includes('403') || error.message?.toLowerCase().includes('permission')) {
       throw new Error("L'API Gemini n'est pas accessible. Assurez-vous que l'API 'Generative Language API' est bien activée sur votre projet Google, ou que votre région est supportée.");
    }
    if (error.message?.includes('NOT_FOUND') || error.message?.includes('not found for API version')) {
       throw new Error("Erreur de modèle ou l'API n'est pas complètement activée. Si vous avez créé la clé dans un projet existant (comme CampusBF), vous devez activer la 'Generative Language API' manuellement.");
    }
    
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
