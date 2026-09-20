import React, { useState } from 'react';
import {
  X,
  Download,
  CheckCircle,
  HardDrive,
  Calendar,
  Layers,
  Sparkles,
  Film,
  Tv,
  Loader2,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import { CatalogItem } from '../types';
import { formatBytes } from '../utils/bitzero';

interface MediaDetailModalProps {
  item: CatalogItem | null;
  onClose: () => void;
  onDownload: (item: CatalogItem) => void;
  isDownloading?: boolean;
  isCompleted?: boolean;
  downloadProgress?: number;
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  item,
  onClose,
  onDownload,
  isDownloading,
  isCompleted,
  downloadProgress = 0,
}) => {
  const [imageError, setImageError] = useState(false);

  if (!item) return null;

  const categoryLabels: Record<string, string> = {
    peliculas: 'Película',
    series: 'Serie de TV',
    animes: 'Anime',
  };

  const fallbackImages: Record<string, string> = {
    peliculas: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80',
    series: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&q=80',
    animes: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80',
  };

  const imageSrc = imageError || !item.coverUrl ? fallbackImages[item.category] : item.coverUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
        {/* Header with Close */}
        <div className="sticky top-0 bg-slate-900/95 border-b border-slate-800 p-4 flex items-center justify-between backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold px-2.5 py-1 rounded-full uppercase">
              {categoryLabels[item.category] || item.category}
            </span>
            <span className="text-xs text-slate-400">Subido por el Administrador</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Top Banner with Poster and Title */}
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="w-full sm:w-44 aspect-[2/3] rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800 shadow-lg">
              <img
                src={imageSrc}
                alt={item.title}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {item.title}
                </h2>
                {(item.season || item.episode) && (
                  <div className="text-indigo-400 text-sm font-semibold mt-1">
                    {item.season ? `${item.season} • ` : ''}
                    {item.episode}
                  </div>
                )}
              </div>

              {/* Genre Pills */}
              {item.genre && item.genre.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.genre.map((g, idx) => (
                    <span
                      key={idx}
                      className="bg-slate-800 text-slate-300 border border-slate-700/60 text-xs px-2.5 py-0.5 rounded-md"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 block">Calidad de Vídeo:</span>
                  <span className="font-bold text-cyan-300 mt-0.5 block">{item.quality || '1080p FHD'}</span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 block">Año de Estreno:</span>
                  <span className="font-semibold text-slate-200 mt-0.5 block">{item.year || 'N/A'}</span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 block">Tamaño del Archivo:</span>
                  <span className="font-mono font-semibold text-slate-200 mt-0.5 block">
                    {item.fileSize ? formatBytes(item.fileSize) : 'Automático'}
                  </span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-slate-500 block">Partes Camufladas:</span>
                  <span className="font-semibold text-amber-300 mt-0.5 block">
                    {item.partsCount || 1} partes BitZero
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Description / Synopsis */}
          <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Sinopsis</h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* File details info */}
          {item.fileName && (
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between text-slate-400">
              <span className="font-mono truncate">{item.fileName}</span>
              <span className="text-emerald-400 flex items-center gap-1 shrink-0 ml-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Verificado por Bot</span>
              </span>
            </div>
          )}

          {/* Download progress if active */}
          {isDownloading && (
            <div className="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-indigo-200">
                <span className="flex items-center gap-2 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Descargando y desencriptando en segundo plano...</span>
                </span>
                <span className="font-mono font-bold text-cyan-300">{downloadProgress}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, downloadProgress)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-slate-900/95 border-t border-slate-800 p-4 flex items-center justify-between backdrop-blur-md mt-auto">
          <div className="text-xs text-slate-400 hidden sm:block">
            {isCompleted ? 'Descarga completada y guardada en el servidor' : 'Descarga directa sin enlaces externos'}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={() => {
                onDownload(item);
                onClose();
              }}
              disabled={isDownloading}
              className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                isCompleted
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  : isDownloading
                  ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/30 cursor-wait'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 active:scale-[0.98]'
              }`}
            >
              {isCompleted ? (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Ver en Mis Descargas</span>
                </>
              ) : isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Descargando...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descargar en segundo plano</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
