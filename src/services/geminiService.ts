import { GoogleGenAI } from "@google/genai";

// Initialisation de l'API Gemini
// Dans Google AI Studio, la clé est automatiquement injectée via process.env.GEMINI_API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Fonction d'exemple pour générer du texte avec Gemini
 * @param prompt Le texte ou la question à envoyer à l'IA
 * @returns La réponse générée par l'IA
 */
export const generateText = async (prompt: string): Promise<string> => {
  try {
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
  return ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "Tu es un assistant intelligent pour CampusBF, une plateforme communautaire universitaire au Burkina Faso. Tes fonctionnalités incluent : la mise en relation avec des répétiteurs et enseignants, le partage de documents académiques, la recherche de stages et emplois, un marketplace étudiant, des forums communautaires, et l'organisation d'événements.\n\nIMPORTANT :\n1. CampusBF est une plateforme indépendante et n'est PAS la plateforme gouvernementale Campus Faso. Ne confonds jamais les deux.\n2. CampusBF NE gère PAS les inscriptions/réinscriptions, NE gère PAS le paiement des frais de scolarité, et NE propose PAS de suivi pédagogique (notes, emplois du temps). Si un utilisateur pose une question sur ces sujets, réponds poliment que ces fonctionnalités ne sont pas disponibles sur CampusBF.\n3. Sois concis, amical et utilise des emojis de temps en temps.",
    }
  });
};

/**
 * Génère un résumé ou une explication pour un document
 */
export const summarizeDocument = async (documentTitle: string, documentDescription: string): Promise<string> => {
  try {
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
