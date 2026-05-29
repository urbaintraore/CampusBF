import { GoogleGenAI, Type } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'undefined') {
      console.error("[AI Service] Gemini API Key missing or placeholder detected.");
      console.log("[AI Service] Env keys check:", Object.keys(process.env).filter(k => k.includes('GEMINI')));
      throw new Error('GEMINI_API_KEY environment variable is required and must be valid. Please check your Secrets in Settings.');
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

export interface PSQuestion {
  question: string;
  options: string[];
  bonne_reponse: number;
  explication: string;
}

export interface PSContest {
  titre: string;
  description: string;
  questions: PSQuestion[];
}

export interface PSVerificationResult {
  hasErrors: boolean;
  logs: string[];
  questionsChecked: number;
  correctedQuestions: PSQuestion[];
}

const categoryLabels: Record<string, string> = {
  culture_generale: 'Culture Générale',
  maths: 'Mathématiques',
  droit: 'Droit & Administration',
  economie: 'Économie & Finances',
  svt: 'SVT / Santé',
  physique: 'Physique',
  chimie: 'Chimie',
  dissertation_redaction: 'Dissertation / Rédaction',
  tests_psychotechniques: 'Tests Psychotechniques',
  cas_pratique: 'Cas pratique',
  actualite_retrospective: 'Actualité et rétrospective',
  societes_evenements: 'Sociétés-Evènements',
  institutions_nationales_internationales: 'Institutions nationales et internationales',
  culture_litterature_internationales: 'Culture littérature et internationale',
  culture_litteraire_artistique: 'Culture littéraire et artistique',
  histoire: 'Histoire',
  geographie: 'Géographie',
  philosophie: 'Philosophie',
  psychologie: 'Psychologie',
  sociologie: 'Sociologie',
  francais: 'Français',
  sciences_technologie: 'Sciences et technologie',
  connaissances_burkina: 'Connaissances sur le Burkina',
  test_niveau: 'Test de Niveau'
};

export const aiContestService = {
  /**
   * Generates a realistic mock public service exam for Burkina Faso
   */
  async generateContest(
    category: string,
    level: string,
    questionCount: number = 10
  ): Promise<PSContest> {
    const categoryName = categoryLabels[category] || category;
    
    const prompt = `Génère un concours d'examen factuel et rigoureux pour la fonction publique du Burkina Faso.
Thème/Catégorie : ${categoryName} (Code: ${category})
Niveau d'étude ciblé : ${level} (ex: BEPC, BAC, Licence, Master) En s'assurant que la difficulté est adaptée.
Nombre de questions : ${questionCount}

La moitié des questions (ou au moins 3) doivent être de type QCM de Culture Générale / Raisonnement / Connaissances du Burkina / Droit avec 4 options.
L'autre moitié peut être de type Vrai / Faux (avec obligatoirement 2 options: ["Vrai", "Faux"]).
Pour chaque question, fournis la bonne réponse (index à base 0 de l'option correcte) et une explication pédagogique détaillée en français indiquant précisément pourquoi cette réponse est la bonne (e.g. contexte historique, loi burkinabè, logique mathématique).

Titre suggéré et description doivent faire référence au Burkina Faso ou aux concours d'intégration réels (par exemple: ENA, Inspecteurs des Impôts, Enseignement, Assistants de Cabinet, Douanes).`;

    const systemInstruction = `Tu es une IA experte dans la modélisation et la génération de sujets de concours d'intégration à la fonction publique du Burkina Faso (exams réels d'État, ENA, Ministère de l'Économie et des Finances).
Sois extrêmement précis et factuel sur les dates historiques du Burkina Faso, l'administration, la géo burkinabè, la constitution et les ministères.
Génère un contenu irréprochable et renvoie le résultat dans le format JSON demandé.`;

    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titre: {
                type: Type.STRING,
                description: 'Titre professionnel du concours (ex: Concours Blanc - Greffe et Magistrature - Niveau Licence)'
              },
              description: {
                type: Type.STRING,
                description: 'Description introductive rappelant le cadre officiel et les coefficients applicables d\'après les usages au BF.'
              },
              questions: {
                type: Type.ARRAY,
                description: 'Tableau des questions générées.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING, description: 'L\'énoncé complet et précis de la question.' },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'Réponses proposées. Si Vrai/Faux, doit être exactement ["Vrai", "Faux"]. Sinon, 4 propositions élégantes.'
                    },
                    bonne_reponse: {
                      type: Type.INTEGER,
                      description: 'L\'index de la bonne réponse dans le tableau options (index comence à 0).'
                    },
                    explication: {
                      type: Type.STRING,
                      description: 'Une explication justificative et sourcée basée sur l\'histoire ou l\'administration du pays.'
                    }
                  },
                  required: ['question', 'options', 'bonne_reponse', 'explication']
                }
              }
            },
            required: ['titre', 'description', 'questions']
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("L'IA n'a pas renvoyé de texte.");
      }

      return JSON.parse(text) as PSContest;
    } catch (error) {
      console.error('[AI Service] Error generating contest:', error);
      throw error;
    }
  },

  /**
   * Run a second AI agent instance to audit, perform cross-verification
   *, detect hallucinations or incorrect answers, and return corrections & logs.
   */
  async verifyContest(
    titre: string,
    category: string,
    level: string,
    questions: PSQuestion[]
  ): Promise<PSVerificationResult> {
    const categoryName = categoryLabels[category] || category;
    
    const prompt = `Analyse de manière hyper-critique les questions de l'examen suivant pour les concours d'État au Burkina Faso :
Titre : ${titre}
Catégorie : ${categoryName}
Niveau : ${level}

Sujet d'examen à vérifier:
${JSON.stringify(questions, null, 2)}

Instructions :
1. Examine chaque question une à une.
2. Vérifie s'il y a des hallucinations, des affirmations factuellement douteuses (ex: mauvaise date sur l'insurrection de 2014, confusion juridique), ou des contradictions entre la question, les options et la bonne réponse indexée.
3. Si l'index de la 'bonne_reponse' n'indique pas la bonne option d'après l'explication, corrige-le.
4. Si les propositions de réponses sont ambiguës, clarifie-les.
5. Produis un rapport contenant des logs détaillés sur chaque anomalie trouvée.
6. Renvoie un tableau entier de questions corrigées (décision souveraine sans ambiguïté) et le diagnostic global.`;

    const systemInstruction = `Tu es un réviseur senior ultra-rigoriste des épreuves de recrutement de la fonction publique du Burkina Faso.
Tu as une tolérance zéro pour les approximations, les dates floues ou les erreurs de clés de réponses.
Tu analyzes et modifies si nécessaire le JSON d'entrée afin de garantir des questions d'un standing irréprochable et d'une rigueur absolue.
Renvoie un JSON conforme au schema exigé.`;

    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2, // Low temperature for maximum factual reliability
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hasErrors: {
                type: Type.BOOLEAN,
                description: 'True si une anomalie, erreur factuelle ou dérive de clé a été identifiée et corrigée.'
              },
              logs: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Liste étape par étape des remarques critiques de vérification (ex: "Question 2 corrigée : L\'Insurrection Populaire a eu lieu en Octobre 2014 et non en 2015.").'
              },
              questionsChecked: {
                type: Type.INTEGER,
                description: 'Le nombre total de questions passées au crible.'
              },
              correctedQuestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    bonne_reponse: { type: Type.INTEGER },
                    explication: { type: Type.STRING }
                  },
                  required: ['question', 'options', 'bonne_reponse', 'explication']
                }
              }
            },
            required: ['hasErrors', 'logs', 'questionsChecked', 'correctedQuestions']
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("L'IA n'a pas renvoyé de rapport d'audit.");
      }

      return JSON.parse(text) as PSVerificationResult;
    } catch (error) {
      console.error('[AI Service] Error verifying contest:', error);
      throw error;
    }
  },

  /**
   * Processes raw text (such as file OCR or PDF parse output) with Gemini to structure a complete contest
   */
  async processTextWithAi(text: string, category?: string, level?: string): Promise<PSContest> {
    const isPsychotechnique = category === 'tests_psychotechniques';
    
    let psychotechInstruction = '';
    if (isPsychotechnique) {
      psychotechInstruction = `
--- CONSIGNES SPÉCIFIQUES POUR LES TESTS PSYCHOTECHNIQUES ---
Tu structures un véritable examen de Tests Psychotechniques (raisonnement logique, numérique, verbal, spatial, suites, analogies, matrices, dominos).
Ce genre de test s'appuie TOUJOURS sur des grilles, des règles logiques ou des consignes d'opérateurs.

1. INTÈGRES TOUJOURS LE CONTEXTE ET LA RÈGLE (GRILLE/MATRICE/IMAGE DÉCRITE) DANS L'ÉNONCÉ DE CHAQUE QUESTION !
   Chaque question générée dans 'questions' doit être ENTIÈREMENT AUTONOME ET SOLUBLE :
   - Inclus la consigne globale et la série.
   - S'il y a un tableau (vrai/faux, valeurs logiques, matrice carrée), retranscris-le formellement en texte ou en Markdown (ex: matrice 3x3) dans le champ 'question'.
   - S'il s'agit d'une suite logique (ex: Suites numériques ou de lettres "2, 4, 8, 16, ?"), donne la série complète dans la 'question'.
   - S'il s'agit d'analogies (ex: "Chien est à poil ce que Oiseau est à ?"), formule clairement l'analogie.
   SANS CE CONTEXTE, L'ÉTUDIANT NE PEUT PAS LÉGITIMEMENT TROUVER LA RÉPONSE !

2. RÉSOUDRE LES QUESTIONS DE MANIÈRE RIGOUREUSE :
   - Fais le travail de logique silencieusement (matrices, suites arithmétiques/géométriques, règles de substitution).
   - Localise la réponse absolue. S'assure que la 'bonne_reponse' pointe exactement vers l'index de l'option correcte.

3. EXPLIQUE LE CHEMINEMENT DU CALCUL/RAISONNEMENT :
   - L' 'explication' doit détailler pas à pas la solution de façon très abrégée (ex: "La suite est +2, +4, +6... donc 16+8 = 24", ou "Chaque figure pivote de 90°", ou "(92 - 42) * 10 = 500").
`;
    }

    const prompt = `Tu es un expert en conception de concours d'intégration à la fonction publique du Burkina Faso.
Prends le texte brut suivant, issu d'un traitement OCR ou d'une extraction de sujet de concours (PDF ou Image).
Analyse-le pour en extraire l'épreuve de QCM de manière structurée.

CONSIGNES DE RIGUEUR ET DE FIDÉLITÉ ABSOLUE :
1. Tu dois UNIQUEMENT extraire les questions réelles présentes dans le texte brut fourni ci-dessous.
2. Il est STRICTEMENT INTERDIT d'inventer des questions imagées ou d'ajouter de nouvelles questions qui ne figurent pas dans le texte brut.
3. Si le texte brut contient des questions, extrait-les exactement telles qu'elles sont formulées (tu peux corriger l'orthographe ou assembler les mots coupés par l'OCR, mais n'en invente aucune).
4. Si aucune question claire n'est détectée dans le texte brut, renvoie une liste de questions vide dans le JSON plutôt que d'en inventer.
${psychotechInstruction}

Directives de structuration :
- Détecte le titre de l'épreuve ou génères-en un représentatif d'après les mots clés du sujet d'origine.
- Détecte la description ou l'introduction (cadre législatif, ministère concerné, ou synthèse adaptée au contexte burkinabè).
- EXTRAIS 100% DES QUESTIONS DÉTECTÉES (QCM ou Vrai/Faux) sans en omettre une seule.
- Identifie la bonne réponse pour chaque question (index à base 0 de l'option correcte). Si le sujet d'origine n'indique pas la bonne réponse, utilise ton expertise burkinabè en droit, histoire, géo, administration et culture générale pour répondre de façon 100% correcte.
- Rédige une explication pédagogique ULTRA-BRÈVE ET CONCISE (1 seule phrase simple, maximum 25 mots) pour chaque question. C'est CRUCIAL de respecter cette brièveté pour éviter de dépasser la limite de jetons (token limit) et permettre d'inclure la TOTALITÉ de l'épreuve.

Texte brut extrait :
"""
${text}
"""
`;

    const systemInstruction = `Tu es l'éminent concepteur de concours d'intégration de l'École Nationale d'Administration et de la Magistrature (ENAM) du Burkina Faso.
Ta priorité absolue est d'extraire fidèlement la TOTALITÉ (100%) des questions présentes dans l'épreuve brute sous format JSON, sans jamais en omettre et sans JAMAIS en inventer de nouvelles de toutes pièces.
Pour que toutes les questions puissent rentrer dans l'objet réponse sans troncature, écris obligatoirement des explications ultra-courtes de maximum 25 mots par question.`;

    let extractedResponseText = '';
    
    // Add 3.1-pro-preview as a fallback or if psychotech
    const modelsToTry = isPsychotechnique 
      ? ['gemini-3.1-pro-preview', 'gemini-3.5-flash', 'gemini-flash-latest'] 
      : ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-flash-latest'];
      
    const maxRetriesPerModel = 2;
    let modelIndex = 0;
    let lastError: any = null;

    while (modelIndex < modelsToTry.length && !extractedResponseText) {
      const currentModel = modelsToTry[modelIndex];
      let attempt = 0;

      while (attempt < maxRetriesPerModel) {
        try {
          console.log(`[AI Service] Querying Gemini model "${currentModel}" for structuring (Attempt ${attempt + 1}/${maxRetriesPerModel})...`);
          const ai = getAiClient();
          const response = await ai.models.generateContent({
            model: currentModel,
            contents: prompt,
            config: {
              systemInstruction,
              temperature: 0.3,
              maxOutputTokens: 8192,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  titre: { type: Type.STRING, description: 'Titre de l\'examen (ex: Concours ENA - Économie générale 1999)' },
                  description: { type: Type.STRING, description: 'Description du concours et son contexte' },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        question: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        bonne_reponse: { type: Type.INTEGER, description: 'Index à base 0 de la réponse exacte.' },
                        explication: { type: Type.STRING }
                      },
                      required: ['question', 'options', 'bonne_reponse', 'explication']
                    }
                  }
                },
                required: ['titre', 'description', 'questions']
              }
            }
          });

          extractedResponseText = response.text || '';
          if (extractedResponseText.trim().length > 0) {
            console.log(`[AI Service] Structuring success using model "${currentModel}". Text length: ${extractedResponseText.length}`);
            
            let jsonText = extractedResponseText.trim();
            if (jsonText.startsWith('```json')) {
              jsonText = jsonText.replace(/^```json/, '').replace(/```$/, '').trim();
            } else if (jsonText.startsWith('```')) {
              jsonText = jsonText.replace(/^```/, '').replace(/```$/, '').trim();
            }
            
            return JSON.parse(jsonText) as PSContest;
          }
        } catch (error: any) {
          attempt++;
          lastError = error;
          const errStr = String(error.message || error) + (error.stack || '');
          console.warn(`[AI Service] Structuring try ${attempt} with configuration "${currentModel}" failed: ${errStr}`);
          
          const isTransient = errStr.includes('503') || errStr.includes('UNAVAILABLE') || errStr.includes('high demand') || errStr.includes('429') || errStr.includes('ResourceExhausted') || errStr.includes('timeout') || errStr.includes('504') || errStr.toLowerCase().includes('json');
          if (isTransient && attempt < maxRetriesPerModel) {
            const delay = 1000 * Math.pow(2, attempt);
            console.log(`[AI Service] Waiting ${delay}ms before retrying "${currentModel}"...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            break; // Move to fallback model
          }
        }
      }
      modelIndex++;
    }

    throw lastError || new Error("Failed to structure the contest after trying all available models and retries.");
  }
};
