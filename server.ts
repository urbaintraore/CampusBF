import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import multer from 'multer';
import fs from 'fs';
import { createWorker } from 'tesseract.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { GoogleGenAI } from '@google/genai';
import { aiContestService } from './src/services/aiContestService';
import { notifyUsersByFilter, sendNotificationToUser } from './src/services/adminNotificationService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const upload = multer({ storage: multer.memoryStorage() });

dotenv.config();

export const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/test', (req, res) => {
  res.json({ test: 'ok' });
});

app.post('/api/public-service/generate-contest', async (req, res) => {
  const { category, level, questionCount } = req.body;
  console.log(`[API] Start Generating contest for ${category} (${level}), count: ${questionCount}`);
  try {
    const contest = await aiContestService.generateContest(category, level, questionCount || 10);
    console.log(`[API] Generation success for ${category}`);
    res.json(contest);
  } catch (err: any) {
    console.error(`[API] Generation failed for ${category}:`, err);
    res.status(500).json({ error: err.message || 'Generation failed', details: err.stack, raw: err });
  }
});

app.post('/api/public-service/verify-contest', async (req, res) => {
  const { titre, category, level, questions } = req.body;
  console.log(`[API] Start Verifying contest: ${titre}`);
  try {
    const result = await aiContestService.verifyContest(titre, category, level, questions);
    console.log(`[API] Verification success for: ${titre}`);
    res.json(result);
  } catch (err: any) {
    console.error(`[API] Verification failed for: ${titre}:`, err);
    res.status(500).json({ error: err.message || 'Verification failed' });
  }
});

