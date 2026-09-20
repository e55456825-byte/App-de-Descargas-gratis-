import fs from 'fs';
import path from 'path';
import {
  parseBitZeroUrl,
  loginOJS,
  makeRequest,
  deCamouflage,
  testMocksStore,
  BitZeroInfo,
  DEFAULT_BITZERO_PASSWORD,
} from './bitzeroEngine';
import { settingsManager } from './downloadSettings';

export type TaskStatus =
  | 'queued'
  | 'logging_in'
  | 'downloading'
  | 'decrypting'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled';

export interface PublicDownloadTask {
  id: string;
  catalogItemId?: string;
  itemTitle?: string;
  isScheduledWait?: boolean;
  scheduleWaitReason?: string;
  status: TaskStatus;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  currentPart: number;
  totalParts: number;
  speedMBs: number;
  etaSeconds: number;
  error?: string;
  createdAt: number;
  completedAt?: number;
  parsed: {
    original_name: string;
    file_size: number;
    parts_count: number;
    bitzero_mode_name: string;
  };
}

export interface ServerDownloadTask {
  id: string;
  catalogItemId?: string;
  itemTitle?: string;
  isScheduledWait?: boolean;
  scheduleWaitReason?: string;
  url: string;
  parsed: BitZeroInfo & { bitzero_mode_name: string };
  status: TaskStatus;
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  currentPart: number;
  totalParts: number;
  speedMBs: number;
  etaSeconds: number;
  error?: string;
  createdAt: number;
  completedAt?: number;
  filePath?: string;
  downloadUrl?: string;
  customEncryptionKey?: string;
  // Internal control flags
  isPaused?: boolean;
  isCancelled?: boolean;
}

class DownloadManager {
  private tasks: Map<string, ServerDownloadTask> = new Map();
  private eventListeners: Set<(task: PublicDownloadTask) => void> = new Set();
  private cacheDir: string;

