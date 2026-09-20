import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  parseBitZeroUrl,
  generateTestBitZeroUrl,
  DEFAULT_BITZERO_PASSWORD,
} from './server/bitzeroEngine';
import { downloadManager } from './server/downloadManager';
import { catalogManager, MediaCategory } from './server/catalogStore';
import { settingsManager } from './server/downloadSettings';

const ADMIN_PASSWORD = '140909';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── BitZero API Endpoints ──────────────────────────────────────────

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'Descargas gratis Emanuel' });
  });

  // 1. Parse BitZero URL / code (safe metadata only: filename, size, parts)
  app.post('/api/bitzero/parse', (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ success: false, error: 'URL o código requerido' });
      }

      const parsed = parseBitZeroUrl(url);
      const modeNames: Record<number, string> = {
        0: 'Modo 0: Directo',
        1: 'Modo 1: Camuflaje Seguro',
        2: 'Modo 2: Ofuscación Protegida',
        3: 'Modo 3: Cifrado Avanzado',
      };

      // Expose only public safe file metadata - never credentials or repo host
      res.json({
        success: true,
        data: {
          original_name: parsed.original_name,
          file_size: parsed.file_size,
          parts_count: parsed.file_ids.length,
          bitzero_mode_name: modeNames[parsed.bitzero_mode] || `Modo ${parsed.bitzero_mode}`,
          is_valid: true,
        },
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 2. Start a background download
  app.post('/api/bitzero/start-download', async (req, res) => {
    try {
      const { url, encryptionKey } = req.body;
      if (!url) {
        return res.status(400).json({ success: false, error: 'URL requerida' });
      }

      const task = await downloadManager.createTask(url, encryptionKey);
      res.json({ success: true, task: downloadManager.sanitizeTask(task) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. List all tasks (sanitized for public and admin)
  app.get('/api/bitzero/tasks', (req, res) => {
    res.json({ success: true, tasks: downloadManager.listPublicTasks() });
  });

  // 4. Get a specific task (sanitized)
  app.get('/api/bitzero/tasks/:id', (req, res) => {
    const task = downloadManager.getPublicTask(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Tarea no encontrada' });
    }
    res.json({ success: true, task });
  });

  // 5. Pause a task
  app.post('/api/bitzero/tasks/:id/pause', (req, res) => {
    const ok = downloadManager.pauseTask(req.params.id);
    res.json({ success: ok });
  });

  // 5b. Pause ALL tasks simultaneously
  app.post('/api/bitzero/tasks-pause-all', (req, res) => {
    const count = downloadManager.pauseAll();
    res.json({ success: true, count });
  });

  // 6. Resume a task
  app.post('/api/bitzero/tasks/:id/resume', (req, res) => {
    const ok = downloadManager.resumeTask(req.params.id);
    res.json({ success: ok });
  });

  // 6b. Resume ALL tasks simultaneously
  app.post('/api/bitzero/tasks-resume-all', (req, res) => {
    const count = downloadManager.resumeAll();
    res.json({ success: true, count });
  });

  // 7. Cancel / Delete task
  app.delete('/api/bitzero/tasks/:id', (req, res) => {
    const ok = downloadManager.deleteTask(req.params.id);
    res.json({ success: ok });
  });

  // 7b. Clear all completed/cancelled tasks
  app.post('/api/bitzero/tasks-clear-completed', (req, res) => {
    const count = downloadManager.clearCompleted();
    res.json({ success: true, count });
  });

  // 8. Download assembled decrypted file
  app.get('/api/bitzero/tasks/:id/file', (req, res) => {
    const task = downloadManager.getTask(req.params.id);
    if (!task || !task.filePath || !fs.existsSync(task.filePath)) {
      return res.status(404).send('Archivo no encontrado o descarga aún incompleta');
    }

    const filename = encodeURIComponent(task.parsed.original_name);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    const stream = fs.createReadStream(task.filePath);
    stream.pipe(res);
  });

  // 9. Server-Sent Events (SSE) for real-time background task progress
  app.get('/api/bitzero/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send initial list with sanitized tasks only
    res.write(`data: ${JSON.stringify({ type: 'init', tasks: downloadManager.listPublicTasks() })}\n\n`);

    const unsubscribe = downloadManager.subscribe(task => {
      res.write(`data: ${JSON.stringify({ type: 'task_update', task })}\n\n`);
    });

    req.on('close', () => {
      unsubscribe();
    });
  });

  // 10. Generate Test BitZero URL endpoint
  app.post('/api/bitzero/generate-test-url', (req, res) => {
    try {
      const { filename = 'muestra_documento.pdf', content = 'Este es un archivo de prueba desencriptado exitosamente desde BitZero por Descargas gratis Emanuel.', mode = 2 } = req.body;
      const testUrl = generateTestBitZeroUrl(filename, content, Number(mode), DEFAULT_BITZERO_PASSWORD);
      res.json({
        success: true,
        url: testUrl,
        filename,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── Catalog Endpoints (Public for Users) ──────────────────────────

  // Get catalog items (sanitized: bitzeroUrl is stripped)
  app.get('/api/catalog', (req, res) => {
    const category = req.query.category as MediaCategory | undefined;
    const items = catalogManager.getSanitizedItems(category);
    res.json({ success: true, items });
  });

  // User 1-click background download for a catalog item
  // Users do not need nor see the raw download URL!
  app.post('/api/catalog/:id/download', async (req, res) => {
    try {
      const item = catalogManager.getItemById(req.params.id);
      if (!item) {
        return res.status(404).json({ success: false, error: 'Elemento no encontrado en el catálogo' });
      }

      catalogManager.incrementDownloads(item.id);
      const task = await downloadManager.createTask(item.bitzeroUrl, undefined, {
        catalogItemId: item.id,
        itemTitle: item.title,
      });
      res.json({ success: true, task: downloadManager.sanitizeTask(task), itemTitle: item.title });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Batch download multiple catalog items simultaneously
  app.post('/api/catalog/batch-download', async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: 'Lista de identificadores requerida' });
      }

      const tasks = [];
      for (const id of ids) {
        const item = catalogManager.getItemById(id);
        if (item && item.bitzeroUrl) {
          catalogManager.incrementDownloads(item.id);
          const task = await downloadManager.createTask(item.bitzeroUrl, undefined, {
            catalogItemId: item.id,
            itemTitle: item.title,
          });
          tasks.push(downloadManager.sanitizeTask(task));
        }
      }

      res.json({
        success: true,
        count: tasks.length,
        tasks,
        message: `${tasks.length} descargas iniciadas en simultáneo en segundo plano`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── Download Settings & Schedule Endpoints ───────────────────────

  // Get current download settings & live schedule state
  app.get('/api/settings/download', (req, res) => {
    try {
      const settings = settingsManager.getSettings();
      const isInSchedule = settingsManager.isCurrentlyInSchedule();
      res.json({
        success: true,
        settings,
        isInSchedule,
        serverTime: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update download folder and schedule configuration
  app.post('/api/settings/download', (req, res) => {
    try {
      const {
        downloadFolder,
        folderPathType,
        scheduleEnabled,
        scheduleStartTime,
        scheduleEndTime,
        autoSaveToFolder,
        notifyOnScheduleStart,
      } = req.body;

      const updated = settingsManager.updateSettings({
        ...(downloadFolder !== undefined && { downloadFolder: String(downloadFolder) }),
        ...(folderPathType !== undefined && { folderPathType }),
        ...(scheduleEnabled !== undefined && { scheduleEnabled: Boolean(scheduleEnabled) }),
        ...(scheduleStartTime !== undefined && { scheduleStartTime: String(scheduleStartTime) }),
        ...(scheduleEndTime !== undefined && { scheduleEndTime: String(scheduleEndTime) }),
        ...(autoSaveToFolder !== undefined && { autoSaveToFolder: Boolean(autoSaveToFolder) }),
        ...(notifyOnScheduleStart !== undefined && { notifyOnScheduleStart: Boolean(notifyOnScheduleStart) }),
      });

      // Trigger immediate check so tasks respond instantly to settings change
      downloadManager.checkSchedule();

      const isInSchedule = settingsManager.isCurrentlyInSchedule();

      res.json({
        success: true,
        settings: updated,
        isInSchedule,
        message: 'Configuración de descargas y horarios guardada con éxito',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── Admin Endpoints (Protected by Password 140909) ────────────────

  // Admin login check
  app.post('/api/admin/auth', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      res.json({ success: true, token: 'admin_token_140909' });
    } else {
      res.status(401).json({ success: false, error: 'Contraseña de administrador incorrecta' });
    }
  });

  // Admin middleware helper
  const verifyAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['x-admin-password'] || req.headers['authorization'];
    if (authHeader === ADMIN_PASSWORD || authHeader === 'Bearer admin_token_140909' || authHeader === 'admin_token_140909') {
      return next();
    }
    return res.status(403).json({ success: false, error: 'Acceso no autorizado. Se requiere contraseña de administrador.' });
  };

  // Add new item to catalog (Only Admin)
  app.post('/api/admin/items', verifyAdmin, (req, res) => {
    try {
      const { title, category, coverUrl, description, year, genre, quality, season, episode, bitzeroUrl } = req.body;

      if (!title || !category || !bitzeroUrl) {
        return res.status(400).json({
          success: false,
          error: 'Título, categoría (series, peliculas, animes) y URL BitZero son obligatorios',
        });
      }

      const validCategories: MediaCategory[] = ['series', 'peliculas', 'animes'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: 'Categoría inválida. Debe ser series, peliculas o animes',
        });
      }

      const newItem = catalogManager.addItem({
        title,
        category,
        coverUrl: coverUrl || '',
        description,
        year,
        genre: Array.isArray(genre) ? genre : genre ? [genre] : [],
        quality,
        season,
        episode,
        bitzeroUrl,
      });

      res.json({ success: true, item: catalogManager.getSanitizedItemById(newItem.id) || newItem });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update item (Only Admin)
  app.put('/api/admin/items/:id', verifyAdmin, (req, res) => {
    try {
      const updated = catalogManager.updateItem(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Elemento no encontrado' });
      }
      res.json({ success: true, item: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete item (Only Admin)
  app.delete('/api/admin/items/:id', verifyAdmin, (req, res) => {
    const deleted = catalogManager.deleteItem(req.params.id);
    res.json({ success: deleted });
  });

  // ── Vite Middleware / Static Serving ───────────────────────────────

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Descargas gratis Emanuel] Servidor iniciado en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Error starting server:', err);
});
