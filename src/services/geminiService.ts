import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion } from "@/types";

// Initialisation paresseuse de l'API Gemini
let aiClient: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || 
                   (import.meta as any).env.VITE_GEMINI_API_KEY || 
                   (import.meta as any).env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error("Clé API Gemini non trouvée dans l'environnement.");
    }
    
    aiClient = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
  }
  return aiClient;
};

/**
 * Fonction pour générer du texte avec Gemini
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
    console.error("Erreur lors de l'appel à Gemini (generateText):", error);
    throw new Error("Impossible de générer une réponse avec l'IA.");
  }
};

/**
 * Crée une session de chat avec l'assistant CampusBF
 */
export const createCampusAssistantChat = () => {
  const ai = getAiClient();
  return ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "Tu es un assistant intelligent pour CampusBF, une plateforme communautaire universitaire au Burkina Faso. Tes fonctionnalités incluent : la mise en relation avec des répétiteurs et enseignants, le partage de documents académiques, la recherche de stages et emplois, un marketplace étudiant, des forums communautaires, l'organisation d'événements, la recherche de camarades, et la participation à des concours (Contests).\n\nEXPERTISE ACADÉMIQUE :\nTu as une expertise particulière dans les programmes universitaires francophones, particulièrement en Mathématiques. Applique une distinction stricte dans le domaine de l'Algèbre :\n- Algèbre Structurelle/Générale : Logique, Théorie des ensembles, Relations, Structures (Groupes, Anneaux, Corps), Polynômes, Fractions rationnelles.\n- Algèbre Linéaire : Matrices, Espaces vectoriels, Systèmes linéaires.\nRéponds avec précision aux questions académiques en utilisant ce vocabulaire spécialisé.\n\nIMPORTANT :\n1. CampusBF est une plateforme indépendante et n'est PAS la plateforme gouvernementale Campus Faso. Ne confonds jamais les deux.\n2. CampusBF NE gère PAS les inscriptions/réinscriptions.\n3. Sois concis, amical et utilise des emojis.",
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
    
    const prompt = `Tu es un Professeur Expert en Mathématiques et concepteur de quiz académiques. Ta spécialité est l'Algèbre universitaire (Structures algébriques et Algèbre générale).
Génère un quiz universitaire de haute précision à partir du texte source ci-dessous.

Matière : ${subject}
Niveau universitaire : ${level}
Nombre de questions : ${numQuestions}
Langue requise : ${lang}
${options?.difficulty ? `Difficulté : ${options.difficulty}` : ''}
${options?.instructions ? `Instructions : ${options.instructions}` : ''}
Types de questions autorisés : ${typesStr}

### Expertise Spécifique (Catégorisation des matières) :
Si le sujet est "Algèbre", tu dois faire une distinction TRÈS stricte entre :
1. Algèbre Générale/Structurelle : Logique, Théorie des ensembles, Relations (équivalence, ordre), Groupes, Anneaux (Rings), Corps (Fields), Polynômes, Algèbre de Boole, et Fractions rationnelles.
2. Algèbre Linéaire : Espaces vectoriels, Matrices, Applications linéaires, Déterminants, Systèmes linéaires.

NE MÉLANGE PAS ces deux domaines. Si l'utilisateur demande une matière de la liste 1 (ex: Anneaux), ne pose aucune question sur la liste 2 (ex: Matrices).

Texte source :
"""
${courseText}
"""

Contraintes strictes :
- Renvoie un objet JSON valide et complet.
- Chaque question doit être extraite ou basée sur le texte fourni.
- Fournir une explication pédagogique concise ("explanation") pour chaque question.
- Utilise des questions de types variés.
- Ne pas générer de champs inutiles ou de tableaux excessivement longs.
- Pour les QCM, fournis exactement une 'correctAnswerIndex' correspondant à l'index de la bonne réponse.

Modèle de format attendu pour l'output :
{
  "title": "Titre du quiz",
  "questions": [
    { "type": "multiple_choice", "question": "...", "options": ["...", "..."], "correctAnswerIndex": 0, "explanation": "..." }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192, // Augmentation pour éviter les troncatures sur de longs quiz
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { 
                    type: Type.STRING, 
                    enum: ['multiple_choice', 'true_false', 'short_answer', 'matching', 'numerical', 'cloze', 'calculated', 'drag_drop', 'essay', 'description']
                  },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswerIndex: { type: Type.NUMBER },
                  explanation: { type: Type.STRING },
                  correctTextAnswer: { type: Type.STRING },
                  correctNumericAnswer: { type: Type.NUMBER },
                },
                required: ["type", "question", "explanation"]
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

    let data;
    try {
      data = JSON.parse(resultText);
    } catch (e) {
      console.error("JSON Parse Error. Full text:", resultText);
      throw new Error("L'IA a généré une réponse trop longue ou malformée. Essayez de réduire le nombre de questions demandées.");
    }
    
    // Traitement post-génération pour assurer la compatibilité
    const processedQuestions = data.questions.map((q: any) => {
      if (!q.options) q.options = [];
      q.id = 'q_' + Math.random().toString(36).substring(2, 9);
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

    const prompt = `Tu es un Professeur Expert en Mathématiques et concepteur de quiz académiques spécialisé dans l'enseignement universitaire en Afrique francophone.
Génère un quiz interactif riche de niveau ${level} sur le sujet suivant : "${subject}".

### Expertise Mathématique (Classification des matières) :
Si le sujet concerne l'Algèbre, respecte strictement cette classification :
- Algèbre de base/générale : Logique mathématique, Relations binaires (équivalence, ordre), Structures (Groupes, Anneaux, Corps), Algèbre de Boole, Polynômes et Fractions rationnelles.
- Algèbre Linéaire : Espaces vectoriels, Matrices, Déterminants, Réduction d'endomorphismes.
RESTE focalisé uniquement sur le sujet "${subject}". Ne dérive pas vers l'algèbre linéaire si le sujet appartient à l'algèbre générale.

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
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { 
                type: Type.STRING, 
                enum: ['multiple_choice', 'true_false', 'matching', 'short_answer', 'numerical', 'calculated', 'essay', 'cloze', 'description']
              },
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswerIndex: { type: Type.NUMBER },
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
            required: ["type", "question", "explanation"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini n'a renvoyé aucun texte.");
    }
    
    let rawQuestions: any[];
    try {
      rawQuestions = JSON.parse(text);
    } catch (e) {
      console.error("JSON Parse Error (Simple Generator):", text);
      throw new Error("Réponse de l'IA tronquée. Essayez de demander moins de questions.");
    }
    
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
       throw new Error("La Clé API Gemini est invalide ou incorrecte.");
    }
    if (error.message?.includes('429') || error.message?.toLowerCase().includes('quota')) {
       throw new Error("Votre quota d'utilisation gratuite de l'API Gemini est dépassé.");
    }
    
    throw new Error(`Erreur lors de la génération du quiz : ${error.message || 'Erreur inconnue'}`);
  }
};

export const summarizeDocument = async (documentTitle: string, documentDescription: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `En tant qu'assistant académique de CampusBF, donne-moi un bref aperçu de ce que pourrait contenir ce document et pourquoi il serait utile pour un étudiant, en te basant sur son titre et sa description.\n\nTitre: ${documentTitle}\nDescription: ${documentDescription}\n\nFais une réponse courte (2-3 sentences maximum) et motivante.`;
    
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
