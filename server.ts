import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import admin from 'firebase-admin';
import fs from 'fs/promises';

console.log('Starting server.ts...');
dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Endpoints de notification
app.post('/api/notify/document', async (req, res) => {
  const { title, subject, university, major } = req.body;
  
  const { notifyUsersByFilter } = await import('./src/services/adminNotificationService.ts');
  
  await notifyUsersByFilter(
    (user) => user.major === major || user.university === university,
    {
      title: "Nouveau document disponible",
      body: `Un nouveau document (${title}) a été ajouté dans ta filière ${major}.`,
      type: 'documents',
      data: { subject, university }
    }
  );
  
  res.json({ success: true });
});

app.post('/api/notify/internship', async (req, res) => {
  const { title, company, major, level } = req.body;
  
  const { notifyUsersByFilter } = await import('./src/services/adminNotificationService.ts');
  
  await notifyUsersByFilter(
    (user) => user.major === major && (user.level === level || !level),
    {
      title: "Nouvelle opportunité disponible",
      body: `Une nouvelle offre de stage chez ${company} correspond à ton profil.`,
      type: 'internships',
      data: { title, company }
    }
  );
  
  res.json({ success: true });
});

app.post('/api/notify/contest', async (req, res) => {
  const { title } = req.body;
  
  const { notifyUsersByFilter } = await import('./src/services/adminNotificationService.ts');
  
  await notifyUsersByFilter(
    () => true, // Tous les utilisateurs
    {
      title: "Nouveau concours CampusBF",
      body: `Le concours "${title}" est ouvert. Participe maintenant !`,
      type: 'contests'
    }
  );
  
  res.json({ success: true });
});

app.post('/api/notify/event', async (req, res) => {
  const { title, university } = req.body;
  
  const { notifyUsersByFilter } = await import('./src/services/adminNotificationService.ts');
  
  await notifyUsersByFilter(
    (user) => user.university === university,
    {
      title: "Nouvel événement universitaire",
      body: `L'événement "${title}" arrive bientôt à ${university}.`,
      type: 'events',
      data: { title, university }
    }
  );
  
  res.json({ success: true });
});

app.post('/api/notify/reply', async (req, res) => {
  const { userId, discussionTitle } = req.body;
  
  const { sendNotificationToUser } = await import('./src/services/adminNotificationService.ts');
  
  await sendNotificationToUser(userId, {
    title: "Quelqu'un a répondu à ta question",
    body: `Ta discussion "${discussionTitle}" a reçu une nouvelle réponse.`,
    type: 'forums'
  });
  
  res.json({ success: true });
});

// Vérification de l'inactivité (toutes les 24h)
const checkInactivity = async () => {
  try {
    const { notifyUsersByFilter } = await import('./src/services/adminNotificationService.ts');
    const threeDaysAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000));
    
    await notifyUsersByFilter(
      (user) => user.lastActiveAt && user.lastActiveAt.toDate() < threeDaysAgo.toDate(),
      {
        title: "CampusBF te manque",
        body: "De nouveaux documents et quiz sont disponibles. Reviens voir !",
        type: 'system'
      }
    );
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'inactivité:', error);
  }
};

// Exécuter une fois par jour
setInterval(checkInactivity, 24 * 60 * 60 * 1000);

app.use((req, res, next) => {
  console.log('Request:', req.url);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function startServer() {
  console.log('Mode development détecté. Initialisation de Vite...');
  try {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);
    console.log('Middleware Vite injecté avec succès.');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[DEV] Serveur en écoute sur http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Erreur fatale lors du démarrage de Vite:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV === 'production') {
  console.log('Mode production détecté.');
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PROD] Serveur en écoute sur http://0.0.0.0:${PORT}`);
  });
} else {
  startServer();
}
