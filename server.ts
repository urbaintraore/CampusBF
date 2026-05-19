import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import multer from 'multer';
import { createWorker } from 'tesseract.js';

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
    const { notifyUsersByFilter, sendNotificationToUser } = await import('./src/services/adminNotificationService.ts');
    
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
    // ... (other types simplified for brevity of the logic check, keeping current one for full support)
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Full implementation of notification endpoints (re-adding from previous working state)
app.post('/api/notify/document', async (req, res) => {
  const { title, subject, university, major } = req.body;
  try {
    const { notifyUsersByFilter } = await import('./src/services/adminNotificationService.ts');
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
    const { notifyUsersByFilter } = await import('./src/services/adminNotificationService.ts');
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
    const { notifyUsersByFilter } = await import('./src/services/adminNotificationService.ts');
    await notifyUsersByFilter(() => true, { title: "Nouveau concours CampusBF", body: `Le concours "${title}" est ouvert. Participe maintenant !`, type: 'contests' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/notify/event', async (req, res) => {
  const { title, university } = req.body;
  try {
    const { notifyUsersByFilter } = await import('./src/services/adminNotificationService.ts');
    await notifyUsersByFilter((user) => user.university === university, { title: "Nouvel événement universitaire", body: `L'événement "${title}" arrive bientôt à ${university}.`, type: 'events', data: { title, university } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/notify/reply', async (req, res) => {
  const { userId, discussionTitle } = req.body;
  try {
    const { sendNotificationToUser } = await import('./src/services/adminNotificationService.ts');
    await sendNotificationToUser(userId, { title: "Quelqu'un a répondu à ta question", body: `Ta discussion "${discussionTitle}" a reçu une nouvelle réponse.`, type: 'forums' });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
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


