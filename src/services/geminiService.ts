import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion } from "@/types";

// Initialisation paresseuse de l'API Gemini pour éviter les crashs au démarrage
let aiClient: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  if (!aiClient) {
    // Dans Google AI Studio, la clé est automatiquement injectée via process.env.GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.warn("Clé API Gemini non trouvée. L'assistant IA pourrait ne pas fonctionner.");
    }
    
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
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    
    return response.text || "Aucune réponse générée.";
  } catch (error) {
    console.error("Erreur lors de l'appel à Gemini:", error);
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
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "Tu es un assistant intelligent pour CampusBF, une plateforme communautaire universitaire au Burkina Faso. Tes fonctionnalités incluent : la mise en relation avec des répétiteurs et enseignants, le partage de documents académiques, la recherche de stages et emplois, un marketplace étudiant, des forums communautaires, l'organisation d'événements, la recherche de camarades, et la participation à des concours (Contests).\n\nIMPORTANT :\n1. CampusBF est une plateforme indépendante et n'est PAS la plateforme gouvernementale Campus Faso. Ne confonds jamais les deux.\n2. CampusBF NE gère PAS les inscriptions/réinscriptions, NE gère PAS le paiement des frais de scolarité, et NE propose PAS de suivi pédagogique (notes, emplois du temps). Si un utilisateur pose une question sur ces sujets, réponds poliment que ces fonctionnalités ne sont pas disponibles sur CampusBF.\n3. Règles des Concours : Pour participer à certains concours, les utilisateurs doivent inviter un nombre minimum d'étudiants via leur lien d'invitation unique (disponible sur la page du concours).\n4. Règles des Documents : Seuls les utilisateurs avec un profil complet (sauf les étudiants) peuvent partager des documents. Pour qu'un étudiant puisse voir ou télécharger un document, il doit d'abord rejoindre un groupe dans la section Communauté et y publier ou répondre à un message.\n5. Sois concis, amical et utilise des emojis de temps en temps.",
    }
  });
};

/**
 * Génère un quiz interactif avec Gemini
 */
export const generateQuizWithAI = async (subject: string, level: string, numQuestions: number = 5): Promise<QuizQuestion[]> => {
  try {
    const ai = getAiClient();
    const prompt = `Génère un quiz à choix multiples de niveau ${level} sur le sujet suivant : "${subject}".
Le quiz doit contenir exactement ${numQuestions} questions.
Chaque question doit avoir 4 options de réponse.
Pour chaque option, tu dois attribuer un nombre de points (0 pour une réponse fausse, 1 ou plus pour une réponse correcte, ou des points partiels pour des réponses incomplètes).
Fournis également une courte explication pour chaque question.
Retourne le résultat sous forme d'un tableau d'objets JSON respectant strictement le schéma fourni.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              pointsPerOption: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER }
              },
              explanation: { type: Type.STRING }
            },
            required: ["id", "question", "options", "pointsPerOption", "explanation"]
          }
        }
      }
    });
    
    let text = response.text || "[]";
    // Nettoyer le markdown si Gemini l'ajoute quand même
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const questions: QuizQuestion[] = JSON.parse(text);
    
    // S'assurer que chaque question a un ID unique
    return questions.map((q, index) => ({
      ...q,
      id: `ai-q-${Date.now()}-${index}`
    }));
  } catch (error: any) {
    console.error("Erreur détaillée lors de la génération du quiz:", error);
    if (error.status) console.error("Status:", error.status);
    if (error.message) console.error("Message:", error.message);
    throw new Error("Impossible de générer le quiz avec l'IA. Veuillez réessayer.");
  }
};
export const summarizeDocument = async (documentTitle: string, documentDescription: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `En tant qu'assistant académique de CampusBF, donne-moi un bref aperçu de ce que pourrait contenir ce document et pourquoi il serait utile pour un étudiant, en te basant sur son titre et sa description.\n\nTitre: ${documentTitle}\nDescription: ${documentDescription}\n\nFais une réponse courte (2-3 phrases maximum) et motivante.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    
    return response.text || "Résumé non disponible.";
  } catch (error) {
    console.error("Erreur lors du résumé:", error);
    return "Impossible de générer un aperçu pour le moment.";
  }
};