  constructor() {
    this.cacheDir = path.join(process.cwd(), '.downloads_cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    // Schedule checker loop every 5 seconds
    setInterval(() => {
      this.checkSchedule();
    }, 5000);
  }

  public sanitizeTask(task: ServerDownloadTask): PublicDownloadTask {
    return {
      id: task.id,
      catalogItemId: task.catalogItemId,
      itemTitle: task.itemTitle,
      isScheduledWait: task.isScheduledWait,
      scheduleWaitReason: task.scheduleWaitReason,
      status: task.status,
      progress: task.progress,
      downloadedBytes: task.downloadedBytes,
      totalBytes: task.totalBytes,
      currentPart: task.currentPart,
      totalParts: task.totalParts,
      speedMBs: task.speedMBs,
      etaSeconds: task.etaSeconds,
      error: task.error,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      parsed: {
        original_name: task.parsed.original_name,
        file_size: task.parsed.file_size,
        parts_count: task.totalParts,
        bitzero_mode_name: task.parsed.bitzero_mode_name,
      },
    };
  }

  public subscribe(callback: (task: PublicDownloadTask) => void): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  private notify(task: ServerDownloadTask) {
    const publicTask = this.sanitizeTask(task);
    for (const listener of this.eventListeners) {
      try {
        listener(publicTask);
      } catch (err) {
        console.error('Error in task listener:', err);
      }
    }
  }

  public listTasks(): ServerDownloadTask[] {
    return Array.from(this.tasks.values())
      .map(t => ({ ...t }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  public listPublicTasks(): PublicDownloadTask[] {
    return this.listTasks().map(t => this.sanitizeTask(t));
  }

  public getTask(id: string): ServerDownloadTask | undefined {
    const task = this.tasks.get(id);
    return task ? { ...task } : undefined;
  }

  public getPublicTask(id: string): PublicDownloadTask | undefined {
    const task = this.tasks.get(id);
    return task ? this.sanitizeTask(task) : undefined;
  }

  public async createTask(
    url: string,
    customEncryptionKey?: string,
    meta?: { catalogItemId?: string; itemTitle?: string }
  ): Promise<ServerDownloadTask> {
    const parsed = parseBitZeroUrl(url);
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const modeNames: Record<number, string> = {
      0: 'Modo 0: Sin ofuscación (Directo)',
      1: 'Modo 1: Camuflaje PNG',
      2: 'Modo 2: Ofuscación HTML (XOR + Base64)',
      3: 'Modo 3: ZIP Encriptado (AES-256)',
    };

    const task: ServerDownloadTask = {
      id,
      catalogItemId: meta?.catalogItemId,
      itemTitle: meta?.itemTitle,
      url,
      parsed: {
        ...parsed,
        encryption_key: customEncryptionKey || parsed.encryption_key || DEFAULT_BITZERO_PASSWORD,
        bitzero_mode_name: modeNames[parsed.bitzero_mode] || `Modo ${parsed.bitzero_mode}`,
      },
      status: 'queued',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: parsed.file_size || 0,
      currentPart: 0,
      totalParts: parsed.file_ids.length,
      speedMBs: 0,
      etaSeconds: 0,
      createdAt: Date.now(),
      customEncryptionKey: customEncryptionKey || parsed.encryption_key || DEFAULT_BITZERO_PASSWORD,
    };

    const settings = settingsManager.getSettings();
    const inWindow = settingsManager.isCurrentlyInSchedule();

    if (settings.scheduleEnabled && !inWindow) {
      task.status = 'paused';
      task.isPaused = true;
      task.isScheduledWait = true;
      task.scheduleWaitReason = `En espera: Horario programado para iniciar a las ${settings.scheduleStartTime}`;
      this.tasks.set(id, task);
      this.notify(task);
      return { ...task };
    }

    this.tasks.set(id, task);
    this.notify(task);

    // Launch background execution immediately (concurrent background execution)
    this.executeTask(id).catch(err => {
      console.error(`Error executing task ${id}:`, err);
    });

    return { ...task };
  }

  /**
   * Periodic scheduler check
   */
  public checkSchedule(): void {
    const settings = settingsManager.getSettings();
    if (!settings.scheduleEnabled) {
      // If schedule was disabled, resume any scheduled waiting tasks
      for (const [id, task] of this.tasks.entries()) {
        if (task.isScheduledWait && task.status === 'paused') {
          task.isScheduledWait = false;
          task.scheduleWaitReason = undefined;
          this.resumeTask(id);
        }
      }
      return;
    }

    const inWindow = settingsManager.isCurrentlyInSchedule();
    if (inWindow) {
      // Inside window: Resume any tasks waiting for start time
      for (const [id, task] of this.tasks.entries()) {
        if (task.isScheduledWait && task.status === 'paused') {
          console.log(`[Scheduler] Ventana iniciada (${settings.scheduleStartTime} - ${settings.scheduleEndTime}). Reanudando: ${task.itemTitle || task.id}`);
          task.isScheduledWait = false;
          task.scheduleWaitReason = undefined;
          this.resumeTask(id);
        }
      }
    } else {
      // Outside window: Pause any active downloading or queued tasks
      for (const [id, task] of this.tasks.entries()) {
        if ((task.status === 'downloading' || task.status === 'queued') && !task.isScheduledWait) {
          console.log(`[Scheduler] Ventana finalizada (${settings.scheduleEndTime}). Pausando: ${task.itemTitle || task.id}`);
          task.isScheduledWait = true;
          task.scheduleWaitReason = `Horario finalizado (${settings.scheduleEndTime}). Reanudará automáticamente a las ${settings.scheduleStartTime}`;
          this.pauseTask(id);
        }
      }
    }
  }

  public pauseTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    if (task.status === 'downloading' || task.status === 'queued') {
      task.isPaused = true;
      task.status = 'paused';
      this.notify(task);
      return true;
    }
    return false;
  }

  public pauseAll(): number {
    let count = 0;
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'downloading' || task.status === 'queued') {
        task.isPaused = true;
        task.status = 'paused';
        this.notify(task);
        count++;
      }
    }
    return count;
  }

  public resumeTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    if (task.status === 'paused') {
      task.isPaused = false;
      task.status = 'queued';
      this.notify(task);
      this.executeTask(id).catch(err => console.error(err));
      return true;
    }
    return false;
  }

