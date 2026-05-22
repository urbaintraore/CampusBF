import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion, PublicServiceQuestion } from "@/types";

const DEFAULT_MODEL = "gemini-flash-latest";

/**
 * Restructure un document académique avec IA.
 */
export const restructureAcademicDocument = async (
  rawText: string,
  metadata: {
    institution: string;
    subject: string;
    academicYear: string;
    documentType: string;
    level: string;
  }
): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `Tu es un expert en mise en page académique moderne pour CampusBF.
    
    Ton objectif : prendre le texte brut d'un document académique (provenant d'un OCR) et le restructurer de manière professionnelle.
    
    MÉTA-DONNÉES DU DOCUMENT :
    - Établissement : ${metadata.institution}
    - Année : ${metadata.academicYear}
    - Matière : ${metadata.subject}
    - Type : ${metadata.documentType}
    - Niveau : ${metadata.level}

    DIRECTIVES DE RESTRUCTURATION :
    1. Crée une hiérarchie claire avec des titres (H1, H2, H3), paragraphes, listes.
    2. Utilise un langage académique professionnel.
    3. Ajoute des encadrés markdown pour les définitions clés, formules importantes ou conseils.
    4. Sépare bien les sections.
    5. N'ajoute pas d'entête textuel (ils seront ajoutés ailleurs), mais structure le CONTENU principal.
    6. Le résultat final doit être en format Markdown propre.

    CONTENU À RESTRUCTURER :
    """
    ${rawText}
    """
    `;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
    });
    
    return response.text || "Erreur lors de la restructuration.";
  } catch (error) {
    console.error("Erreur lors de la restructuration IA:", error);
    throw new Error("Impossible de restructurer le document avec l'IA.");
  }
};

/**
 * Helper pour nettoyer et parser le JSON de l'IA
 */
const parseAiJson = (text: string): any => {
  try {
    // Tentative de parse direct
    return JSON.parse(text);
  } catch (e) {
    // Si échec, on cherche le premier '{' et dernier '}' ou '[' et ']'
    const startBrace = text.indexOf('{');
    const startBracket = text.indexOf('[');
    const start = (startBrace !== -1 && (startBracket === -1 || startBrace < startBracket)) ? startBrace : startBracket;
    
    if (start === -1) throw new Error("Format JSON non trouvé dans la réponse de l'IA.");
    
    const endBrace = text.lastIndexOf('}');
    const endBracket = text.lastIndexOf(']');
    const end = Math.max(endBrace, endBracket);
    
    if (end === -1 || end < start) throw new Error("Format JSON incomplet dans la réponse de l'IA.");
    
    const cleaned = text.substring(start, end + 1);
    try {
      return JSON.parse(cleaned);
    } catch (e2) {
      console.error("Failed to parse cleaned JSON:", cleaned);
      throw new Error("L'IA a généré un JSON invalide.");
    }
  }
};

/**
 * Génère spécialisée pour les concours de la fonction publique au Burkina Faso
 */
