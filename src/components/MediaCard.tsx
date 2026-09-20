import React, { useState } from 'react';
import {
  Download,
  CheckCircle,
  Loader2,
  HardDrive,
  Info,
  Check,
} from 'lucide-react';
import { CatalogItem } from '../types';
import { formatBytes } from '../utils/bitzero';

interface MediaCardProps {
  item: CatalogItem;
  onDownload: (item: CatalogItem) => void;
  onViewDetails: (item: CatalogItem) => void;
  isDownloading?: boolean;
  isCompleted?: boolean;
  downloadProgress?: number;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (item: CatalogItem) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  onDownload,
  onViewDetails,
  isDownloading,
  isCompleted,
  downloadProgress = 0,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}) => {
  const [imageError, setImageError] = useState(false);

  // High quality fallback image based on category
  const fallbackImages: Record<string, string> = {
    peliculas: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80',
    series: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&q=80',
    animes: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80',
  };

  const imageSrc = imageError || !item.coverUrl ? fallbackImages[item.category] : item.coverUrl;

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSelectionMode && onToggleSelect) {
      e.stopPropagation();
      onToggleSelect(item);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative rounded-2xl overflow-hidden transition-all duration-300 flex flex-col ${
        isSelected
          ? 'bg-slate-900 border-2 border-indigo-500 shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-500/40'
          : 'bg-slate-900/80 border border-slate-800/90 hover:border-indigo-500/50 shadow-lg hover:shadow-indigo-500/10'
      } ${isSelectionMode ? 'cursor-pointer select-none' : ''}`}
    >
      {/* Poster Image with overlays */}
      <div className="relative aspect-[16/10] sm:aspect-[2/3] w-full overflow-hidden bg-slate-950">
        <img
          src={imageSrc}
          alt={item.title}
          onError={() => setImageError(true)}
          className={`w-full h-full object-cover transition-transform duration-500 ${
            isSelected ? 'scale-105 opacity-90' : 'group-hover:scale-105'
          }`}
          loading="lazy"
        />

        {/* Gradient shadow overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent pointer-events-none" />

        {/* Multi-Selection Checkbox Badge */}
        {(isSelectionMode || isSelected) && (
          <div
            onClick={e => {
              e.stopPropagation();
              onToggleSelect?.(item);
            }}
            className="absolute top-2.5 left-2.5 z-10 cursor-pointer"
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shadow-lg ${
                isSelected
                  ? 'bg-indigo-600 text-white ring-2 ring-white/80 scale-105'
                  : 'bg-black/70 backdrop-blur-md border border-slate-600 text-transparent hover:border-indigo-400'
              }`}
            >
              <Check className={`w-4 h-4 stroke-[3] ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
            </div>
          </div>
        )}

        {/* Top Badges (Quality & Year) */}
        <div
          className={`absolute top-2.5 right-2.5 flex items-center gap-1.5 pointer-events-none ${
            isSelectionMode || isSelected ? 'left-10 justify-end' : 'left-2.5 justify-between'
          }`}
        >
          {item.quality && (!isSelectionMode || !isSelected) && (
            <span className="bg-black/70 backdrop-blur-md text-cyan-300 border border-cyan-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
              {item.quality}
            </span>
          )}
          {item.year && (
            <span className="bg-black/70 backdrop-blur-md text-slate-300 border border-slate-700/60 text-[10px] font-medium px-2 py-0.5 rounded-md">
              {item.year}
            </span>
          )}
        </div>

        {/* Episode / Season Tag for series and animes */}
        {(item.season || item.episode) && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 pointer-events-none">
            <span className="bg-indigo-950/90 backdrop-blur-md text-indigo-200 border border-indigo-500/40 text-[11px] font-semibold px-2.5 py-1 rounded-lg block truncate shadow-md">
              {item.season ? `${item.season} • ` : ''}
              {item.episode || 'Episodio'}
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Genre tags */}
          {item.genre && item.genre.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {item.genre.slice(0, 2).map((g, idx) => (
                <span
                  key={idx}
                  className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h3
            className={`text-sm font-bold transition-colors line-clamp-1 ${
              isSelected ? 'text-indigo-300' : 'text-slate-100 group-hover:text-cyan-300'
            }`}
            title={item.title}
          >
            {item.title}
          </h3>

          {/* Synopsis */}
          <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* File meta (Size, parts, downloads) */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 font-mono">
            <HardDrive className="w-3 h-3 text-cyan-400" />
            <span>{item.fileSize ? formatBytes(item.fileSize) : 'BitZero'}</span>
          </span>

          {item.downloadsCount !== undefined && (
            <span className="text-slate-500">
              {item.downloadsCount} descarga{item.downloadsCount === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {/* Download & View Details Actions */}
        <div className="space-y-1.5 pt-1">
          {/* Active Download Progress Indicator if currently running */}
          {isDownloading && (
            <div className="space-y-1">
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, downloadProgress)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-cyan-300 font-medium">
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Descargando simultáneamente...
                </span>
                <span>{downloadProgress}%</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Download Button */}
            <button
              id={`download-btn-${item.id}`}
              onClick={e => {
                e.stopPropagation();
                onDownload(item);
              }}
              disabled={isDownloading}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md ${
                isCompleted
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  : isDownloading
                  ? 'bg-indigo-950 border border-indigo-500/40 text-indigo-300 cursor-wait'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-[0.98]'
              }`}
            >
              {isCompleted ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Listo en descargas</span>
                </>
              ) : isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>En progreso</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </>
              )}
            </button>

            {/* Details modal trigger */}
            <button
              onClick={e => {
                e.stopPropagation();
                onViewDetails(item);
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition-colors"
              title="Ver detalles completos"
            >
              <Info className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