  public resumeAll(): number {
    let count = 0;
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'paused') {
        task.isPaused = false;
        task.status = 'queued';
        this.notify(task);
        this.executeTask(id).catch(err => console.error(err));
        count++;
      }
    }
    return count;
  }

  public cancelTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.isCancelled = true;
    task.status = 'cancelled';
    this.notify(task);
    return true;
  }

  public deleteTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    if (task.filePath && fs.existsSync(task.filePath)) {
      try {
        fs.unlinkSync(task.filePath);
      } catch {}
    }
    this.tasks.delete(id);
    return true;
  }

  public clearCompleted(): number {
    let count = 0;
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
        this.deleteTask(id);
        count++;
      }
    }
    return count;
  }

  /**
   * Main background task worker loop
   */
  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const { parsed } = task;
    const isMock = parsed.host.includes('/api/bitzero/mock-ojs') || testMocksStore.has(parsed.submission_id);

    try {
      task.status = 'logging_in';
      this.notify(task);

      let cookieJar: Record<string, string> = {};

      if (!isMock) {
        const loginRes = await loginOJS(
          parsed.host,
          parsed.contexto,
          parsed.username,
          parsed.password
        );

        if (!loginRes.ok) {
          console.warn(`[Login] Aviso: Se intentará descarga de partes con cookies obtenidas.`);
        }
        cookieJar = loginRes.cookieJar;
      }

      task.status = 'downloading';
      this.notify(task);

      const downloadedParts: Buffer[] = [];
      const startTime = Date.now();
      let totalDecryptedBytes = 0;

      for (let i = 0; i < parsed.file_ids.length; i++) {
        if (task.isCancelled) {
          task.status = 'cancelled';
          this.notify(task);
          return;
        }

        while (task.isPaused) {
          await new Promise(r => setTimeout(r, 1000));
          if (task.isCancelled) {
            task.status = 'cancelled';
            this.notify(task);
            return;
          }
        }

        const fileId = parsed.file_ids[i];
        task.currentPart = i + 1;
        this.notify(task);

        let partData: Buffer | null = null;
        let lastErr: any = null;

        // 3 retry attempts per part
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            if (isMock) {
              const mock = testMocksStore.get(parsed.submission_id);
              if (mock && mock.chunks[i]) {
                partData = mock.chunks[i];
                // Simulate realistic download latency
                await new Promise(r => setTimeout(r, 400));
              } else {
                throw new Error('Archivo simulado no encontrado en memoria.');
              }
            } else {
              const downloadUrl = `${parsed.host.replace(/\/+$/, '')}/index.php/${parsed.contexto}/$$$call$$$/api/file/file-api/download-file?submissionFileId=${fileId}&submissionId=${parsed.submission_id}&stageId=1`;
              const res = await makeRequest(downloadUrl, { cookieJar, timeoutMs: 60000 });
              if (res.statusCode !== 200) {
                throw new Error(`HTTP ${res.statusCode} al solicitar parte ${fileId}`);
              }
              partData = res.body;
            }
            break;
          } catch (err) {
            lastErr = err;
            if (attempt < 3) {
              await new Promise(r => setTimeout(r, 1500 * attempt));
            }
          }
        }

        if (!partData) {
          throw new Error(
            `Falló la descarga de la parte ${i + 1}/${parsed.file_ids.length} (ID: ${fileId}) tras 3 intentos: ${lastErr?.message || 'Error desconocido'}`
          );
        }

        // De-camouflage this part
        task.status = 'decrypting';
        this.notify(task);

        const decryptedPart = await deCamouflage(
          partData,
          parsed.bitzero_mode,
          task.customEncryptionKey || parsed.encryption_key
        );

        downloadedParts.push(decryptedPart);
        totalDecryptedBytes += decryptedPart.length;
        task.downloadedBytes = totalDecryptedBytes;

        const elapsedSec = (Date.now() - startTime) / 1000;
        if (elapsedSec > 0) {
          task.speedMBs = totalDecryptedBytes / elapsedSec / (1024 * 1024);
          const remainingParts = parsed.file_ids.length - (i + 1);
          const avgPartSec = elapsedSec / (i + 1);
          task.etaSeconds = Math.round(remainingParts * avgPartSec);
        }

        task.progress = Math.min(
          99,
          Math.round(((i + 1) / parsed.file_ids.length) * 100)
        );
        task.status = 'downloading';
        this.notify(task);
      }

      // Assemble all decrypted parts together
      task.status = 'decrypting';
      this.notify(task);

      const assembledFile = Buffer.concat(downloadedParts);

      // Save to cache directory
      const safeFilename = `${task.id}_${parsed.original_name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const finalPath = path.join(this.cacheDir, safeFilename);
      fs.writeFileSync(finalPath, assembledFile);

      task.filePath = finalPath;
      task.downloadUrl = `/api/bitzero/tasks/${task.id}/file`;
      task.downloadedBytes = assembledFile.length;
      task.totalBytes = assembledFile.length;
      task.progress = 100;
      task.status = 'completed';
      task.speedMBs = 0;
      task.etaSeconds = 0;
      task.completedAt = Date.now();
      this.notify(task);
    } catch (err: any) {
      task.status = 'failed';
      task.error = err.message || 'Error en la descarga BitZero';
      task.speedMBs = 0;
      task.etaSeconds = 0;
      this.notify(task);
    }
  }
}

export const downloadManager = new DownloadManager();
