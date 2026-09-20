import fs from 'fs';
import path from 'path';

export interface ServerDownloadSettings {
  downloadFolder: string;
  folderPathType: 'browser_default' | 'native_picker' | 'custom_path';
  scheduleEnabled: boolean;
  scheduleStartTime: string; // e.g. "00:00"
  scheduleEndTime: string;   // e.g. "06:00"
  autoSaveToFolder: boolean;
  notifyOnScheduleStart?: boolean;
}

const SETTINGS_FILE = path.join(process.cwd(), '.download_settings.json');

const DEFAULT_SETTINGS: ServerDownloadSettings = {
  downloadFolder: 'Descargas/Películas y Series',
  folderPathType: 'browser_default',
  scheduleEnabled: false,
  scheduleStartTime: '00:00',
  scheduleEndTime: '06:00',
  autoSaveToFolder: true,
  notifyOnScheduleStart: true,
};

class SettingsManager {
  private settings: ServerDownloadSettings;

  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.error('[Settings] Error loading settings:', e);
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Settings] Error saving settings:', e);
    }
  }

  public getSettings(): ServerDownloadSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<ServerDownloadSettings>): ServerDownloadSettings {
    this.settings = { ...this.settings, ...partial };
    this.save();
    return { ...this.settings };
  }

  /**
   * Checks whether the current time falls inside the configured start/end window
   */
  public isCurrentlyInSchedule(): boolean {
    if (!this.settings.scheduleEnabled) {
      return true; // No schedule active, anytime is allowed
    }

    const startTime = this.settings.scheduleStartTime || '00:00';
    const endTime = this.settings.scheduleEndTime || '06:00';

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = startTime.split(':').map(Number);
    const startMinutes = (startH || 0) * 60 + (startM || 0);

    const [endH, endM] = endTime.split(':').map(Number);
    const endMinutes = (endH || 0) * 60 + (endM || 0);

    if (startMinutes === endMinutes) {
      return true;
    }

    if (startMinutes < endMinutes) {
      // Same day, e.g. 01:00 to 06:00
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Crosses midnight, e.g. 23:00 to 06:00
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }
}

export const settingsManager = new SettingsManager();