export const generatePublicServiceExam = async (
  category: string,
  level: string,
  numQuestions: number = 10
): Promise<PublicServiceQuestion[]> => {
  try {
    const ai = getAiClient();
    
    let specificPrompt = "";
    if (category === "tests_psychotechniques") {
      specificPrompt = "Les questions doivent porter sur la logique, les séries numériques, les suites de formes, et les analogies verbales.";
    } else if (category === "dissertation_redaction") {
      specificPrompt = "Étant donné le format QCM, transforme les aspects théoriques de la méthodologie de la dissertation ou de la rédaction en questions de connaissances ou de structure.";
    } else if (category === "cas_pratique") {
      specificPrompt = "Propose des mini-scénarios et demande quelle est la réaction ou la procédure administrative correcte à suivre au Burkina Faso.";
    }

    const prompt = `Tu es un expert en conception de concours pour la fonction publique au Burkina Faso.
Génère un questionnaire de type QCM de niveau ${level} en "${category}".
${specificPrompt}

CONTRAINTES :
1. Nombre de questions : ${numQuestions}
2. Chaque question doit avoir exactement 4 choix.
3. Le sujet doit être spécifiquement adapté au contexte burkinabè (si culture générale, droit ou économie).
4. Pour chaque question, fournis la bonne réponse (index 0 à 3) et une explication pédagogique détaillée.

Matière : ${category}
Niveau requis : ${level}

Réponds UNIQUEMENT avec un tableau JSON d'objets suivant ce schéma :
[
  {
    "question": "Texte de la question",
    "options": ["Choix A", "Choix B", "Choix C", "Choix D"],
    "bonne_reponse": 0,
    "explication": "Pourquoi c'est la bonne réponse..."
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
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              bonne_reponse: { type: Type.NUMBER },
              explication: { type: Type.STRING }
            },
            required: ["question", "options", "bonne_reponse", "explication"]
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Aucun résultat de l'IA");
    
    return parseAiJson(resultText) as PublicServiceQuestion[];
  } catch (error: any) {
    console.error("Public Service Exam AI Prep Error:", error);
    throw new Error(`La génération de concours a échoué: ${error.message}`);
  }
};

// Initialisation paresseuse de l'API Gemini
let aiClient: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'undefined') {
      console.error("Gemini API Key missing or incorrectly configured (placeholder detected).");
      throw new Error("Clé API Gemini non configurée ou invalide.");
    }
    
    aiClient = new GoogleGenAI({ 
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
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
      model: DEFAULT_MODEL,
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
    model: DEFAULT_MODEL,
    config: {
      systemInstruction: `Tu es l'Assistant Intelligent Officiel de CampusBF, la plateforme communautaire de référence pour les étudiants au Burkina Faso (UJKZ, UTS, UNB, UNZ, UVBF, etc.).

TON RÔLE :
1. ACCOMPAGNEMENT ACADÉMIQUE : Aide à la compréhension des cours, résolution d'exercices (Maths, Physique, Droit, Économie, Lettres, etc.), et conseils de méthodologie.
2. ORIENTATION & CARRIÈRE : Conseils pour choisir une filière au Burkina Faso, aide à la rédaction de CV et lettres de motivation pour des stages locaux.
3. CONCOURS FONCTION PUBLIQUE : Tu as une expertise particulière sur les concours au Burkina Faso. Tu peux aider à réviser la Culture Générale, le Droit Burkinabè, l'Économie, les Tests Psychotechniques, et donner des conseils pour la Dissertation/Rédaction et les Cas Pratiques.
4. SERVICES CAMPUSBF : Explique le fonctionnement du Marketplace (vente/achat), de MotoRide (covoiturage étudiant), et de la DocThèque (partage de documents).
5. VIE ÉTUDIANTE : Conseils sur la colocation, les bons plans (Deals) et les événements universitaires.
6. AVANTAGES CAMPUSBF : Networking, accès gratuit à des ressources premium, préparation IA personnalisée, et une communauté d'entraide.
7. DIFFÉRENCE AVEC CAMPUS FASO : Campus Faso (étatique) sert aux inscriptions et bourses. CampusBF est une plateforme communautaire interactive avec des outils de révision, marketplace, et covoiturage que Campus Faso n'offre pas. Nous sommes complémentaires mais différents.

TON EXPERTISE :
- Tu connais parfaitement le système LMD appliqué au Burkina Faso. 
- Mathématiques : Distinction stricte entre l'Algèbre Générale (Logique, Groupes, Anneaux, Corps, Polynômes) et l'Algèbre Linéaire (Matrices, Espaces vectoriels).
- Droit : Connaissances fondamentales du droit burkinabè, de la Constitution, et de l'OHADA.
- Fonction Publique : Tu connais les matières récurrentes (Culture Générale, Français, Psychotechnique).

TON STYLE :
- Amical, encourageant, professionnel et concis.
- Utilise des emojis adaptés.
- Ne confonds JAMAIS CampusBF avec Campus Faso (plateforme de l'État). Tu es indépendant.`,
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
    
    const prompt = `Tu es une IA experte en ingénierie pédagogique, spécialisée dans la création d'évaluations universitaires de type Moodle. 
Ton objectif est de transformer le texte fourni en un quiz de haute qualité pour le niveau ${level}.

CONTEXTE :
- Sujet : ${subject}
- Niveau : ${level}
- Nombre de questions : ${numQuestions}
- Langue : ${lang}
- Difficulté : ${options?.difficulty || 'Standard'}
${options?.instructions ? `- Instructions spécifiques : ${options.instructions}` : ''}
- Types de questions autorisés : ${typesStr}

Matière : ${subject}
Niveau universitaire : ${level}
Nombre de questions : ${numQuestions}
Langue requise : ${lang}
${options?.difficulty ? `Difficulté : ${options.difficulty}` : ''}
${options?.instructions ? `Instructions : ${options.instructions}` : ''}
Types de questions autorisés : ${typesStr}

### Expertise Spécifique :
- Mathématiques : Si le sujet concerne l'Algèbre, distingue strictement l'Algèbre Générale (Structures) et l'Algèbre Linéaire (Espaces vectoriels).
- Sciences / Droit / Économie / Lettres : Utilise une terminologie académique précise et rigoureuse.

Texte source :
"""
${courseText}
"""

DIRECTIVES POUR LES QUESTIONS :
1. multiple_choice : 4 options, un seul index correct.
2. true_false : Exactement 2 options (Vrai/Faux).
3. matching : Liste de paires (left/right) à associer.
4. cloze : Un texte avec des [[gap1]], [[gap2]] et leurs réponses respectives (clozeAnswers doit être un tableau d'objets {gapId, answer}).
5. numerical : Question demandant un chiffre précis (utiliser des string au lieu de float pour éviter les erreurs).
6. short_answer : Réponse textuelle courte et sans ambiguïté.
7. essay : Une question de rédaction. L'étudiant rédigera sa propre réponse qui sera évaluée par l'IA. Renseigner "correctTextAnswer" avec un guide ou résumé de ce qui est attendu.

CONTRANTES JSON :
- Réponds UNIQUEMENT avec un objet JSON valide et complet.
- SOIS CONCIS. Tes explications ("explanation") MUST be less than 20 words to save tokens.
- Pour les questions 'numerical', 'correctNumericAnswer' et 'tolerance' doivent obligatoirement être des nombres ENTIERS (pas de virgule).
- Chaque question DOIT inclure une courte explication pédagogique ("explanation").
- Assure-toi que les questions sont directement dérivées du texte source.

Modèle de format attendu pour l'output :
{
  "title": "Titre du quiz",
  "questions": [
    { "type": "multiple_choice", "question": "...", "options": ["...", "..."], "correctAnswerIndex": 0, "explanation": "..." }
  ]
}`;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192, 
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
                  correctNumericAnswer: { type: Type.STRING },
                  tolerance: { type: Type.STRING },
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
                  clozeTemplate: { type: Type.STRING },
                  clozeAnswers: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        gapId: { type: Type.STRING },
                        answer: { type: Type.STRING }
                      }
                    }
                  }
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

    // Traitement post-génération pour assurer la compatibilité
    let data;
    try {
      data = parseAiJson(resultText);
    } catch (e: any) {
      console.error("Quiz Parse Error:", e.message, "Full text:", resultText);
      throw new Error("L'IA a généré une réponse malformée. Essayez de réduire le nombre de questions.");
    }
    
    const processedQuestions = data.questions.map((q: any) => {
      if (!q.options) q.options = [];
      q.id = 'q_' + Math.random().toString(36).substring(2, 9);
      if (q.type === 'true_false' && q.options.length !== 2) {
        q.options = ['Vrai', 'Faux'];
      }
      
      // Cloze answers conversion: if it was returned as an array of {gapId, answer}, convert to Record<string, string>
      if (q.type === 'cloze' && Array.isArray(q.clozeAnswers)) {
        const answersObj: Record<string, string> = {};
        q.clozeAnswers.forEach((item: any) => {
          if (item.gapId && item.answer) {
            answersObj[item.gapId] = item.answer;
          }
        });
        q.clozeAnswers = answersObj;
      }
      
      if (q.type === 'numerical') {
        if (typeof q.correctNumericAnswer === 'string') {
          q.correctNumericAnswer = parseFloat(q.correctNumericAnswer) || 0;
        }
        if (typeof q.tolerance === 'string') {
          q.tolerance = parseFloat(q.tolerance) || 0;
        }
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
9. essay : Question de composition. L'étudiant rédigera sa réponse qui sera ensuite évaluée par l'IA (fournis un mot-clé ou résumé attendu dans correctTextAnswer).

Pour chaque question :
- Attribue des points appropriés dans pointsPerOption ou via le score global.
- Fournis une explication pédagogique claire (TRÈS COURTE - max 15 mots pour économiser les tokens).
- Pour 'numerical', 'correctNumericAnswer' et 'tolerance' DOIVENT être des ENTIERS (aucune virgule).
- Assure-toi que les questions sont pertinentes au niveau ${level}.

Retourne le résultat sous forme d'un tableau d'objets JSON respectant strictement le schéma fourni.`;
    
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
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
              correctNumericAnswer: { type: Type.STRING },
              tolerance: { type: Type.STRING },
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
      rawQuestions = parseAiJson(text);
      if (!Array.isArray(rawQuestions)) {
        if ((rawQuestions as any).questions && Array.isArray((rawQuestions as any).questions)) {
          rawQuestions = (rawQuestions as any).questions;
        } else {
          throw new Error("Format de tableau attendu.");
        }
      }
    } catch (e: any) {
      console.error("JSON Parse Error (Simple Generator):", e.message, text);
      throw new Error("Réponse de l'IA malformée ou incomplète.");
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

      if (q.type === 'numerical') {
        if (typeof sanitized.correctNumericAnswer === 'string') {
          sanitized.correctNumericAnswer = parseFloat(sanitized.correctNumericAnswer) || 0;
        }
        if (typeof sanitized.tolerance === 'string') {
          sanitized.tolerance = parseFloat(sanitized.tolerance) || 0;
        }
      }

      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        if (typeof sanitized.correctAnswerIndex === 'string') {
          // If it's a string that can be parsed as int
          const parsed = parseInt(sanitized.correctAnswerIndex);
          if (!isNaN(parsed) && parsed >= 0 && parsed < (sanitized.options?.length || 0)) {
            sanitized.correctAnswerIndex = parsed;
          } else {
            // Find by matching string
            const foundIdx = sanitized.options?.findIndex((opt: string) => opt.toLowerCase().trim() === String(sanitized.correctAnswerIndex).toLowerCase().trim());
            sanitized.correctAnswerIndex = foundIdx !== -1 ? foundIdx : 0;
          }
        } else if (typeof sanitized.correctAnswerIndex !== 'number' || isNaN(sanitized.correctAnswerIndex)) {
          sanitized.correctAnswerIndex = 0;
        } else if (sanitized.correctAnswerIndex < 0 || sanitized.correctAnswerIndex >= (sanitized.options?.length || 0)) {
          sanitized.correctAnswerIndex = 0;
        }
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



export const analyzeComment = async (comment: string): Promise<{ isSafe: boolean, reason: string }> => {
  try {
    const ai = getAiClient();
    const prompt = `En tant que modérateur IA de l'application CampusBF (destinée aux étudiants burkinabè), analyse ce commentaire posté sur une vidéo éducative.
    Commentaire: "${comment}"
    
    Ton rôle est strict : tu dois détecter et bloquer tout contenu qui contient des insultes, du harcèlement, de la toxicité extrême, du SPAM évident, des discours de haine, ou des liens malveillants/suspects.
    
    Retourne un objet JSON: {"isSafe": boolean, "reason": "Si isSafe est false, courte explication pour l'utilisateur, sinon vide"}`;
    
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isSafe: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          },
          required: ["isSafe", "reason"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) return { isSafe: true, reason: "" }; // default if empty
    
    return parseAiJson(resultText) as { isSafe: boolean, reason: string };
  } catch (error) {
    console.error("Erreur d'analyse IA modération commentaire:", error);
    // En cas de panne de l'IA on laisse passer pour pas bloquer la prod, le signalement manuel reste possible.
    return { isSafe: true, reason: "" };
  }
};

export const analyzeCommunityVideo = async (title: string, description: string, hashtags: string[], category: string, videoUrl?: string): Promise<{ score: number, status: 'approved' | 'rejected', reason: string }> => {
  try {
    const ai = getAiClient();
    const prompt = `En tant que modérateur IA de CampusBF, analyse cette soumission de vidéo.
    Titre: "${title}"
    Description: "${description}"
    Hashtags: "${hashtags.join(', ')}"
    Catégorie: "${category}"
    URL: "${videoUrl || 'Aucune'}"
    
    Ton rôle est de valider le contenu éducatif et académique de CampusBF.
    - Bloque strictement : contenus inappropriés, violents, non éducatifs, spam, arnaques, contenu adulte.
    - Autorise : Orientation, études, universités, métiers, bourses, conférences, tech, entrepreneuriat, carrière, sciences, éducation, vie étudiante.
    
    Retourne un objet JSON : {"score": number (0-100), "status": "approved" | "rejected", "reason": string}`;
    
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            status: { type: Type.STRING, enum: ['approved', 'rejected'] },
            reason: { type: Type.STRING }
          },
          required: ["score", "status", "reason"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("L'IA n'a pas répondu.");
    
    return parseAiJson(resultText) as { score: number, status: 'approved' | 'rejected', reason: string };
  } catch (error) {
    console.error("Erreur lors de l'analyse IA de la vidéo communautaire:", error);
    // En cas d'erreur de l'IA (quota, etc.), on approuve par défaut pour l'expérience utilisateur
    return { score: 50, status: 'approved', reason: "Analyse automatique momentanément indisponible." };
  }
};

export const evaluateEssayAction = async (question: string, correctTextAnswer: string, studentAnswer: string): Promise<{ score: number, feedback: string }> => {
  try {
    const ai = getAiClient();
    const prompt = `Tu es un professeur notant la réponse d'un étudiant à une question de composition (essai).
Question posée: "${question}"
Critère principal (éléments attendus): "${correctTextAnswer}"
Réponse de l'étudiant: "${studentAnswer}"

Évalue la réponse de l'étudiant selon les critères. Donne un retour court et encourageant, et attribue une note (score) de 0 ou 1. Si la réponse est partiellement bonne ou démontre une bonne compréhension, tu peux donner 1. Sinon 0.

Retourne un objet JSON: { "score": 1, "feedback": "Ton explication..." }`;
    
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING }
          },
          required: ["score", "feedback"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Format AI invalide");
    
    const result = parseAiJson(text);
    return {
      score: result.score || 0,
      feedback: result.feedback || "Aucun retour."
    };
  } catch (error) {
    console.error("Erreur lors de l'évaluation:", error);
    return { score: 0, feedback: "Impossible de générer l'évaluation pour le moment." };
  }
};
export const summarizeDocument = async (documentTitle: string, documentDescription: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `En tant qu'assistant académique de CampusBF, donne-moi un bref aperçu de ce que pourrait contenir ce document et pourquoi il serait utile pour un étudiant, en te basant sur son titre et sa description.\n\nTitre: ${documentTitle}\nDescription: ${documentDescription}\n\nFais une réponse courte (2-3 sentences maximum) et motivante.`;
    
    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
    });
    
    return response.text || "Résumé non disponible.";
  } catch (error) {
    console.error("Erreur lors du résumé:", error);
    return "Impossible de générer un aperçu pour le moment.";
  }
};

