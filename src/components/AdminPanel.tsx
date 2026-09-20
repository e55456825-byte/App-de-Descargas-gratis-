import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  Upload,
  Image as ImageIcon,
  Link2,
  Film,
  Tv,
  Sparkles,
  PlusCircle,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  LogOut,
  HardDrive,
  Layers,
  FileCode,
  Calendar,
  Tag,
  RefreshCw,
  Smartphone,
  ImagePlus,
  X,
  Loader2,
} from 'lucide-react';
import { CatalogItem, MediaCategory, BitZeroParsedUrl } from '../types';
import { parseBitZeroUrl, formatBytes } from '../utils/bitzero';

interface AdminPanelProps {
  isAdminLoggedIn: boolean;
  adminToken?: string | null;
  onLoginSuccess: (token: string) => void;
  onLogout: () => void;
  catalogItems: CatalogItem[];
  onRefreshCatalog: () => void;
  onTestDownload: (item: CatalogItem) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isAdminLoggedIn,
  adminToken,
  onLoginSuccess,
  onLogout,
  catalogItems,
  onRefreshCatalog,
  onTestDownload,
}) => {
  // Login state
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Form state
  const [category, setCategory] = useState<MediaCategory>('peliculas');
  const [title, setTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFileName, setCoverFileName] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [bitzeroUrl, setBitzeroUrl] = useState('');
  const [description, setDescription] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [quality, setQuality] = useState('1080p FHD');
  const [season, setSeason] = useState('');
  const [episode, setEpisode] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Acción']);
  const [customGenre, setCustomGenre] = useState('');

  // Live parsed preview of BitZero URL
  const [parsedPreview, setParsedPreview] = useState<BitZeroParsedUrl | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Submission feedback
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Common genres
  const availableGenres = [
    'Acción',
    'Aventura',
    'Animación',
    'Comedia',
    'Crimen',
    'Drama',
    'Fantasía',
    'Terror',
    'Ciencia Ficción',
    'Romance',
    'Suspense',
    'Shonen',
    'Misterio',
  ];

  // Live parse BitZero URL as admin types or pastes it
  useEffect(() => {
    if (!bitzeroUrl.trim()) {
      setParsedPreview(null);
      setParseError(null);
      return;
    }

    try {
      const parsed = parseBitZeroUrl(bitzeroUrl.trim());
      setParsedPreview(parsed);
      setParseError(null);

      // Auto-fill title or description if empty
      if (!title.trim() && parsed.original_name) {
        // Clean common release tags for a clean title
        const cleanName = parsed.original_name
          .replace(/\.(mkv|mp4|avi|rar|zip)$/i, '')
          .replace(/[\._]/g, ' ')
          .replace(/\b(1080p|720p|2160p|4k|webdl|bluray|x264|x265|hevc|dual|latino)\b/gi, '')
          .trim();
        setTitle(cleanName);
      }
    } catch (err: any) {
      setParsedPreview(null);
      if (bitzeroUrl.trim().length > 15) {
        setParseError(err.message || 'Enlace BitZero no válido');
      }
    }
  }, [bitzeroUrl]);

  // Handle Admin Login (Strict password: 140909)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.trim() }),
      });
      const data = await res.json();

      if (data.success && data.token) {
        onLoginSuccess(data.token);
        setPasswordInput('');
      } else {
        setLoginError(data.error || 'Contraseña incorrecta');
      }
    } catch (err: any) {
      setLoginError('Error de conexión con el servidor');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Process image from gallery with mobile-optimized client resizing
  const processAndSetImageFile = (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG o WEBP)');
      return;
    }

    setIsProcessingImage(true);
    setCoverFileName(file.name);

    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        // High quality mobile optimization: resize high-megapixel photos to crisp max 1200px
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setCoverUrl(optimizedDataUrl);
        } else {
          setCoverUrl(reader.result as string);
        }
        setIsProcessingImage(false);
      };
      img.onerror = () => {
        setCoverUrl(reader.result as string);
        setIsProcessingImage(false);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      setIsProcessingImage(false);
      alert('No se pudo leer la imagen seleccionada de la galería');
    };
    reader.readAsDataURL(file);
  };

  // Image file upload handler from phone gallery picker
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndSetImageFile(file);
    }
    // Reset file input to allow selecting the same file again if desired
    e.target.value = '';
  };

  // Drag and drop handlers for cover image
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCover(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCover(false);
  };

  const handleDropCover = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCover(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAndSetImageFile(file);
    }
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const addCustomGenre = () => {
    if (customGenre.trim() && !selectedGenres.includes(customGenre.trim())) {
      setSelectedGenres([...selectedGenres, customGenre.trim()]);
      setCustomGenre('');
    }
  };

  // Generate a test URL directly for the admin
  const handleGenerateBotUrl = async () => {
    try {
      const filename = `${title.trim() || 'Nuevo_Contenido'}.${category === 'peliculas' ? '1080p.mkv' : 'S01E01.mkv'}`;
      const res = await fetch('/api/bitzero/generate-test-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          content: `Archivo de ${title || 'contenido'} subido por el administrador de Descargas gratis Emanuel.`,
          mode: 2,
        }),
      });
      const data = await res.json();
      if (data.success && data.url) {
        setBitzeroUrl(data.url);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit new media item to catalog
  const handlePublishItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !bitzeroUrl.trim()) {
      setPublishError('El título y la URL de descarga son requeridos');
      return;
    }

    if (!coverUrl.trim()) {
      setPublishError('Por favor sube la foto de portada desde la galería de tu teléfono');
      return;
    }

    setIsPublishing(true);
    setPublishError(null);
    setPublishSuccess(false);

    try {
      const token = adminToken || localStorage.getItem('admin_token') || '';
      const res = await fetch('/api/admin/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          category,
          coverUrl: coverUrl.trim(),
          description: description.trim(),
          year: year.trim(),
          genre: selectedGenres,
          quality: quality.trim(),
          season: season.trim() || undefined,
          episode: episode.trim() || undefined,
          bitzeroUrl: bitzeroUrl.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPublishSuccess(true);
        setTitle('');
        setCoverUrl('');
        setCoverFileName('');
        setBitzeroUrl('');
        setDescription('');
        setSeason('');
        setEpisode('');
        setParsedPreview(null);
        onRefreshCatalog();

        setTimeout(() => setPublishSuccess(false), 3500);
      } else {
        setPublishError(data.error || 'Error al publicar contenido');
      }
    } catch (err: any) {
      setPublishError(err.message || 'Error de conexión');
    } finally {
      setIsPublishing(false);
    }
  };

  // Delete item from catalog
  const handleDeleteItem = async (id: string) => {
    if (!confirm('¿Eliminar este contenido del catálogo público?')) return;

    try {
      const token = adminToken || localStorage.getItem('admin_token') || '';
      await fetch(`/api/admin/items/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      onRefreshCatalog();
    } catch (err) {
      console.error(err);
    }
  };

  // 1. If not logged in, show Password Lock Screen (Password: 140909)
  if (!isAdminLoggedIn) {
    return (
      <div className="max-w-md mx-auto my-8 p-6 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md">
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white">Acceso de Administrador</h2>
          <p className="text-xs text-slate-400">
            Panel exclusivo para el creador y administrador del bot para subir series, películas y animes.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="admin-password-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Contraseña de Administrador:
            </label>
            <input
              type="password"
              id="admin-password-input"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              placeholder="Ingresa la clave..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-mono transition-all"
              autoFocus
            />
          </div>

          {loginError && (
            <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            id="admin-login-btn"
            disabled={!passwordInput.trim() || isLoggingIn}
            className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Unlock className="w-4 h-4" />
            <span>{isLoggingIn ? 'Verificando...' : 'Acceder al Panel'}</span>
          </button>
        </form>
      </div>
    );
  }

  // 2. Admin Panel Dashboard (Authenticated)
  return (
    <div className="space-y-8">
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <ShieldCheckIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">Panel del Administrador</h2>
              <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Sesión Activa
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Aquí puedes publicar las URLs de descarga generadas por el bot junto con sus fotos de portada para que los usuarios las descarguen con un clic.
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 border border-slate-700 hover:border-rose-800 transition-colors flex items-center gap-1.5 self-start sm:self-center"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      {/* Main Form: Subir Nueva Serie, Película o Anime */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-amber-400" />
            <span>Publicar Nuevo Contenido en la App</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Los usuarios verán este contenido en la pestaña correspondiente (Series, Películas o Animes) y lo descargarán sin ver ni escribir el enlace.
          </p>
        </div>

        <form onSubmit={handlePublishItem} className="space-y-6">
          {/* 1. Category Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              1. Selecciona la Pestaña / Categoría:
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setCategory('peliculas')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  category === 'peliculas'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-500/10 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Film className="w-5 h-5 text-indigo-400" />
                <span className="text-xs">Películas</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('series')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  category === 'series'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-500/10 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Tv className="w-5 h-5 text-indigo-400" />
                <span className="text-xs">Series</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('animes')}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  category === 'animes'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-500/10 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span className="text-xs">Animes</span>
              </button>
            </div>
          </div>

          {/* 2. URL BitZero del Bot */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="admin-bitzero-url" className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-cyan-400" />
                <span>2. URL o Código BitZero Generado por el Bot:</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateBotUrl}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generar URL de prueba del bot</span>
              </button>
            </div>
            <textarea
              id="admin-bitzero-url"
              rows={2}
              value={bitzeroUrl}
              onChange={e => setBitzeroUrl(e.target.value)}
              placeholder="Pega aquí el enlace que da el bot de Telegram (ej. 58780200-5260/1-2-3/1/aHR0...)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              required
            />

            {/* Live Verification of URL */}
            {parsedPreview && (
              <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enlace BitZero validado y desencriptado correctamente:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-300 font-mono text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500">Archivo:</span> {parsedPreview.original_name}
                  </div>
                  <div>
                    <span className="text-slate-500">Tamaño:</span> {formatBytes(parsedPreview.file_size)}
                  </div>
                  <div>
                    <span className="text-slate-500">Partes:</span> {parsedPreview.parts_count || parsedPreview.file_ids?.length || 1} chunks
                  </div>
                </div>
              </div>
            )}

            {parseError && (
              <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}
          </div>

          {/* 3. Cover Image (Upload directly from phone gallery) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                3. Foto de Portada (Desde la galería del teléfono):
              </label>
              <span className="text-[11px] text-indigo-400 font-medium flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" />
                Solo subir foto de la galería
              </span>
            </div>

            {/* Hidden native input with accept="image/*" for mobile gallery & files */}
            <input
              type="file"
              id="phone-gallery-cover-input"
              accept="image/*"
              onChange={handleImageFileUpload}
              className="hidden"
            />

            {!coverUrl ? (
              /* Drop / Tap Card when no image selected */
              <label
                htmlFor="phone-gallery-cover-input"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDropCover}
                className={`relative cursor-pointer border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center text-center group ${
                  isDraggingCover
                    ? 'border-indigo-500 bg-indigo-950/30 ring-2 ring-indigo-500/20'
                    : 'border-slate-800 hover:border-indigo-500/60 bg-slate-950/80 hover:bg-slate-900/50'
                }`}
              >
                {isProcessingImage ? (
                  <div className="flex flex-col items-center py-4 space-y-2">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    <span className="text-xs text-indigo-300 font-medium">
                      Procesando y optimizando foto de la galería...
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-105 group-hover:bg-indigo-600/20 transition-all shadow-inner">
                      <div className="relative">
                        <Smartphone className="w-7 h-7" />
                        <ImagePlus className="w-4 h-4 text-emerald-400 absolute -bottom-1 -right-2 drop-shadow" />
                      </div>
                    </div>

                    <h4 className="text-sm font-semibold text-slate-100 mb-1 group-hover:text-indigo-300 transition-colors">
                      Subir foto de portada desde la galería del teléfono
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mb-3">
                      Toca aquí para abrir la galería de fotos, cámara o carrete de tu teléfono
                    </p>

                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>JPG, PNG, WEBP • Optimización automática para móviles</span>
                    </div>
                  </>
                )}
              </label>
            ) : (
              /* Loaded Preview & Gallery Switcher */
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  {/* Poster Thumbnail */}
                  <div className="relative shrink-0 group">
                    <img
                      src={coverUrl}
                      alt="Foto de portada seleccionada de la galería"
                      className="w-28 sm:w-32 aspect-[2/3] object-cover rounded-xl shadow-lg border border-slate-700/80"
                    />
                    <div className="absolute top-1.5 right-1.5 bg-emerald-600/90 text-white p-1 rounded-md shadow">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Info and Actions */}
                  <div className="flex-1 flex flex-col justify-between self-stretch text-center sm:text-left py-1">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Foto cargada desde la galería del teléfono</span>
                      </div>

                      {coverFileName && (
                        <p className="text-xs text-slate-300 truncate max-w-sm">
                          <span className="text-slate-500">Archivo:</span> {coverFileName}
                        </p>
                      )}

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Esta imagen se mostrará como el póster oficial en la sección de {category === 'peliculas' ? 'Películas' : category === 'series' ? 'Series' : 'Animes'}.
                      </p>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-3">
                      <label
                        htmlFor="phone-gallery-cover-input"
                        className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-colors"
                      >
                        <ImagePlus className="w-4 h-4" />
                        <span>Cambiar foto de la galería</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setCoverUrl('');
                          setCoverFileName('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800/40 text-xs font-medium transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Quitar foto</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Title, Year, Quality, Seasons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="title-input" className="block text-xs font-semibold text-slate-300 mb-1">
                Título del Contenido:
              </label>
              <input
                type="text"
                id="title-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ej. Oppenheimer / Breaking Bad"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label htmlFor="quality-input" className="block text-xs font-semibold text-slate-300 mb-1">
                Calidad de Vídeo:
              </label>
              <input
                type="text"
                id="quality-input"
                value={quality}
                onChange={e => setQuality(e.target.value)}
                placeholder="1080p FHD"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="year-input" className="block text-xs font-semibold text-slate-300 mb-1">
                Año de Estreno:
              </label>
              <input
                type="text"
                id="year-input"
                value={year}
                onChange={e => setYear(e.target.value)}
                placeholder="2024"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Season & Episode (if Serie or Anime) */}
          {(category === 'series' || category === 'animes') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div>
                <label htmlFor="season-input" className="block text-xs font-semibold text-indigo-300 mb-1">
                  Temporada:
                </label>
                <input
                  type="text"
                  id="season-input"
                  value={season}
                  onChange={e => setSeason(e.target.value)}
                  placeholder="Ej. Temporada 1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="episode-input" className="block text-xs font-semibold text-indigo-300 mb-1">
                  Capítulo / Episodio:
                </label>
                <input
                  type="text"
                  id="episode-input"
                  value={episode}
                  onChange={e => setEpisode(e.target.value)}
                  placeholder="Ej. Capítulo 01 (o Temporada Completa)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* 5. Genres */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Géneros (selecciona varios):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableGenres.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGenre(g)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                    selectedGenres.includes(g)
                      ? 'bg-indigo-600 border-indigo-500 text-white font-medium'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Synopsis / Description */}
          <div>
            <label htmlFor="description-input" className="block text-xs font-semibold text-slate-300 mb-1">
              Sinopsis o Descripción:
            </label>
            <textarea
              id="description-input"
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Breve resumen de la trama..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Feedback alerts */}
          {publishSuccess && (
            <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                ¡Contenido publicado con éxito! Ya está disponible en la pestaña de {category} para todos los usuarios.
              </span>
            </div>
          )}

          {publishError && (
            <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 px-4 py-3 rounded-xl">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{publishError}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            id="admin-publish-btn"
            disabled={!title.trim() || !bitzeroUrl.trim() || isPublishing}
            className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
              !title.trim() || !bitzeroUrl.trim() || isPublishing
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 active:scale-[0.99]'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{isPublishing ? 'Publicando en la App...' : 'Subir y Publicar para los Usuarios'}</span>
          </button>
        </form>
      </div>

      {/* Catalog Items Management Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Contenido Publicado en el Catálogo ({catalogItems.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Gestiona el material disponible para los usuarios
            </p>
          </div>
          <button
            onClick={onRefreshCatalog}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Recargar catálogo"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {catalogItems.map(item => (
            <div
              key={item.id}
              className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-start gap-3 justify-between"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={item.coverUrl}
                  alt={item.title}
                  className="w-12 h-16 object-cover rounded-lg shrink-0 bg-slate-900"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded">
                      {item.category}
                    </span>
                    <span className="text-[10px] text-slate-500">{item.year}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 truncate" title={item.title}>
                    {item.title}
                  </h4>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {item.fileSize ? formatBytes(item.fileSize) : 'BitZero'} • {item.downloadsCount || 0} descargas
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => onTestDownload(item)}
                  className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs"
                  title="Probar descarga en segundo plano"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs"
                  title="Eliminar contenido"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function ShieldCheckIcon(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}
