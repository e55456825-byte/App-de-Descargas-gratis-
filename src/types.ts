export type BitzeroMode = 0 | 1 | 2 | 3;
export type MediaCategory = 'series' | 'peliculas' | 'animes';

export interface CatalogItem {
  id: string;
  title: string;
  category: MediaCategory;
  coverUrl: string;
  description: string;
  year?: string;
  genre?: string[];
  quality?: string;
  season?: string;
  episode?: string;
  bitzeroUrl?: string; // Kept secure on server
  fileSize?: number;
  fileName?: string;
  partsCount?: number;
  downloadsCount?: number;
  createdAt: number;
}

export interface SafeBitZeroInfo {
  original_name: string;
  file_size: number;
  file_ids?: string[];
  parts_count?: number;
  bitzero_mode?: BitzeroMode;
  bitzero_mode_name?: string;
  is_valid?: boolean;
}

// Client-safe alias
export type BitZeroParsedUrl = SafeBitZeroInfo;

export type TaskStatus =
  | 'queued'
  | 'logging_in'
  | 'downloading'
  | 'decrypting'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled';

export interface DownloadSettings {
  downloadFolder: string;
  folderPathType: 'browser_default' | 'native_picker' | 'custom_path';
  scheduleEnabled: boolean;
  scheduleStartTime: string; // "HH:mm" e.g. "00:00"
  scheduleEndTime: string;   // "HH:mm" e.g. "06:00"
  autoSaveToFolder: boolean;
  notifyOnScheduleStart?: boolean;
}

export interface DownloadTask {
  id: string;
  catalogItemId?: string;
  itemTitle?: string;
  isScheduledWait?: boolean;
  scheduleWaitReason?: string;
  parsed: SafeBitZeroInfo;
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
  downloadUrl?: string;
}

export interface ParseResultResponse {
  success: boolean;
  data?: SafeBitZeroInfo;
  error?: string;
}