export const verifyAndCorrectQuizWithAI = async (questions: QuizQuestion[]): Promise<{ correctedQuestions: QuizQuestion[], qualityScore: number, flaggedIssues: string[] }> => {
  try {
    const ai = getAiClient();
    const prompt = `Tu es un Auditeur Qualité Pédagogique IA. Ta mission est d'analyser, vérifier et corriger un quiz généré.
Critères de vérification :
1. Une seule bonne réponse correcte valide (pour QCM/Vrai Faux).
2. Absence d'ambiguïté, de coquilles, d'erreurs d'orthographe ou de grammaire.
3. Absence de doublons dans les réponses d'une même question.
4. Validité scientifique et pertinence.
5. Explications justes et pédagogiques.
6. Reformuler et corriger les questions et réponses automatiquement pour les rendre parfaites.

Voici le quiz actuel (JSON) :
${JSON.stringify(questions, null, 2)}

Analyse le quiz complet, corrige les erreurs, et retourne un JSON strict contenant :
1. "correctedQuestions": la liste complète des questions (modifiées ou inchangées). Doit respecter le même schéma (objets questions).
2. "qualityScore": le score de qualité perçu du quiz original avant tes corrections (0 à 100).
3. "flaggedIssues": liste (tableau de strings) des erreurs principales trouvées dans le quiz original et les corrections que tu as appliquées. (ex: ["Question 2: doublon retiré", "Question 5: correction de l'orthographe"]).

Retourne UNIQUEMENT LE JSON selon le schéma suivant.`;

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            qualityScore: { type: Type.NUMBER },
            flaggedIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctedQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswerIndex: { type: Type.NUMBER },
                  explanation: { type: Type.STRING },
                  matchingPairs: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: { left: { type: Type.STRING }, right: { type: Type.STRING } }
                    }
                  },
                  correctTextAnswer: { type: Type.STRING },
                  correctNumericAnswer: { type: Type.NUMBER },
                  tolerance: { type: Type.NUMBER },
                  formula: { type: Type.STRING },
                  clozeTemplate: { type: Type.STRING },
                  clozeAnswers: {
                    type: Type.OBJECT
                  }
                },
                required: ["id", "type", "question"]
              }
            }
          },
          required: ["qualityScore", "flaggedIssues", "correctedQuestions"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("L'IA n'a pas répondu.");
    
    const parsed = parseAiJson(resultText);
    return parsed as { correctedQuestions: QuizQuestion[], qualityScore: number, flaggedIssues: string[] };
  } catch (error) {
    console.error("Erreur lors de la double vérification du quiz:", error);
    // Return original questions as a fallback
    return { correctedQuestions: questions, qualityScore: 50, flaggedIssues: ["Échec de la vérification IA automatique - veuillez vérifier manuellement."] };
  }
};

