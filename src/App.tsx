import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { MediaCard } from './components/MediaCard';
import { MediaDetailModal } from './components/MediaDetailModal';
import { AdminPanel } from './components/AdminPanel';
import { DownloadsDrawer } from './components/DownloadsDrawer';
import { SettingsModal } from './components/SettingsModal';
import { CatalogItem, MediaCategory, DownloadTask, DownloadSettings } from './types';
import { sendBackgroundNotification, requestNotificationPermission } from './utils/notifications';
import {
  Film,
  Tv,
  Sparkles,
  DownloadCloud,
  CheckCircle2,
  HardDrive,
  ShieldCheck,
  Search,
  Filter,
  CheckSquare,
  Square,
  Zap,
  Check,
  X,
  Clock,
  Folder,
  Settings,
} from 'lucide-react';

const DEFAULT_DOWNLOAD_SETTINGS: DownloadSettings = {
  downloadFolder: 'Descargas/Películas y Series',
  folderPathType: 'browser_default',
  scheduleEnabled: false,
  scheduleStartTime: '00:00',
  scheduleEndTime: '06:00',
  autoSaveToFolder: true,
  notifyOnScheduleStart: true,
};

export default function App() {
  // Navigation: 'peliculas' | 'series' | 'animes' | 'admin'
  const [activeTab, setActiveTab] = useState<MediaCategory | 'admin'>('peliculas');
  const [searchQuery, setSearchQuery] = useState('');

  // Catalog state
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<CatalogItem | null>(null);

  // Multi-item simultaneous download selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isStartingBatch, setIsStartingBatch] = useState(false);

  // Background download tasks state
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [isDownloadsDrawerOpen, setIsDownloadsDrawerOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const prevTasksRef = useRef<Record<string, string>>({});

  // Download Folder & Scheduler Settings state
  const [downloadSettings, setDownloadSettings] = useState<DownloadSettings>(() => {
    try {
      const saved = localStorage.getItem('emanuel_download_settings');
      if (saved) {
        return { ...DEFAULT_DOWNLOAD_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_DOWNLOAD_SETTINGS;
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [nativeDirectoryHandle, setNativeDirectoryHandle] = useState<any>(null);
  const [nativeDirectoryName, setNativeDirectoryName] = useState<string | null>(null);

  // Admin authentication state (Password: 140909)
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('bitzero_admin_token') || null;
  });

  // Check notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await requestNotificationPermission();
      setNotificationsEnabled(granted);
      if (granted) {
        sendBackgroundNotification('Descargas gratis Emanuel', {
          body: 'Notificaciones en segundo plano activadas correctamente.',
        });
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  // Fetch catalog items from server
  const fetchCatalog = async () => {
    setIsLoadingCatalog(true);
    try {
      const res = await fetch('/api/catalog');
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setCatalogItems(data.items);
      }
    } catch (err) {
      console.error('Error loading catalog:', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  // Fetch download settings from server
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/download');
      const data = await res.json();
      if (data.success && data.settings) {
        setDownloadSettings(prev => ({
          ...prev,
          ...data.settings,
        }));
        localStorage.setItem('emanuel_download_settings', JSON.stringify(data.settings));
      }
    } catch (err) {
      console.error('Error loading download settings:', err);
    }
  };

  const handleSaveSettings = async (newSettings: DownloadSettings) => {
    setDownloadSettings(newSettings);
    localStorage.setItem('emanuel_download_settings', JSON.stringify(newSettings));
    try {
      await fetch('/api/settings/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
    } catch (err) {
      console.error('Error saving settings to server:', err);
    }
  };

  const handleSelectNativeFolder = async () => {
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        if (dirHandle && dirHandle.name) {
          setNativeDirectoryHandle(dirHandle);
          setNativeDirectoryName(dirHandle.name);
          const updated: DownloadSettings = {
            ...downloadSettings,
            downloadFolder: dirHandle.name,
            folderPathType: 'native_picker',
          };
          await handleSaveSettings(updated);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error selecting folder:', err);
        }
      }
    }
  };

  // Helper to determine if current time is inside the scheduled window
  const isScheduleActiveNow = (): boolean => {
    if (!downloadSettings.scheduleEnabled) return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = downloadSettings.scheduleStartTime.split(':').map(Number);
    const startMinutes = (startH || 0) * 60 + (startM || 0);

    const [endH, endM] = downloadSettings.scheduleEndTime.split(':').map(Number);
    const endMinutes = (endH || 0) * 60 + (endM || 0);

    if (startMinutes === endMinutes) return true;

    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  };

  // Fetch tasks and subscribe to SSE
  useEffect(() => {
    fetchCatalog();
    fetchSettings();

    const fetchTasks = async () => {
      try {
        const res = await fetch('/api/bitzero/tasks');
        const data = await res.json();
        if (data.success && Array.isArray(data.tasks)) {
          setTasks(data.tasks);
        }
      } catch (err) {
        console.error('Error fetching tasks:', err);
      }
    };

    fetchTasks();

    // SSE connection for live background download progress
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/bitzero/events');
      eventSource.onmessage = event => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'init' && Array.isArray(payload.tasks)) {
            setTasks(payload.tasks);
          } else if (payload.type === 'task_update' && payload.task) {
            setTasks(prev => {
              const existingIndex = prev.findIndex(t => t.id === payload.task.id);
              if (existingIndex >= 0) {
                const next = [...prev];
                next[existingIndex] = payload.task;
                return next;
              }
              return [payload.task, ...prev];
            });
          }
        } catch (e) {
          console.error('SSE parse error:', e);
        }
      };
    } catch (e) {
      console.warn('SSE fallback to polling');
    }

    const pollInterval = setInterval(() => {
      fetchTasks();
    }, 2500);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(pollInterval);
    };
  }, []);

  // Completion notification trigger
  useEffect(() => {
    tasks.forEach(task => {
      const prevStatus = prevTasksRef.current[task.id];
      if (prevStatus && prevStatus !== 'completed' && task.status === 'completed') {
        if (notificationsEnabled) {
          sendBackgroundNotification('¡Descarga completada en segundo plano!', {
            body: `${task.parsed.original_name} ha finalizado. Haz clic para guardarlo en tu dispositivo.`,
          });
        }
      }
      prevTasksRef.current[task.id] = task.status;
    });
  }, [tasks, notificationsEnabled]);

  // Trigger 1-click download for a catalog item (NO URL required from user!)
  const handleDownloadCatalogItem = async (item: CatalogItem) => {
    try {
      const res = await fetch(`/api/catalog/${item.id}/download`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.task) {
        setTasks(prev => [data.task, ...prev.filter(t => t.id !== data.task.id)]);
        setIsDownloadsDrawerOpen(true);
      } else {
        alert(data.error || 'Error al iniciar la descarga');
      }
    } catch (err: any) {
      alert(`Error al contactar con el servidor: ${err.message}`);
    }
  };

  // Direct start download (used by admin test)
  const handleStartDirectDownload = async (url: string) => {
    try {
      const res = await fetch('/api/bitzero/start-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.success && data.task) {
        setTasks(prev => [data.task, ...prev.filter(t => t.id !== data.task.id)]);
        setIsDownloadsDrawerOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Task control operations
  const handlePauseTask = async (id: string) => {
    try {
      await fetch(`/api/bitzero/tasks/${id}/pause`, { method: 'POST' });
      setTasks(prev =>
        prev.map(t => (t.id === id ? { ...t, status: 'paused' as const } : t))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleResumeTask = async (id: string) => {
    try {
      await fetch(`/api/bitzero/tasks/${id}/resume`, { method: 'POST' });
      setTasks(prev =>
        prev.map(t => (t.id === id ? { ...t, status: 'queued' as const } : t))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await fetch(`/api/bitzero/tasks/${id}`, { method: 'DELETE' });
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadCompletedFile = async (task: DownloadTask) => {
    // If native folder is connected, save directly to that folder
    if (nativeDirectoryHandle) {
      try {
        const response = await fetch(`/api/bitzero/tasks/${task.id}/file`);
        const blob = await response.blob();
        const filename = task.parsed?.original_name || `${task.itemTitle || 'archivo'}.mp4`;
        const fileHandle = await nativeDirectoryHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        if (notificationsEnabled) {
          sendBackgroundNotification('Descargas gratis Emanuel', {
            body: `Archivo guardado en la carpeta "${nativeDirectoryName}": ${filename}`,
          });
        }
        return;
      } catch (err: any) {
        console.warn('Fallback to standard download:', err);
      }
    }

    // Standard download fallback via browser
    const link = document.createElement('a');
    link.href = `/api/bitzero/tasks/${task.id}/file`;
    link.download = task.parsed?.original_name || 'archivo';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle selection of a single item
  const handleToggleSelectItem = (item: CatalogItem) => {
    setSelectedItemIds(prev =>
      prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
    );
  };

  // Select all or deselect all items currently shown in active filter
  const handleSelectAllFiltered = () => {
    const currentIds = filteredItems.map(i => i.id);
    const allSelected = currentIds.length > 0 && currentIds.every(id => selectedItemIds.includes(id));
    if (allSelected) {
      setSelectedItemIds(prev => prev.filter(id => !currentIds.includes(id)));
    } else {
      setSelectedItemIds(prev => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedItemIds([]);
    setIsSelectionMode(false);
  };

  // Batch download selected items simultaneously
  const handleDownloadSelected = async () => {
    if (selectedItemIds.length === 0) return;
    setIsStartingBatch(true);
    try {
      const res = await fetch('/api/catalog/batch-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedItemIds }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(prev => {
          const newIds = new Set(data.tasks.map((t: DownloadTask) => t.id));
          return [...data.tasks, ...prev.filter(t => !newIds.has(t.id))];
        });
        setSelectedItemIds([]);
        setIsSelectionMode(false);
        setIsDownloadsDrawerOpen(true);
      } else {
        alert(data.error || 'Error al iniciar descargas simultáneas');
      }
    } catch (err: any) {
      alert(`Error al iniciar descargas: ${err.message}`);
    } finally {
      setIsStartingBatch(false);
    }
  };

  // Batch task controls
  const handlePauseAllTasks = async () => {
    try {
      await fetch('/api/bitzero/tasks-pause-all', { method: 'POST' });
      setTasks(prev =>
        prev.map(t => (t.status === 'downloading' ? { ...t, status: 'paused' as const } : t))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleResumeAllTasks = async () => {
    try {
      await fetch('/api/bitzero/tasks-resume-all', { method: 'POST' });
      setTasks(prev =>
        prev.map(t => (t.status === 'paused' ? { ...t, status: 'queued' as const } : t))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearCompletedTasks = async () => {
    try {
      await fetch('/api/bitzero/tasks-clear-completed', { method: 'POST' });
      setTasks(prev =>
        prev.filter(
          t => t.status !== 'completed' && t.status !== 'failed' && t.status !== 'cancelled'
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Admin Auth handling
  const handleAdminLogin = (token: string) => {
    setAdminToken(token);
    localStorage.setItem('bitzero_admin_token', token);
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('bitzero_admin_token');
  };

  // Filter catalog items for active user tab
  const filteredItems = catalogItems.filter(item => {
    if (activeTab === 'admin') return true;
    const matchesCategory = item.category === activeTab;
    const matchesSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.genre && item.genre.some(g => g.toLowerCase().includes(searchQuery.toLowerCase())));

    return matchesCategory && matchesSearch;
  });

  const activeDownloads = tasks.filter(t => t.status === 'downloading');

  // Metadata labels for current category
  const categoryHeadings: Record<MediaCategory, { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }> = {
    peliculas: {
      title: 'Catálogo de Películas',
      subtitle: 'Estrenos, clásicos y éxitos del cine subidos por el bot listos para descargar en segundo plano.',
      icon: Film,
    },
    series: {
      title: 'Catálogo de Series',
      subtitle: 'Temporadas y episodios completos seleccionados y subidos por el administrador.',
      icon: Tv,
    },
    animes: {
      title: 'Catálogo de Animes',
      subtitle: 'Series anime en emisión, OVAS y temporadas en la más alta calidad y audio dual/sub.',
      icon: Sparkles,
    },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeDownloadsCount={activeDownloads.length}
        onOpenDownloads={() => setIsDownloadsDrawerOpen(true)}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={handleToggleNotifications}
        isAdminLoggedIn={!!adminToken}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        scheduleEnabled={downloadSettings.scheduleEnabled}
        isScheduleActiveNow={isScheduleActiveNow()}
        currentFolder={downloadSettings.downloadFolder}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Persistent Download Schedule / Folder Info Strip */}
        {downloadSettings.scheduleEnabled && (
          <div
            className={`rounded-2xl p-3.5 sm:p-4 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg transition-all ${
              isScheduleActiveNow()
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  isScheduleActiveNow()
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-xs sm:text-sm">
                <div className="font-bold flex items-center gap-2">
                  <span>
                    {isScheduleActiveNow()
                      ? `🟢 Horario de descarga activo: Finaliza a las ${downloadSettings.scheduleEndTime}`
                      : `🕒 Horario programado: En espera hasta las ${downloadSettings.scheduleStartTime}`}
                  </span>
                </div>
                <div className="text-[11px] opacity-80 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>Ventana: {downloadSettings.scheduleStartTime} - {downloadSettings.scheduleEndTime}</span>
                  <span>•</span>
                  <span>Carpeta destino: <strong>{downloadSettings.downloadFolder}</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 shrink-0 transition-colors ${
                isScheduleActiveNow()
                  ? 'bg-emerald-900/60 hover:bg-emerald-800/80 border-emerald-500/40 text-emerald-200'
                  : 'bg-amber-900/60 hover:bg-amber-800/80 border-amber-500/40 text-amber-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configurar horario</span>
            </button>
          </div>
        )}
        {/* VIEW 1: ADMIN TAB */}
        {activeTab === 'admin' ? (
          <AdminPanel
            isAdminLoggedIn={!!adminToken}
            adminToken={adminToken}
            onLoginSuccess={handleAdminLogin}
            onLogout={handleAdminLogout}
            catalogItems={catalogItems}
            onRefreshCatalog={fetchCatalog}
            onTestDownload={handleDownloadCatalogItem}
          />
        ) : (
          /* VIEW 2: USER TABS (Películas, Series, Animes) */
          <div className="space-y-6">
            {/* Category Hero Banner */}
            <div className="bg-gradient-to-r from-indigo-950/40 via-slate-900/80 to-slate-950 border border-indigo-500/20 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 shrink-0">
                  {React.createElement(categoryHeadings[activeTab].icon, { className: 'w-7 h-7' })}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {categoryHeadings[activeTab].title}
                    </h1>
                    <span className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold px-2.5 py-0.5 rounded-full">
                      {filteredItems.length} disponible{filteredItems.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    {categoryHeadings[activeTab].subtitle}
                  </p>
                </div>
              </div>

              {/* Action tools: Multi-selection toggle & verification indicator */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 self-stretch sm:self-auto">
                <button
                  onClick={() => {
                    if (isSelectionMode) {
                      handleClearSelection();
                    } else {
                      setIsSelectionMode(true);
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                    isSelectionMode
                      ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/25'
                      : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                  title="Permite seleccionar múltiples elementos para descargarlos juntos"
                >
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                  <span>{isSelectionMode ? 'Modo selección activo' : 'Descarga múltiple'}</span>
                </button>

                <div className="hidden lg:flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl text-xs text-slate-300 justify-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Descargas simultáneas directas</span>
                </div>
              </div>
            </div>

            {/* Sticky Multi-Select Toolbar when in selection mode or has selections */}
            {(isSelectionMode || selectedItemIds.length > 0) && (
              <div className="sticky top-20 z-30 bg-slate-900/95 border border-indigo-500/40 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl shadow-indigo-950/50 animate-in slide-in-from-top-2 duration-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleSelectAllFiltered}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium flex items-center gap-1.5 transition-colors"
                  >
                    {filteredItems.length > 0 &&
                    filteredItems.every(i => selectedItemIds.includes(i.id)) ? (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Deseleccionar todo</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-3.5 h-3.5 text-slate-400" />
                        <span>Seleccionar todos ({filteredItems.length})</span>
                      </>
                    )}
                  </button>

                  <span className="text-xs font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-500/30 px-2.5 py-1 rounded-lg">
                    {selectedItemIds.length} seleccionado{selectedItemIds.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadSelected}
                    disabled={selectedItemIds.length === 0 || isStartingBatch}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
                      selectedItemIds.length > 0 && !isStartingBatch
                        ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98]'
                        : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-cyan-300" />
                    <span>
                      {isStartingBatch
                        ? 'Iniciando simultáneas...'
                        : `Descargar ${selectedItemIds.length} al mismo tiempo`}
                    </span>
                  </button>

                  <button
                    onClick={handleClearSelection}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    title="Cerrar modo de selección"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Grid of Media Items */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 px-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-300">
                  No se encontraron resultados en {activeTab}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {searchQuery
                    ? `No hay coincidencias para "${searchQuery}". Intenta con otra búsqueda.`
                    : 'El administrador aún no ha subido contenido en esta categoría.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5">
                {filteredItems.map(item => {
                  // Check if there is an active download matching this item
                  const activeTask = tasks.find(
                    t => t.catalogItemId === item.id || t.parsed?.original_name === item.fileName
                  );

                  return (
                    <MediaCard
                      key={item.id}
                      item={item}
                      onDownload={handleDownloadCatalogItem}
                      onViewDetails={setSelectedItemForDetails}
                      isDownloading={activeTask?.status === 'downloading'}
                      isCompleted={activeTask?.status === 'completed'}
                      downloadProgress={activeTask?.progress || 0}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedItemIds.includes(item.id)}
                      onToggleSelect={handleToggleSelectItem}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Persistent Bottom Bar for active background downloads (if any) */}
      {activeDownloads.length > 0 && !isDownloadsDrawerOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 animate-in slide-in-from-bottom-5">
          <button
            onClick={() => setIsDownloadsDrawerOpen(true)}
            className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white px-4 py-3 rounded-2xl shadow-xl shadow-indigo-500/25 flex items-center gap-3 text-xs font-bold border border-white/20 transition-all hover:scale-105"
          >
            <DownloadCloud className="w-5 h-5 animate-bounce" />
            <div className="text-left">
              <div className="leading-tight">
                {activeDownloads.length} descarga{activeDownloads.length === 1 ? '' : 's'} simultánea{activeDownloads.length === 1 ? '' : 's'} en curso
              </div>
              <div className="text-[10px] text-cyan-100 font-normal">
                {(activeDownloads[0].itemTitle || activeDownloads[0].parsed.original_name).slice(0, 22)}... ({activeDownloads[0].progress}%)
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Descargas gratis Emanuel • Plataforma segura</span>
          <span>Descargas directas y automáticas en segundo plano</span>
        </div>
      </footer>

      {/* Details Modal */}
      {selectedItemForDetails && (
        <MediaDetailModal
          item={selectedItemForDetails}
          onClose={() => setSelectedItemForDetails(null)}
          onDownload={handleDownloadCatalogItem}
          isDownloading={
            tasks.find(
              t =>
                t.catalogItemId === selectedItemForDetails.id ||
                t.parsed?.original_name === selectedItemForDetails.fileName
            )?.status === 'downloading'
          }
          isCompleted={
            tasks.find(
              t =>
                t.catalogItemId === selectedItemForDetails.id ||
                t.parsed?.original_name === selectedItemForDetails.fileName
            )?.status === 'completed'
          }
          downloadProgress={
            tasks.find(
              t =>
                t.catalogItemId === selectedItemForDetails.id ||
                t.parsed?.original_name === selectedItemForDetails.fileName
            )?.progress || 0
          }
        />
      )}

      {/* Downloads Drawer */}
      <DownloadsDrawer
        isOpen={isDownloadsDrawerOpen}
        onClose={() => setIsDownloadsDrawerOpen(false)}
        tasks={tasks}
        onPause={handlePauseTask}
        onResume={handleResumeTask}
        onDelete={handleDeleteTask}
        onDownloadFile={handleDownloadCompletedFile}
        onPauseAll={handlePauseAllTasks}
        onResumeAll={handleResumeAllTasks}
        onClearCompleted={handleClearCompletedTasks}
        downloadSettings={downloadSettings}
        isScheduleActiveNow={isScheduleActiveNow()}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Download Folder and Schedule Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={downloadSettings}
        onSaveSettings={handleSaveSettings}
        nativeDirectoryName={nativeDirectoryName}
        onSelectNativeFolder={handleSelectNativeFolder}
      />
    </div>
  );
}
