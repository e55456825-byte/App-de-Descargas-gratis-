import React from 'react';
import {
  X,
  HardDrive,
  CheckCircle,
  AlertCircle,
  Pause,
  Play,
  Trash2,
  Download,
  Loader2,
  FolderDown,
  ShieldCheck,
  Folder,
  Clock,
  Settings,
} from 'lucide-react';
import { DownloadTask, DownloadSettings } from '../types';
import { formatBytes } from '../utils/bitzero';

interface DownloadsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: DownloadTask[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onDownloadFile: (task: DownloadTask) => void;
  onPauseAll?: () => void;
  onResumeAll?: () => void;
  onClearCompleted?: () => void;
  downloadSettings?: DownloadSettings;
  isScheduleActiveNow?: boolean;
  onOpenSettings?: () => void;
}

export const DownloadsDrawer: React.FC<DownloadsDrawerProps> = ({
  isOpen,
  onClose,
  tasks,
  onPause,
  onResume,
  onDelete,
  onDownloadFile,
  onPauseAll,
  onResumeAll,
  onClearCompleted,
  downloadSettings,
  isScheduleActiveNow,
  onOpenSettings,
}) => {
  if (!isOpen) return null;

  const activeTasks = tasks.filter(t => t.status === 'downloading');
  const pausedTasks = tasks.filter(t => t.status === 'paused');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  // Combined speed calculation
  const totalSpeed = activeTasks.reduce((acc, t) => acc + (t.speedMBs || 0), 0);

  // Save all completed files sequentially
  const handleSaveAllCompleted = () => {
    completedTasks.forEach((task, idx) => {
      setTimeout(() => {
        onDownloadFile(task);
      }, idx * 600);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-950 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800/90 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Descargas en Segundo Plano</h3>
              <p className="text-[11px] text-slate-400">
                {activeTasks.length} simultánea{activeTasks.length === 1 ? '' : 's'} • {completedTasks.length} lista{completedTasks.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Destination Folder Bar & Quick Settings */}
        <div className="bg-slate-900/95 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5 truncate">
            <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">
              Carpeta: <strong className="text-white">{downloadSettings?.downloadFolder || 'Descargas'}</strong>
            </span>
          </div>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="text-indigo-400 hover:text-indigo-300 font-semibold shrink-0 ml-2 flex items-center gap-1 hover:underline"
              title="Cambiar carpeta o programar horarios"
            >
              <Settings className="w-3 h-3" />
              <span>Configurar</span>
            </button>
          )}
        </div>

        {/* Schedule Active / Waiting Banner */}
        {downloadSettings?.scheduleEnabled && (
          <div
            className={`px-4 py-2 text-[11px] flex items-center justify-between border-b ${
              isScheduleActiveNow
                ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/50 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isScheduleActiveNow
                  ? `Horario activo: Descargando hasta las ${downloadSettings.scheduleEndTime}`
                  : `Horario programado: En espera hasta las ${downloadSettings.scheduleStartTime}`}
              </span>
            </div>
            {onOpenSettings && (
              <button onClick={onOpenSettings} className="underline text-[10px] text-slate-300 hover:text-white shrink-0">
                Ajustar
              </button>
            )}
          </div>
        )}

        {/* Simultaneous Downloads Global Control Bar */}
        {tasks.length > 0 && (
          <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              {activeTasks.length > 0 ? (
                <span className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  {activeTasks.length} en simultáneo ({totalSpeed > 0 ? `${totalSpeed.toFixed(1)} MB/s` : 'Activo'})
                </span>
              ) : pausedTasks.length > 0 ? (
                <span className="text-amber-400 font-medium text-[11px]">
                  {pausedTasks.length} pausada{pausedTasks.length === 1 ? '' : 's'}
                </span>
              ) : (
                <span className="text-slate-400 text-[11px]">Todas al día</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {activeTasks.length > 0 && onPauseAll && (
                <button
                  onClick={onPauseAll}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
                  title="Pausar todas las descargas activas"
                >
                  <Pause className="w-3 h-3" />
                  <span>Pausar todas</span>
                </button>
              )}

              {pausedTasks.length > 0 && onResumeAll && (
                <button
                  onClick={onResumeAll}
                  className="px-2 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium flex items-center gap-1 transition-colors"
                  title="Reanudar todas las descargas pausadas"
                >
                  <Play className="w-3 h-3" />
                  <span>Reanudar todas</span>
                </button>
              )}

              {completedTasks.length > 1 && (
                <button
                  onClick={handleSaveAllCompleted}
                  className="px-2 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  title="Guardar todos los archivos completados en tu dispositivo"
                >
                  <Download className="w-3 h-3" />
                  <span>Guardar todas ({completedTasks.length})</span>
                </button>
              )}

              {completedTasks.length > 0 && onClearCompleted && (
                <button
                  onClick={onClearCompleted}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] transition-colors"
                  title="Limpiar completadas de la lista"
                >
                  <span>Limpiar</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <FolderDown className="w-12 h-12 text-slate-700 mx-auto" />
              <p className="text-xs text-slate-400 font-medium">
                No tienes descargas activas en este momento.
              </p>
              <p className="text-[11px] text-slate-600">
                Puedes seleccionar varias películas, series o animes a la vez y descargarlas al mismo tiempo.
              </p>
            </div>
          ) : (
            tasks.map(task => {
              const isCompleted = task.status === 'completed';
              const isDownloading = task.status === 'downloading';
              const isPaused = task.status === 'paused';
              const isError = task.status === 'failed';
              const displayTitle = task.itemTitle || task.parsed?.original_name || 'Archivo';

              return (
                <div
                  key={task.id}
                  className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-3.5 space-y-2.5 hover:border-slate-700 transition-colors"
                >
                  {/* Title & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4
                        className="text-xs font-bold text-slate-100 truncate"
                        title={displayTitle}
                      >
                        {displayTitle}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        <span>{formatBytes(task.downloadedBytes)} de {formatBytes(task.totalBytes)}</span>
                        <span>•</span>
                        <span>Parte {task.currentPart}/{task.totalParts}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : isDownloading
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                          : isPaused
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isCompleted ? 'Listo' : isDownloading ? 'Descargando' : isPaused ? 'Pausado' : 'Error'}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCompleted
                            ? 'bg-emerald-500'
                            : isError
                            ? 'bg-rose-500'
                            : isPaused
                            ? 'bg-amber-500'
                            : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                        }`}
                        style={{ width: `${Math.max(3, task.progress)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{task.progress}%</span>
                      {isDownloading && (
                        <span>
                          {task.speedMBs > 0 ? `${task.speedMBs.toFixed(1)} MB/s` : 'Calculando...'}
                          {task.etaSeconds > 0 ? ` • ${task.etaSeconds}s` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Scheduled wait banner if task is waiting for scheduled window */}
                  {task.isScheduledWait && (
                    <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-[11px] text-amber-200 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                      <span>{task.scheduleWaitReason || 'En espera: Iniciará automáticamente en el horario programado'}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <div className="flex items-center gap-1">
                      {isCompleted && (
                        <button
                          onClick={() => onDownloadFile(task)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Guardar en Dispositivo</span>
                        </button>
                      )}

                      {isDownloading && (
                        <button
                          onClick={() => onPause(task.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                          title="Pausar esta descarga"
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isPaused && (
                        <button
                          onClick={() => onResume(task.id)}
                          className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                          title="Reanudar esta descarga"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => onDelete(task.id)}
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950 hover:text-rose-400 text-slate-400 text-xs transition-colors"
                      title="Eliminar de la lista"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
