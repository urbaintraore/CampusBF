import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import multer from 'multer';
import { createWorker } from 'tesseract.js';
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

app.post('/backend/ocr', upload.single('file'), async (req, res) => {
  console.log('Received /backend/ocr request');
  if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
  }
  try {
      console.log('Processing file:', req.file.originalname);
      const worker = await createWorker('fra', 1, {
        workerPath: path.resolve(process.cwd(), 'node_modules/tesseract.js/dist/worker.min.js'),
        corePath: path.resolve(process.cwd(), 'node_modules/tesseract.js-core/tesseract-core.wasm.js'),
      });
    const { data: { text } } = await worker.recognize(req.file.buffer);
    await worker.terminate();
    res.json({ text });
  } catch (error) {
    console.error('OCR Error detailed:', error);
    res.status(500).json({ error: 'OCR failed', details: error instanceof Error ? error.message : String(error) });
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
    } else {
      admin.initializeApp();
      console.log('[Server] Firebase Admin initialisé via default credentials');
    }
  } catch (error) {
    console.error('[Server] Erreur lors de l\'initialisation Firebase Admin:', error);
  }
}

app.get('/api/admin/users-stats', async (req, res) => {
  try {
    const db = admin.firestore();
    
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
    const db = admin.firestore();
    
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


