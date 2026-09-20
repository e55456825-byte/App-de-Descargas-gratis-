import React, { useState, useEffect } from 'react';
import {
  X,
  Folder,
  FolderOpen,
  Clock,
  Check,
  Zap,
  Sliders,
  AlertCircle,
  HelpCircle,
  Sparkles,
  HardDrive,
  Calendar,
  Save,
  RotateCcw,
} from 'lucide-react';
import { DownloadSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DownloadSettings;
  onSaveSettings: (newSettings: DownloadSettings) => Promise<void>;
  nativeDirectoryName: string | null;
  onSelectNativeFolder: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  nativeDirectoryName,
  onSelectNativeFolder,
}) => {
  const [downloadFolder, setDownloadFolder] = useState(settings.downloadFolder);
  const [folderPathType, setFolderPathType] = useState(settings.folderPathType);
  const [scheduleEnabled, setScheduleEnabled] = useState(settings.scheduleEnabled);
  const [scheduleStartTime, setScheduleStartTime] = useState(settings.scheduleStartTime);
  const [scheduleEndTime, setScheduleEndTime] = useState(settings.scheduleEndTime);
  const [autoSaveToFolder, setAutoSaveToFolder] = useState(settings.autoSaveToFolder);
  const [notifyOnScheduleStart, setNotifyOnScheduleStart] = useState(settings.notifyOnScheduleStart ?? true);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  // Update internal state when settings prop changes
  useEffect(() => {
    setDownloadFolder(settings.downloadFolder);
    setFolderPathType(settings.folderPathType);
    setScheduleEnabled(settings.scheduleEnabled);
    setScheduleStartTime(settings.scheduleStartTime);
    setScheduleEndTime(settings.scheduleEndTime);
    setAutoSaveToFolder(settings.autoSaveToFolder);
    setNotifyOnScheduleStart(settings.notifyOnScheduleStart ?? true);
  }, [settings]);

  // Live clock to evaluate schedule
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  // Evaluate whether the current time is currently within start and end time
  const isCurrentlyInScheduleWindow = (): boolean => {
    if (!scheduleEnabled) return true;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = scheduleStartTime.split(':').map(Number);
    const startMinutes = (startH || 0) * 60 + (startM || 0);

    const [endH, endM] = scheduleEndTime.split(':').map(Number);
    const endMinutes = (endH || 0) * 60 + (endM || 0);

    if (startMinutes === endMinutes) return true;

    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  };

  const inWindow = isCurrentlyInScheduleWindow();

  // Preset folder options
  const folderPresets = [
    { label: 'Descargas/Películas y Series', path: 'Descargas/Películas y Series' },
    { label: 'Almacenamiento Interno/Descargas', path: 'Almacenamiento Interno/Descargas' },
    { label: 'Tarjeta SD/EmanuelDescargas', path: 'Tarjeta SD/EmanuelDescargas' },
    { label: 'Descargas/Animes', path: 'Descargas/Animes' },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        downloadFolder: downloadFolder.trim() || 'Descargas/Películas y Series',
        folderPathType,
        scheduleEnabled,
        scheduleStartTime,
        scheduleEndTime,
        autoSaveToFolder,
        notifyOnScheduleStart,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setDownloadFolder('Descargas/Películas y Series');
    setFolderPathType('browser_default');
    setScheduleEnabled(false);
    setScheduleStartTime('00:00');
    setScheduleEndTime('06:00');
    setAutoSaveToFolder(true);
    setNotifyOnScheduleStart(true);
  };

  const supportsDirectoryPicker = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-snug">
                Configuración de Descargas
              </h2>
              <p className="text-xs text-slate-400">
                Elige la carpeta de guardado y programa los horarios de descarga
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ──────────────────────────────────────────────────────── */}
          {/* SECCIÓN 1: CARPETA DE DESCARGAS                          */}
          {/* ──────────────────────────────────────────────────────── */}
          <section className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-indigo-400 border-b border-slate-800/60 pb-3">
              <Folder className="w-5 h-5 shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-100">
                  Carpeta de destino para las descargas
                </h3>
                <p className="text-xs text-slate-400">
                  Define en qué carpeta de tu dispositivo se guardarán tus películas, series y animes
                </p>
              </div>
            </div>

            {/* Native device directory picker button */}
            {supportsDirectoryPicker && (
              <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-indigo-200 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Conectar carpeta física del dispositivo</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {nativeDirectoryName ? (
                      <span className="text-emerald-300 font-medium">
                        ✓ Conectada a: <strong>{nativeDirectoryName}</strong>
                      </span>
                    ) : (
                      'Permite guardar archivos directamente en tu disco o tarjeta SD sin preguntar cada vez'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onSelectNativeFolder}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 shrink-0"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>{nativeDirectoryName ? 'Cambiar carpeta física' : 'Elegir en dispositivo'}</span>
                </button>
              </div>
            )}

            {/* Folder path text input & presets */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Ruta o nombre de la carpeta:</span>
                <span className="text-[11px] text-slate-500">Ejemplo: Descargas/Películas</span>
              </label>

              <div className="relative">
                <Folder className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={downloadFolder}
                  onChange={e => {
                    setDownloadFolder(e.target.value);
                    setFolderPathType('custom_path');
                  }}
                  placeholder="Descargas/Películas y Series"
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Preset buttons */}
              <div className="pt-1">
                <p className="text-[11px] text-slate-400 mb-1.5">Carpetas rápidas sugeridas:</p>
                <div className="flex flex-wrap gap-1.5">
                  {folderPresets.map(preset => (
                    <button
                      key={preset.path}
                      type="button"
                      onClick={() => {
                        setDownloadFolder(preset.path);
                        setFolderPathType('custom_path');
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                        downloadFolder === preset.path
                          ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 font-semibold'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Auto-save switch */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
              <div className="space-y-0.5 pr-4">
                <span className="text-xs font-semibold text-slate-200 block">
                  Organizar y guardar automáticamente
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Descarga directamente los archivos con el nombre organizado de la película o serie
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAutoSaveToFolder(!autoSaveToFolder)}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                  autoSaveToFolder ? 'bg-indigo-600' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    autoSaveToFolder ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </section>

          {/* ──────────────────────────────────────────────────────── */}
          {/* SECCIÓN 2: PROGRAMADOR DE HORARIOS DE DESCARGA            */}
          {/* ──────────────────────────────────────────────────────── */}
          <section className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-2.5 text-cyan-400">
                <Clock className="w-5 h-5 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Programador de Horarios de Descarga
                  </h3>
                  <p className="text-xs text-slate-400">
                    Establece a qué hora empieza y a qué hora termina de descargar
                  </p>
                </div>
              </div>

              {/* Master toggle for schedule */}
              <button
                type="button"
                onClick={() => setScheduleEnabled(!scheduleEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                  scheduleEnabled ? 'bg-cyan-500' : 'bg-slate-800'
                }`}
                title={scheduleEnabled ? 'Horario programado activado' : 'Horario desactivado'}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    scheduleEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Live scheduler status indicator */}
            <div
              className={`rounded-xl p-3 border text-xs flex items-center justify-between gap-3 ${
                !scheduleEnabled
                  ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                  : inWindow
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {!scheduleEnabled ? (
                  <>
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>El programador está desactivado (descargas inmediatas 24/7).</span>
                  </>
                ) : inWindow ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="font-semibold">
                      Ventana de descarga ACTIVA ahora. Finalizará automáticamente a las {scheduleEndTime}.
                    </span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>
                      Modo en espera: Las descargas se iniciarán a las <strong>{scheduleStartTime}</strong> y terminarán a las <strong>{scheduleEndTime}</strong>.
                    </span>
                  </>
                )}
              </div>

              <div className="text-[11px] font-mono opacity-70 shrink-0">
                Hora local: {currentTimeStr}
              </div>
            </div>

            {/* Time inputs */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-opacity ${scheduleEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              {/* Start Time */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    Hora de inicio (Empieza a descargar):
                  </span>
                </div>

                <input
                  type="time"
                  value={scheduleStartTime}
                  onChange={e => setScheduleStartTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/90 rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 transition-colors"
                />

                {/* Quick start time chips */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {['22:00', '23:00', '00:00', '01:00'].map(time => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setScheduleStartTime(time)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        scheduleStartTime === time
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* End Time */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Hora de fin (Termina de descargar):
                  </span>
                </div>

                <input
                  type="time"
                  value={scheduleEndTime}
                  onChange={e => setScheduleEndTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/90 rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-amber-400 transition-colors"
                />

                {/* Quick end time chips */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {['06:00', '07:00', '08:00', '10:00'].map(time => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setScheduleEndTime(time)}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        scheduleEndTime === time
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Explanation box */}
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
              <p className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                ¿Cómo funciona el programador?
              </p>
              <p>
                • Si agregas descargas fuera del horario programado, se mantendrán automáticamente en espera y comenzarán puntuales a las <strong>{scheduleStartTime}</strong>.
              </p>
              <p>
                • Al llegar las <strong>{scheduleEndTime}</strong>, las descargas se pausarán de manera segura para que no consuman tu internet durante el día y se reanudarán en el siguiente horario.
              </p>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restablecer valores</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white stroke-[3]" />
                  <span>¡Guardado con éxito!</span>
                </>
              ) : isSaving ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Configuración</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
