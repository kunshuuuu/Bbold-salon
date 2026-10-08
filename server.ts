import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '.bbold-server-data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const STORE_FILE = path.join(DATA_DIR, 'universal-store.json');

interface ServerStoreFile {
  updatedAt: string;
  tables: Record<string, unknown>;
  imagesBackup: Record<string, string>;
}

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function readServerStore(): ServerStoreFile {
  ensureDirectories();
  if (!fs.existsSync(STORE_FILE)) {
    return {
      updatedAt: new Date().toISOString(),
      tables: {},
      imagesBackup: {},
    };
  }
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ServerStoreFile>;
    return {
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      tables: parsed.tables && typeof parsed.tables === 'object' ? parsed.tables : {},
      imagesBackup:
        parsed.imagesBackup && typeof parsed.imagesBackup === 'object'
          ? parsed.imagesBackup
          : {},
    };
  } catch {
    return {
      updatedAt: new Date().toISOString(),
      tables: {},
      imagesBackup: {},
    };
  }
}

function writeServerStore(store: ServerStoreFile): void {
  ensureDirectories();
  store.updatedAt = new Date().toISOString();
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

function saveDataUrlToDisk(
  dataUrl: string,
  folder: string,
  store: ServerStoreFile
): string {
  const safeFolder =
    String(folder || 'uploads')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 40) || 'uploads';
  const folderPath = path.join(UPLOADS_DIR, safeFolder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  let ext = 'webp';
  const mimeMatch = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,/);
  if (mimeMatch) {
    const sub = mimeMatch[1].toLowerCase();
    if (sub === 'jpeg' || sub === 'jpg') ext = 'jpg';
    else if (sub === 'png') ext = 'png';
    else if (sub === 'gif') ext = 'gif';
    else if (sub === 'svg+xml') ext = 'svg';
    else ext = 'webp';
  }

  const commaIdx = dataUrl.indexOf(',');
  const base64Data = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const buffer = Buffer.from(base64Data, 'base64');

  const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 16);
  const fileName = `img-${hash}.${ext}`;
  const filePath = path.join(folderPath, fileName);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, buffer);
  }

  store.imagesBackup[`${safeFolder}/${fileName}`] = base64Data;
  return `/api/uploads/${safeFolder}/${fileName}`;
}

/**
 * Recursively converts any inline `data:image/...;base64,...` strings inside table payloads
 * into `/api/uploads/migrated/...` files so all devices get fast, universal image URLs.
 */
function normalizeInlineImages(value: unknown, store: ServerStoreFile): unknown {
  if (typeof value === 'string') {
    if (value.startsWith('data:image/') && value.includes(';base64,')) {
      try {
        return saveDataUrlToDisk(value, 'migrated', store);
      } catch {
        return value;
      }
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeInlineImages(item, store));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = normalizeInlineImages(v, store);
    }
    return out;
  }
  return value;
}

function getMimeTypeForFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'image/webp';
}

async function startServer() {
  ensureDirectories();
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Allow large base64 image uploads
  app.use(express.json({ limit: '50mb' }));

  // 1. GET /api/universal-store — Fetch all shared tables across devices
  app.get('/api/universal-store', (_req, res) => {
    const store = readServerStore();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
      ok: true,
      updatedAt: store.updatedAt,
      tables: store.tables,
    });
  });

  // 2. POST /api/universal-store — Save a table or multiple tables universally
  app.post('/api/universal-store', (req, res) => {
    try {
      const store = readServerStore();
      const body = req.body as {
        key?: string;
        value?: unknown;
        entries?: Record<string, unknown>;
        onlyIfMissing?: boolean;
      };

      if (body.key && typeof body.key === 'string') {
        if (!body.onlyIfMissing || !(body.key in store.tables)) {
          store.tables[body.key] = normalizeInlineImages(body.value, store);
        }
      }

      if (body.entries && typeof body.entries === 'object') {
        for (const [k, v] of Object.entries(body.entries)) {
          if (!body.onlyIfMissing || !(k in store.tables)) {
            store.tables[k] = normalizeInlineImages(v, store);
          }
        }
      }

      writeServerStore(store);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ok: true,
        updatedAt: store.updatedAt,
        tables: store.tables,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to save universal store',
      });
    }
  });

  // 3. POST /api/upload — Save an uploaded image to server disk & return universal URL
  app.post('/api/upload', (req, res) => {
    try {
      const { dataUrl, folder = 'uploads' } = req.body as {
        dataUrl?: string;
        folder?: string;
      };

      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        res.status(400).json({ ok: false, error: 'Invalid image dataUrl' });
        return;
      }

      const store = readServerStore();
      const publicUrl = saveDataUrlToDisk(dataUrl, folder, store);
      writeServerStore(store);

      res.json({
        ok: true,
        url: publicUrl,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Image upload failed',
      });
    }
  });

  // 4. GET /api/uploads/:folder/:filename — Serve uploaded images to any device
  app.get('/api/uploads/:folder/:filename', (req, res) => {
    const safeFolder = String(req.params.folder || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const safeFile = String(req.params.filename || '').replace(/[^a-zA-Z0-9_.-]/g, '');
    const filePath = path.join(UPLOADS_DIR, safeFolder, safeFile);
    const mimeType = getMimeTypeForFilename(safeFile);

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.sendFile(filePath);
      return;
    }

    // Fallback to backup in universal-store.json if file was cleaned
    const store = readServerStore();
    const backupBase64 = store.imagesBackup[`${safeFolder}/${safeFile}`];
    if (backupBase64) {
      const buf = Buffer.from(backupBase64, 'base64');
      try {
        const folderPath = path.join(UPLOADS_DIR, safeFolder);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }
        fs.writeFileSync(filePath, buf);
      } catch {
        // ignore write error
      }
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(buf);
      return;
    }

    res.status(404).send('Image not found');
  });

  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');

  if (!isProd || !fs.existsSync(distPath)) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bbold Salon & Academy full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
