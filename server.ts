import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Configuration de multer pour stocker le fichier en mémoire avec une limite de 10MB
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  }
});

// Route d'upload vers Cloudinary
app.post('/api/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Erreur d'upload: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: `Erreur serveur: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Aucun fichier fourni ou fichier invalide' });
    }

    // Récupération des variables d'environnement (à configurer dans les Secrets AI Studio)
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn("Configuration Cloudinary manquante, utilisation d'une URL simulée.");
      return res.json({ 
        success: true, 
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 
        fileName: req.file?.originalname || 'document.pdf'
      });
    }

    // Initialisation de Cloudinary
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    // Upload via stream
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto', // Détecte automatiquement si c'est une image, un PDF, etc.
        folder: 'campusbf',
      },
      (error, result) => {
        if (error || !result) {
          console.error('Erreur upload Cloudinary:', error);
          if (!res.headersSent) {
            return res.status(500).json({ error: "Erreur lors de l'upload vers Cloudinary" });
          }
          return;
        }
        
        // Renvoie l'URL sécurisée générée par Cloudinary
        if (!res.headersSent) {
          res.json({ success: true, url: result.secure_url, fileName: req.file?.originalname });
        }
      }
    );

    uploadStream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Erreur de stream lors de l'upload" });
      }
    });

    // Envoi du buffer du fichier dans le stream Cloudinary
    uploadStream.end(req.file.buffer);

  } catch (error) {
    console.error('Erreur inattendue:', error);
    res.status(500).json({ error: "Erreur inattendue lors de l'upload" });
  }
});

async function startServer() {
  // Configuration du middleware Vite pour le développement
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Configuration pour la production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
  });
}

startServer();
