import React from 'react';
import { Download, FileCheck, Trash2, History, HardDrive, Check, Copy } from 'lucide-react';
import { DownloadTask } from '../types';
import { formatBytes } from '../utils/bitzero';

interface DownloadHistoryProps {
  completedTasks: DownloadTask[];
  onClearHistory: () => void;
  onDeleteTask: (id: string) => void;
}

export const DownloadHistory: React.FC<DownloadHistoryProps> = ({
  completedTasks,
  onClearHistory,
  onDeleteTask,
}) => {
  if (completedTasks.length === 0) return null;

  const handleSave = (task: DownloadTask) => {
    const a = document.createElement('a');
    a.href = `/api/bitzero/tasks/${task.id}/file`;
    a.download = task.parsed.original_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-3 pt-4 border-t border-slate-800/80">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          <span>Archivos Descargados ({completedTasks.length})</span>
        </h3>
        <button
          onClick={onClearHistory}
          className="text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 py-1 px-2 rounded hover:bg-slate-800"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Limpiar historial</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {completedTasks.map(task => (
          <div
            key={task.id}
            className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-slate-200 truncate" title={task.parsed.original_name}>
                  {task.parsed.original_name}
                </h4>
                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                  <span>{formatBytes(task.downloadedBytes || task.totalBytes)}</span>
                  <span>•</span>
                  <span>{task.completedAt ? new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Completado'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleSave(task)}
                className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors"
                title="Descargar archivo al equipo"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={() => onDeleteTask(task.id)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
