import React from 'react';
import {
  Film,
  Tv,
  Sparkles,
  Lock,
  DownloadCloud,
  BellRing,
  Bell,
  Search,
  CheckCircle,
  Loader2,
  HardDrive,
  Settings,
  Clock,
  Folder,
} from 'lucide-react';
import { MediaCategory } from '../types';

interface NavbarProps {
  activeTab: MediaCategory | 'admin';
  setActiveTab: (tab: MediaCategory | 'admin') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeDownloadsCount: number;
  onOpenDownloads: () => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  isAdminLoggedIn: boolean;
  onOpenSettings: () => void;
  scheduleEnabled?: boolean;
  isScheduleActiveNow?: boolean;
  currentFolder?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  activeDownloadsCount,
  onOpenDownloads,
  notificationsEnabled,
  onToggleNotifications,
  isAdminLoggedIn,
  onOpenSettings,
  scheduleEnabled = false,
  isScheduleActiveNow = false,
  currentFolder,
}) => {
  const navTabs: { id: MediaCategory | 'admin'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'peliculas', label: 'Películas', icon: Film },
    { id: 'series', label: 'Series', icon: Tv },
    { id: 'animes', label: 'Animes', icon: Sparkles },
    { id: 'admin', label: 'Admin (Bot)', icon: Lock },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top Brand & Global Actions */}
        <div className="py-3 flex items-center justify-between gap-4 border-b border-slate-900">
          {/* Logo & App Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <DownloadCloud className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Descargas gratis Emanuel
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  BitZero v2
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Descarga de series, películas y animes en segundo plano
              </p>
            </div>
          </div>

          {/* Search bar & Quick controls */}
          <div className="flex items-center gap-2.5">
            {/* Search (only on catalog tabs) */}
            {activeTab !== 'admin' && (
              <div className="relative hidden md:block w-56 lg:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Buscar ${activeTab}...`}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            )}

            {/* Notification alert toggle */}
            <button
              onClick={onToggleNotifications}
              className={`p-2 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                notificationsEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={
                notificationsEnabled
                  ? 'Notificaciones activadas (Avisará al completar descargas)'
                  : 'Activar notificaciones en segundo plano'
              }
            >
              {notificationsEnabled ? (
                <BellRing className="w-4 h-4 text-emerald-400" />
              ) : (
                <Bell className="w-4 h-4 text-slate-400" />
              )}
              <span className="hidden lg:inline text-[11px]">
                {notificationsEnabled ? 'Notificaciones On' : 'Avisar'}
              </span>
            </button>

            {/* Settings (Folder & Schedule) Button */}
            <button
              id="navbar-settings-btn"
              onClick={onOpenSettings}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                scheduleEnabled
                  ? isScheduleActiveNow
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-900/20'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 hover:text-white'
              }`}
              title="Configuración de carpeta de descargas y horarios programados"
            >
              <Settings className="w-4 h-4 text-slate-400 group-hover:text-white" />
              <span className="hidden sm:inline">Configuración</span>
              {scheduleEnabled && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    isScheduleActiveNow ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                  }`}
                  title={isScheduleActiveNow ? 'Horario de descargas activo' : 'Horario programado en espera'}
                />
              )}
            </button>

            {/* Downloads Drawer Button */}
            <button
              id="navbar-downloads-btn"
              onClick={onOpenDownloads}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                activeDownloadsCount > 0
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-600/25 animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Mis Descargas</span>
              {activeDownloadsCount > 0 ? (
                <span className="bg-white text-indigo-900 text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                  {activeDownloadsCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Películas, Series, Animes, Admin) */}
        <nav className="flex items-center justify-between sm:justify-start gap-2 py-2.5 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {navTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isAdminTab = tab.id === 'admin';

              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? isAdminTab
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                        : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : isAdminTab
                      ? 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isAdminTab && !isActive ? 'text-amber-400' : ''}`} />
                  <span>{tab.label}</span>
                  {isAdminTab && isAdminLoggedIn && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title="Sesión activa" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile search bar */}
          {activeTab !== 'admin' && (
            <div className="block md:hidden flex-1 max-w-xs ml-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
