import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
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

const app = express();
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
    res.status(500).json({ error: err.message || 'Generation failed' });
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

async function extractTextFromFile(buffer: Buffer, originalname: string, mimetype: string): Promise<string> {
  const fileExt = originalname.split('.').pop()?.toLowerCase();
  
  // 1. Try Gemini High-Fidelity OCR first if API key is configured
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey !== 'undefined') {
    console.log(`[OCR] Using Gemini 3.5 Flash for high-precision extraction: "${originalname}" (${mimetype})`);
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

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          filePart,
          { text: "Copie et extrais l'INTEGRALITE TEXTUELLE de ce sujet de concours burkinabè. Tu dois transcrire toutes les questions de l'épreuve (QCM, Vrai/Faux), les propositions de réponses possibles, ainsi que les introductions de l'épreuve. Ne résume rien, ne commente rien, et n'invente aucune question." }
        ]
      });

      const extractedText = response.text || '';
      console.log(`[OCR] Gemini extraction completed. Character length: ${extractedText.length}`);
      if (extractedText.trim().length > 0) {
        return extractedText;
      }
      console.warn('[OCR] Gemini returned empty text, falling back to local processing.');
    } catch (geminiErr: any) {
      console.error('[OCR] Gemini extraction failed. Falling back to local library:', geminiErr);
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
  console.log(`[OCR] Received file: "${originalname}" (Size: ${size} bytes, Type: "${mimetype}")`);

  try {
    const text = await extractTextFromFile(req.file.buffer, originalname, mimetype);
    
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
  const { text } = req.body;
  console.log(`[API] Start structured contest text processing. Text length: ${text?.length || 0}`);
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'No text provided for processing' });
  }

  try {
    const contestResult = await aiContestService.processTextWithAi(text);
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
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
      : null;

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('[Server] Firebase Admin initialisé via FIREBASE_SERVICE_ACCOUNT');
    } else if (firebaseConfig && firebaseConfig.projectId) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId
      });
      console.log(`[Server] Firebase Admin initialisé via default credentials pour le projet: ${firebaseConfig.projectId}`);
    } else {
      admin.initializeApp();
      console.log('[Server] Firebase Admin initialisé via default credentials');
    }
  } catch (error) {
    console.error('[Server] Erreur lors de l\'initialisation Firebase Admin:', error);
  }
}

// Helper to get correctly routed Firestore database
function getFirestoreDb() {
  if (firebaseConfig && firebaseConfig.firestoreDatabaseId) {
    return admin.firestore(firebaseConfig.firestoreDatabaseId);
  }
  return admin.firestore();
}

app.get('/api/admin/users-stats', async (req, res) => {
  try {
    // Check either service account OR dynamic app config exists
    if (!process.env.FIREBASE_SERVICE_ACCOUNT && (!firebaseConfig || !firebaseConfig.projectId)) {
      console.warn("Neither service account nor applet config provided. Returning fallback stats.");
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
    if (!process.env.FIREBASE_SERVICE_ACCOUNT && (!firebaseConfig || !firebaseConfig.projectId)) {
      console.warn("Neither service account nor applet config provided. Ignoring sync.");
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

createServer();