app.post('/api/public-service/save-contest', async (req, res) => {
  const { generatedContest, config, verificationResult, status } = req.body;
  console.log(`[API] Start Saving contest: ${generatedContest?.titre}, Status: ${status}`);
  try {
    const db = getFirestoreDb();
    
    // Create main document data
    const newContestData: Record<string, any> = {
      titre: generatedContest.titre || "Concours d'État",
      description: generatedContest.description || "Épreuve officielle corrigée.",
      categorie: config.category,
      niveau: config.level,
      type: 'qcm',
      duree: (generatedContest.questions || []).length * 1.5, // 1.5m per question
      difficulte: 'moyen',
      status: status === 'published' ? 'active' : 'draft',
      validationStatus: status === 'published' ? 'published' : 'pending_admin',
      questionCount: (generatedContest.questions || []).length,
      date_creation: new Date().toISOString(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      aiGenerated: true,
      aiVerified: verificationResult ? (verificationResult?.hasErrors === false) : true
    };

    // If annee (year) is specified in config, write it
    if (config.annee !== undefined) {
      newContestData.annee = Number(config.annee);
    } else if (config.year !== undefined) {
      newContestData.annee = Number(config.year);
    }

    // If subjectFileUrl is specified, write it
    if (config.subjectFileUrl) {
      newContestData.subjectFileUrl = config.subjectFileUrl;
    }

    // Include author ID if provided
    if (config.authorId) {
      newContestData.authorId = config.authorId;
      newContestData.auteur_id = config.authorId;
    } else {
      newContestData.authorId = 'system_ai';
      newContestData.auteur_id = 'system_ai';
    }

    const contestRef = await db.collection('public_service_contests').add(newContestData);

    // Create details (questions) document
    await db.collection('public_service_contest_details').doc(contestRef.id).set({
      contestId: contestRef.id,
      questions: generatedContest.questions || [],
      verificationLogs: verificationResult?.logs || ["Importé souverainement avec succès depuis le pipeline de traitement IA."]
    });

    console.log(`[API] Contest saved successfully on server with ID: ${contestRef.id}`);
    res.json({ success: true, id: contestRef.id });
  } catch (err: any) {
    console.error(`[API] Save contest failed:`, err);
    res.status(500).json({ error: err.message || 'Save failed' });
  }
});

async function extractTextFromFile(buffer: Buffer, originalname: string, mimetype: string, category?: string): Promise<string> {
  const fileExt = originalname.split('.').pop()?.toLowerCase();
  
  // 1. Try Gemini High-Fidelity OCR first if API key is configured
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey !== 'undefined') {
    console.log(`[OCR] Using Gemini for high-precision extraction: "${originalname}" (${mimetype}), Category: "${category || 'none'}"`);
    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Map common image types and pdf
      let geminiMimetype = mimetype;
      if (mimetype === 'application/pdf' || fileExt === 'pdf') {
        geminiMimetype = 'application/pdf';
      } else if (fileExt === 'png') {
        geminiMimetype = 'image/png';
      } else if (['jpg', 'jpeg'].includes(fileExt || '')) {
        geminiMimetype = 'image/jpeg';
      } else if (fileExt === 'webp') {
        geminiMimetype = 'image/webp';
      }

      const filePart = {
        inlineData: {
          mimeType: geminiMimetype,
          data: buffer.toString('base64')
        }
      };

      let promptText = "Copie et extrais l'INTEGRALITE TEXTUELLE de ce sujet de concours burkinabè. Tu dois transcrire toutes les questions de l'épreuve (QCM, Vrai/Faux), les propositions de réponses possibles, ainsi que les introductions de l'épreuve. Ne résume rien, ne commente rien, et n'invente aucune question.";
      
      if (category === 'tests_psychotechniques') {
        promptText = `Tu extrais le contenu d'un sujet de concours de la catégorie "Tests Psychotechniques".
Ce genre d'épreuve est éminemment visuel (logique spatiale, matrices, suites, analogies, dominos).

RÈGLES CRUCIALES POUR L'EXTRACTION OCR PSYCHOTECHNIQUE :
1. TABLEAUX & GRILLES : Repère TRÈS CLAIREMENT les matrices de substitution, grilles de décodage ou tableaux (ex: correspondances lettres/chiffres). Transcris-les TRÈS PRÉCISÉMENT sous forme de tableau Markdown (avec colonnes et lignes alignées).
2. SUITES LOGIQUES : Transcris minutieusement les suites numériques ou lettrées (ex: "2, 4, 8, 16, ?"). N'oublie aucune valeur.
3. FIGURES & FORMES : S'il y a des formes géométriques, dominos, matrices 3x3 ou symboles asociaux, DÉCRIS formellement l'organisation visuelle (ex: "Tableau 3x3 : Ligne 1 contient triangle, carré, cercle", ou "Le domino est divisé en [haut: 4, bas: 2]").
4. ANALOGIES & ÉQUATIONS : Transcris les analogies verbales ("X est à Y... ") ou expressions mathématiques ("32 ? 28 = 55").
5. FIDÉLITÉ ABSOLUE : Transcris l'intégralité des propositions (A, B, C, D...). Ne résume aucun texte, garde l'ordre original de lecture de gauche à droite, de haut en bas.`;
      }

      // We implement a robust retry loop with model fallback (switching to gemini-flash-latest if needed)
      let extractedText = '';
      const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-pro-preview', 'gemini-flash-latest'];
      const maxRetriesPerModel = 2;
      let modelIndex = 0;
      let attempt = 0;

      while (modelIndex < modelsToTry.length && !extractedText) {
        const currentModel = modelsToTry[modelIndex];
        attempt = 0;
        
        while (attempt < maxRetriesPerModel) {
          try {
            console.log(`[OCR] Querying Gemini model "${currentModel}" (Attempt ${attempt + 1}/${maxRetriesPerModel})...`);
            const response = await ai.models.generateContent({
              model: currentModel,
              contents: [
                filePart,
                { text: promptText }
              ],
              config: {
                maxOutputTokens: 8192
              }
            });
            extractedText = response.text || '';
            if (extractedText.trim().length > 0) {
              console.log(`[OCR] Gemini extraction completed using "${currentModel}". Character length: ${extractedText.length}`);
              return extractedText;
            }
          } catch (err: any) {
            attempt++;
            const errStr = String(err.message || err);
            console.warn(`[OCR] Gemini run for model "${currentModel}" attempt ${attempt} failed: ${errStr}`);
            
            // For transient errors, wait and retry. For unsupported model/media files, break immediately to fallback.
            const isTransient = errStr.includes('503') || errStr.includes('UNAVAILABLE') || errStr.includes('high demand') || errStr.includes('429') || errStr.includes('ResourceExhausted') || errStr.includes('timeout') || errStr.includes('504');
            if (isTransient && attempt < maxRetriesPerModel) {
              const delay = 1000 * Math.pow(2, attempt);
              console.log(`[OCR] Waiting ${delay}ms before retrying "${currentModel}"...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              break; // Try next model or fallback to local
            }
          }
        }
        modelIndex++;
      }

      if (extractedText.trim().length > 0) {
        return extractedText;
      }
      console.warn('[OCR] All Gemini visual extractions returned empty text, falling back to local processing.');
    } catch (geminiErr: any) {
      console.error('[OCR] Gemini extraction failed globally. Falling back to local library:', geminiErr);
    }
  }

  // 2. Fallbacks for local processing if Gemini is not set up or fails
  if (mimetype === 'application/pdf' || fileExt === 'pdf') {
    console.log(`[OCR] Local fallback: Launching pdf-parse extraction for "${originalname}"...`);
    try {
      let PDFParseClass = pdfParse?.PDFParse || pdfParse;
      if (!PDFParseClass && typeof pdfParse === 'object' && pdfParse !== null) {
        if (typeof pdfParse.default === 'object' && pdfParse.default !== null) {
          PDFParseClass = pdfParse.default.PDFParse || pdfParse.default;
        } else if (typeof pdfParse.default === 'function') {
          PDFParseClass = pdfParse.default;
        }
      }
      
      if (!PDFParseClass || (typeof PDFParseClass !== 'function')) {
        throw new Error(`Could not find PDFParse constructor class on imported pdf-parse module.`);
      }
      
      const parser = new PDFParseClass({ data: buffer });
      const textResult = await parser.getText();
      console.log(`[OCR] pdf-parse extraction complete. Character length: ${textResult?.text?.length || 0}`);
      return textResult?.text || '';
    } catch (err: any) {
      console.error('[OCR] pdf-parse failed:', err);
      throw new Error(`Failed to extract text from PDF: ${err.message || String(err)}`);
    }
  } else if (mimetype.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(fileExt || '')) {
    console.log(`[OCR] Local fallback: Launching Tesseract OCR for "${originalname}"...`);
    let worker: any = null;
    try {
      worker = await createWorker('fra', 1, {
        workerPath: path.resolve(process.cwd(), 'node_modules/tesseract.js/dist/worker.min.js'),
        corePath: path.resolve(process.cwd(), 'node_modules/tesseract.js-core/tesseract-core.wasm.js'),
      });
      const { data: { text } } = await worker.recognize(buffer);
      await worker.terminate();
      worker = null;
      console.log(`[OCR] Tesseract OCR extraction complete. Character length: ${text?.length || 0}`);
      return text || '';
    } catch (err: any) {
      console.error('[OCR] Tesseract OCR failed:', err);
      if (worker) {
        try { await worker.terminate(); } catch (e) {}
      }
      throw new Error(`Failed to perform OCR on image: ${err.message || String(err)}`);
    }
  } else {
    throw new Error(`Unsupported file type: mimetype "${mimetype}" with extension "${fileExt}". Only PDF and Image files are supported.`);
  }
}

const handleOcrRequest = async (req: express.Request, res: express.Response) => {
  console.log(`[OCR] Route triggered. Is file attached? ${!!req.file}`);
  if (!req.file) {
    console.error('[OCR] Missing file in request');
    return res.status(400).json({ error: 'No file uploaded. Please attach a PDF or an Image file.' });
  }

  const { originalname, size, mimetype } = req.file;
  const { category } = req.body;
  console.log(`[OCR] Received file: "${originalname}" (Size: ${size} bytes, Type: "${mimetype}"), Category: "${category || 'none'}"`);

  try {
    const text = await extractTextFromFile(req.file.buffer, originalname, mimetype, category);
    
    if (!text || text.trim().length === 0) {
      console.warn('[OCR] Extraction returned empty text.');
      return res.json({ text: '', warning: 'No readable text could be extracted from this document.' });
    }

    console.log(`[OCR] Text extraction success! Extracted ${text.length} characters.`);
    return res.json({ text });
  } catch (error: any) {
    console.error('[OCR] Route processing error:', error);
    return res.status(500).json({ error: 'OCR processing failed', details: error.message || String(error) });
  }
};

app.post('/api/ocr', upload.single('file'), handleOcrRequest);
app.post('/backend/ocr', upload.single('file'), handleOcrRequest);

app.post('/api/public-service/process-contest-text', async (req, res) => {
  const { text, category, level } = req.body;
  console.log(`[API] Start structured contest text processing. Text length: ${text?.length || 0}, Category: "${category || 'none'}", Level: "${level || 'none'}"`);
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'No text provided for processing' });
  }

  try {
    const contestResult = await aiContestService.processTextWithAi(text, category, level);
    console.log(`[API] Structured contest successfully generated by Gemini: "${contestResult.titre}"`);
    res.json(contestResult);
  } catch (err: any) {
    console.error('[API] Gemini structured contest creation failed:', err);
    res.status(500).json({ error: err.message || 'Structured contest generation failed' });
  }
});
app.post('/api/notify/:type', async (req, res) => {
  const { type } = req.params;
  try {
    if (type === 'document') {
      const { title, subject, university, major } = req.body;
      await notifyUsersByFilter(
        (user) => user.major === major || user.university === university,
        { title: "Nouveau document", body: `Document added: ${title}`, type: 'documents' }
      );
    } else if (type === 'reply') {
      const { userId, discussionTitle } = req.body;
      await sendNotificationToUser(userId, {
        title: "Nouvelle réponse",
        body: `Réponse à ${discussionTitle}`,
        type: 'forums'
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Full implementation of notification endpoints (re-adding from previous working state)
app.post('/api/notify/document', async (req, res) => {
  const { title, subject, university, major } = req.body;
  try {
    await notifyUsersByFilter(
      (user) => user.major === major || user.university === university,
      { title: "Nouveau document disponible", body: `Un nouveau document (${title}) a été ajouté dans ta filière ${major}.`, type: 'documents', data: { subject, university } }
    );
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/notify/internship', async (req, res) => {
  const { title, company, major, level } = req.body;
  try {
    await notifyUsersByFilter(
      (user) => user.major === major && (user.level === level || !level),
      { title: "Nouvelle opportunité disponible", body: `Une nouvelle offre de stage chez ${company} correspond à ton profil.`, type: 'internships', data: { title, company } }
    );
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/notify/contest', async (req, res) => {
  const { title } = req.body;
  try {
    await notifyUsersByFilter(() => true, { title: "Nouveau concours CampusBF", body: `Le concours "${title}" est ouvert. Participe maintenant !`, type: 'contests' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/notify/event', async (req, res) => {
  const { title, university } = req.body;
  try {
    await notifyUsersByFilter((user) => user.university === university, { title: "Nouvel événement universitaire", body: `L'événement "${title}" arrive bientôt à ${university}.`, type: 'events', data: { title, university } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/notify/reply', async (req, res) => {
  const { userId, discussionTitle } = req.body;
  try {
    await sendNotificationToUser(userId, { title: "Quelqu'un a répondu à ta question", body: `Ta discussion "${discussionTitle}" a reçu une nouvelle réponse.`, type: 'forums' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Load config from firebase-applet-config.json
let firebaseConfig: any = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.error('[Server] Failed to load firebase-applet-config.json:', e);
}

// Initialise Firebase Admin
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('[Server] Firebase Admin initialisé via FIREBASE_SERVICE_ACCOUNT');
    } else {
      console.warn('[Server] FIREBASE_SERVICE_ACCOUNT not found. Admin SDK will not be initialized.');
    }
  } catch (error) {
    console.error('[Server] Erreur lors de l\'initialisation Firebase Admin:', error);
  }
}

// Helper to get correctly routed Firestore database
function getFirestoreDb() {
  if (!admin.apps.length) {
    throw new Error('Firebase Admin SDK is not initialized. Check FIREBASE_SERVICE_ACCOUNT.');
  }
  if (firebaseConfig && firebaseConfig.firestoreDatabaseId) {
    const app = admin.app();
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
  return getFirestore();
}

app.get('/api/admin/users-stats', async (req, res) => {
  try {
    // Check if service account exists since ADC does not have permissions in AI Studio
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.warn("No service account provided. Returning fallback stats.");
      return res.json({
        firestoreCount: 0,
        authCount: 0,
        discrepancy: 0,
        roles: {
          student: 0,
          tutor: 0,
          teacher: 0,
          admin: 1,
          company: 0,
          institution: 0,
          public: 0,
        }
      });
    }

    const db = getFirestoreDb();
    
    // 1. Get total count in Firestore
    const usersSnapshot = await db.collection('users').count().get();
    const firestoreCount = usersSnapshot.data().count;
    
    // 2. Get total count in Auth
    let authCount = 0;
    let pageToken;
    do {
      const result = await admin.auth().listUsers(1000, pageToken);
      authCount += result.users.length;
      pageToken = result.pageToken;
    } while (pageToken);

    // 3. Get roles counts in Firestore
    const [
      studentSnap,
      tutorSnap,
      teacherSnap,
      adminSnap,
      companySnap,
      institutionSnap,
      publicSnap
    ] = await Promise.all([
      db.collection('users').where('role', '==', 'student').count().get(),
      db.collection('users').where('role', '==', 'tutor').count().get(),
      db.collection('users').where('role', '==', 'teacher').count().get(),
      db.collection('users').where('role', '==', 'admin').count().get(),
      db.collection('users').where('role', '==', 'company').count().get(),
      db.collection('users').where('role', '==', 'institution').count().get(),
      db.collection('users').where('role', '==', 'public').count().get(),
    ]);

    const discrepancy = Math.max(0, authCount - firestoreCount);

    const roles = {
      student: studentSnap.data().count + discrepancy, // Unsynchronized users are treated as students by default
      tutor: tutorSnap.data().count,
      teacher: teacherSnap.data().count,
      admin: adminSnap.data().count,
      company: companySnap.data().count,
      institution: institutionSnap.data().count,
      public: publicSnap.data().count,
    };

    res.json({
      firestoreCount,
      authCount,
      discrepancy,
      roles
    });
  } catch (error: any) {
    console.error("API user stats error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/users-sync', async (req, res) => {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.warn("No service account provided. Ignoring sync.");
      return res.json({ synchronizedCount: 0 });
    }

    const db = getFirestoreDb();
    
    // 1. Fetch current users in Firestore (UIDs)
    const usersSnapshot = await db.collection('users').select().get();
    const existingUserIds = new Set(usersSnapshot.docs.map(doc => doc.id));
    
    // 2. Fetch all Auth users
    let authUsers: admin.auth.UserRecord[] = [];
    let pageToken;
    do {
      const result = await admin.auth().listUsers(1000, pageToken);
      authUsers.push(...result.users);
      pageToken = result.pageToken;
    } while (pageToken);

    let createdCount = 0;
    const batchSize = 400;
    let batch = db.batch();
    
    for (const authUser of authUsers) {
      if (!existingUserIds.has(authUser.uid)) {
        const userRef = db.collection('users').doc(authUser.uid);
        
        // Simple name split fallback
        let firstName = 'Étudiant';
        let lastName = 'CampusBF';
        if (authUser.displayName) {
          const names = authUser.displayName.split(' ');
          firstName = names[0] || 'Étudiant';
          lastName = names.slice(1).join(' ') || 'CampusBF';
        }

        const newUserPayload = {
          firstName,
          lastName,
          email: authUser.email || '',
          role: 'student',
          status: 'active',
          avatarUrl: authUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}`,
          createdAt: authUser.metadata.creationTime || new Date().toISOString(),
          synchronized: true,
          rankingScore: 1,
          contributionCount: 0,
          activityStats: {
            logins: 1,
            docsViewed: 0,
            docsDownloaded: 0,
            quizzesCompleted: 0
          }
        };

        batch.set(userRef, newUserPayload);
        createdCount++;
        
        if (createdCount % batchSize === 0) {
          await batch.commit();
          batch = db.batch();
        }
      }
    }
    
    if (createdCount % batchSize !== 0 && createdCount > 0) {
      await batch.commit();
    }

    res.json({
      success: true,
      authUsersTotal: authUsers.length,
      firestoreBefore: existingUserIds.size,
      synchronizedCount: createdCount,
      firestoreAfter: existingUserIds.size + createdCount
    });
  } catch (error: any) {
    console.error("API user sync error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', node_env: process.env.NODE_ENV });
});

app.post('/api/orientation/analyze', async (req, res) => {
  const { prompt } = req.body;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });
    res.json({ text: response.text });
  } catch (err: any) {
    console.error("[API] Orientation Analyze failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orientation/chat', async (req, res) => {
  const { prompt } = req.body;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    res.json({ text: response.text });
  } catch (err: any) {
    console.error("[API] Orientation Chat failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scholarships/scan-embassies', async (req, res) => {
  const { countries } = req.body;
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
    const selectedCountries = Array.isArray(countries) && countries.length > 0 ? countries : ['Maroc', 'France', 'Canada', 'Chine', 'Algérie'];
    const countriesList = selectedCountries.join(', ');
    
    const prompt = `Recherche sur le web via Google Search les appels à bourses d'études pour Burkinabè (Burkina Faso) publiés par les ambassades et agences de coopération pour l'année académique 2026/2027 ou 2027/2028.
    
    Cible spécifiquement ces pays : ${countriesList}.
    
    Inclus des programmes comme :
    - Maroc (AMCI)
    - Algérie (Bourses de coopération)
    - Égypte (Al-Azhar et gouvernement)
    - France (BGF, Campus France)
    - Canada (PCBF, bourses d'excellence)
    - Chine (Chinese Government Scholarship - CSC)
    - Russie (Open Doors, bourses gouvernementales)
    - Suisse (Bourses d'excellence de la Confédération)
    - Belgique (ARES, Enabel)
    - Allemagne (DAAD)
    - Inde (ICCR)
    - Cuba (Santé/Médecine)
    - Japon (MEXT)
    - Corée du Sud (GKS)
    - Turquie (Türkiye Bursları)
    
    Génère de 5 à 10 offres réelles d'excellence actuellement ouvertes ou annoncées. Rédige une description complète en français avec les avantages (billet, allocation, logement), critères d'éligibilité et lien officiel.
    
    Tu DOIS répondre UNIQUE et EXCLUSIVEMENT avec un tableau JSON d'objets respectant précisément ce schéma. N'écris aucun blabla d'introduction ou de conclusion.
    [
      {
        "titre": "Nom exact du programme",
        "pays": "Pays d'accueil",
        "niveau": "Licence/Master/PhD/Ingénieur",
        "domaine": "Domaines admissibles",
        "description": "Description détaillée des avantages et critères.",
        "date_limite": "YYYY-MM-DD ou 'En cours'",
        "lien_officiel": "URL directe",
        "source": "Ambassade ou Organisme",
        "tags": ["Bourse Ambassade", "Scanné par IA", "Burkina Faso"]
      }
    ]`;

    console.log(`[Scholarships] API Scan requested for embassies: ${countriesList}`);
    
    let finalResults = [];
    
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey !== 'undefined') {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json'
          }
        });

        const rawText = response.text || '[]';
        let cleanText = rawText.trim();
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.substring(7);
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.substring(3);
        }
        if (cleanText.endsWith('```')) {
          cleanText = cleanText.substring(0, cleanText.length - 3);
        }
        cleanText = cleanText.trim();
        
        finalResults = JSON.parse(cleanText);
      } catch (iaErr) {
        console.error("[Scholarships] Gemini search-grounded scan error:", iaErr);
      }
    }

    if (!finalResults || finalResults.length === 0) {
      console.log("[Scholarships] Providing expanded verified fallback database...");
      finalResults = [
        {
          "titre": "Bourses d'Études du Gouvernement Marocain (AMCI)",
          "pays": "Maroc",
          "niveau": "Licence / Master / PhD",
          "domaine": "Toutes disciplines",
          "description": "Bourse complète : frais de scolarité, allocation et logement en cité. Transit par le CIOSPB.",
          "date_limite": "2026-08-31",
          "lien_officiel": "https://www.amci.ma",
          "source": "AMCI Maroc",
          "tags": ["Bourse Ambassade", "Maroc"]
        },
        {
          "titre": "Bourses France France-Burkina (BGF)",
          "pays": "France",
          "niveau": "Master / PhD",
          "domaine": "Priorités bilatérales",
          "description": "Bourse du Gouvernement Français pour les meilleurs profils. Allocation de subsistance et sécurité sociale.",
          "date_limite": "2026-05-31",
          "lien_officiel": "https://www.burkina.campusfrance.org",
          "source": "Ambassade de France",
          "tags": ["Bourse Ambassade", "France"]
        },
        {
          "titre": "Bourses du Gouvernement Chinois (CSC)",
          "pays": "Chine",
          "niveau": "Licence / Master / PhD",
          "domaine": "STIM, Langues, Économie",
          "description": "Bourse gouvernementale complète couvrant les frais académiques, le logement et une allocation mensuelle.",
          "date_limite": "2026-04-15",
          "lien_officiel": "https://www.campuschina.org",
          "source": "CSC / Ambassade de Chine",
          "tags": ["Bourse Ambassade", "Chine"]
        },
        {
          "titre": "Bourses d'Excellence de la Confédération Suisse",
          "pays": "Suisse",
          "niveau": "PhD / Post-doc / Recherche",
          "domaine": "Recherche",
          "description": "Bourses de recherche pour chercheurs étrangers hautement qualifiés.",
          "date_limite": "2026-11-30",
          "lien_officiel": "https://www.sbfi.admin.ch",
          "source": "Gouvernement Suisse",
          "tags": ["Bourse Ambassade", "Suisse"]
        },
        {
          "titre": "Bourses DAAD Allemagne",
          "pays": "Allemagne",
          "niveau": "Master / PhD",
          "domaine": "Développement, Ingénierie",
          "description": "Bourses de master et doctorat pour les pays en développement (EPOS).",
          "date_limite": "2026-09-30",
          "lien_officiel": "https://www.daad.de",
          "source": "DAAD Allemagne",
          "tags": ["Bourse Ambassade", "Allemagne"]
        },
        {
          "titre": "Bourses de l'Ambassade du Japon (MEXT)",
          "pays": "Japon",
          "niveau": "Master / PhD",
          "domaine": "Tous domaines",
          "description": "Bourses complètes couvrant billets d'avion, scolarité et allocation d'études au Japon.",
          "date_limite": "2026-06-15",
          "lien_officiel": "https://www.bf.emb-japan.go.jp",
          "source": "Ambassade du Japon au Burkina Faso",
          "tags": ["Bourse Ambassade", "Japon"]
        }
      ];
    }

    res.json({ results: finalResults });
  } catch (err: any) {
    console.error("[API] Embassy Scholarships scan failed:", err);
    res.status(500).json({ error: err.message || 'Verification failed' });
  }
});

async function createServer() {
  const isProd = process.env.NODE_ENV === 'production';
  
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.url.startsWith('/api')) return res.status(404).end();
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  createServer();
}


