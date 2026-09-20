import fs from 'fs';
import path from 'path';
import { parseBitZeroUrl, generateTestBitZeroUrl } from './bitzeroEngine';

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
  bitzeroUrl: string;
  fileSize?: number;
  fileName?: string;
  partsCount?: number;
  downloadsCount?: number;
  createdAt: number;
}

const CATALOG_FILE = path.join(process.cwd(), '.catalog_store.json');

class CatalogManager {
  private items: CatalogItem[] = [];

  constructor() {
    this.loadCatalog();
  }

  private loadCatalog() {
    if (fs.existsSync(CATALOG_FILE)) {
      try {
        const raw = fs.readFileSync(CATALOG_FILE, 'utf-8');
        this.items = JSON.parse(raw);
        if (Array.isArray(this.items) && this.items.length > 0) {
          return;
        }
      } catch (err) {
        console.error('Error reading catalog file:', err);
      }
    }
    // Pre-seed catalog with high quality items for Películas, Series, and Animes
    this.seedDefaultCatalog();
  }

  private saveCatalog() {
    try {
      fs.writeFileSync(CATALOG_FILE, JSON.stringify(this.items, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving catalog:', err);
    }
  }

  private seedDefaultCatalog() {
    const movieUrl = generateTestBitZeroUrl(
      'Oppenheimer.2023.1080p.WEBDL.Dual.Latino.mkv',
      'Película Oppenheimer completa. Desencriptada en segundo plano por el motor BitZero de Descargas gratis Emanuel.',
      2
    );

    const spiderUrl = generateTestBitZeroUrl(
      'Spider-Man.Across.the.Spider-Verse.1080p.mkv',
      'Spider-Man: A través del Spider-Verso. Archivo desencriptado en segundo plano.',
      1
    );

    const breakingBadUrl = generateTestBitZeroUrl(
      'Breaking.Bad.S01E01.Pilot.1080p.mkv',
      'Breaking Bad Temporada 1 Episodio 01. Desencriptado por BitZero.',
      2
    );

    const strangerThingsUrl = generateTestBitZeroUrl(
      'Stranger.Things.S04E01.1080p.Dual.mkv',
      'Stranger Things Temporada 4 Capítulo 1. Descarga BitZero.',
      2
    );

    const demonSlayerUrl = generateTestBitZeroUrl(
      'Demon.Slayer.Kimetsu.no.Yaiba.S01E01.1080p.mkv',
      'Kimetsu no Yaiba Episodio 1 HD Subtitulado y Latino. Descargado en segundo plano.',
      2
    );

    const shingekiUrl = generateTestBitZeroUrl(
      'Attack.on.Titan.Final.Season.Part3.1080p.mkv',
      'Shingeki no Kyojin The Final Season. Descarga BitZero lista.',
      3
    );

    this.items = [
      // 🎬 Películas
      {
        id: 'cat_pelicula_1',
        title: 'Oppenheimer (2023)',
        category: 'peliculas',
        coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80',
        description: 'La historia del físico J. Robert Oppenheimer y su rol en el Proyecto Manhattan, que llevó a la creación de la primera bomba atómica.',
        year: '2023',
        genre: ['Drama', 'Historia', 'Biografía'],
        quality: '1080p FHD Dual',
        bitzeroUrl: movieUrl,
        fileSize: 2450000000,
        fileName: 'Oppenheimer.2023.1080p.WEBDL.Dual.Latino.mkv',
        partsCount: 3,
        downloadsCount: 142,
        createdAt: Date.now() - 3600000 * 24 * 3,
      },
      {
        id: 'cat_pelicula_2',
        title: 'Spider-Man: A través del Spider-Verso',
        category: 'peliculas',
        coverUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=800&q=80',
        description: 'Miles Morales es catapultado a través del Multiverso, donde se encuentra con un equipo de Spider-Personas encargadas de proteger su existencia.',
        year: '2023',
        genre: ['Animación', 'Acción', 'Aventura', 'Sci-Fi'],
        quality: '1080p Ultra HD',
        bitzeroUrl: spiderUrl,
        fileSize: 2100000000,
        fileName: 'Spider-Man.Across.the.Spider-Verse.1080p.mkv',
        partsCount: 3,
        downloadsCount: 289,
        createdAt: Date.now() - 3600000 * 24 * 2,
      },
      // 📺 Series
      {
        id: 'cat_serie_1',
        title: 'Breaking Bad',
        category: 'series',
        coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
        description: 'Un profesor de química de secundaria con cáncer terminal se asocia con un exalumno para fabricar y vender metanfetamina para asegurar el futuro de su familia.',
        year: '2008 - 2013',
        genre: ['Crimen', 'Drama', 'Thriller'],
        quality: '1080p HD Remaster',
        season: 'Temporada 1',
        episode: 'Capítulo 01 (Piloto)',
        bitzeroUrl: breakingBadUrl,
        fileSize: 1250000000,
        fileName: 'Breaking.Bad.S01E01.Pilot.1080p.mkv',
        partsCount: 3,
        downloadsCount: 512,
        createdAt: Date.now() - 3600000 * 24 * 5,
      },
      {
        id: 'cat_serie_2',
        title: 'Stranger Things',
        category: 'series',
        coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&q=80',
        description: 'Cuando un niño desaparece, sus amigos, la familia y la policía local se ven envueltos en un misterio extraordinario con experimentos secretos y fuerzas sobrenaturales.',
        year: '2022',
        genre: ['Fantasía', 'Terror', 'Misterio'],
        quality: '1080p FHD Dual Latino',
        season: 'Temporada 4',
        episode: 'Capítulo 01: El Club del Fuego Infernal',
        bitzeroUrl: strangerThingsUrl,
        fileSize: 1400000000,
        fileName: 'Stranger.Things.S04E01.1080p.Dual.mkv',
        partsCount: 3,
        downloadsCount: 340,
        createdAt: Date.now() - 3600000 * 24 * 4,
      },
      // ⛩️ Animes
      {
        id: 'cat_anime_1',
        title: 'Demon Slayer: Kimetsu no Yaiba',
        category: 'animes',
        coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80',
        description: 'Tanjiro Kamado, un joven cuya familia fue masacrada por un demonio y cuya hermana menor Nezuko fue transformada en uno, emprende un viaje para convertirla de nuevo en humana.',
        year: '2019 - 2024',
        genre: ['Anime', 'Acción', 'Fantasía Oscura', 'Shonen'],
        quality: '1080p FHD BD-Rip',
        season: 'Temporada 1 (Tanjiro Kamado Risshi-hen)',
        episode: 'Capítulo 01: Crueldad',
        bitzeroUrl: demonSlayerUrl,
        fileSize: 650000000,
        fileName: 'Demon.Slayer.Kimetsu.no.Yaiba.S01E01.1080p.mkv',
        partsCount: 3,
        downloadsCount: 780,
        createdAt: Date.now() - 3600000 * 24 * 1,
      },
      {
        id: 'cat_anime_2',
        title: 'Attack on Titan (Shingeki no Kyojin)',
        category: 'animes',
        coverUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&q=80',
        description: 'La humanidad vive atrincherada tras enormes muros para protegerse de los Titanes devoradores de humanos. Eren Jaeger jura erradicarlos a todos tras la caída de su hogar.',
        year: '2023',
        genre: ['Anime', 'Acción', 'Drama Militar', 'Misterio'],
        quality: '1080p FHD Dual',
        season: 'The Final Season',
        episode: 'Parte 3 (Especial)',
        bitzeroUrl: shingekiUrl,
        fileSize: 890000000,
        fileName: 'Attack.on.Titan.Final.Season.Part3.1080p.mkv',
        partsCount: 3,
        downloadsCount: 620,
        createdAt: Date.now() - 3600000 * 12,
      },
    ];

    this.saveCatalog();
  }

  public getItems(category?: MediaCategory): CatalogItem[] {
    if (category) {
      return this.items.filter(i => i.category === category);
    }
    return [...this.items];
  }

  public getSanitizedItems(category?: MediaCategory): Omit<CatalogItem, 'bitzeroUrl'>[] {
    return this.getItems(category).map(({ bitzeroUrl, ...rest }) => rest);
  }

  public getItemById(id: string): CatalogItem | undefined {
    return this.items.find(i => i.id === id);
  }

  public getSanitizedItemById(id: string): Omit<CatalogItem, 'bitzeroUrl'> | undefined {
    const item = this.getItemById(id);
    if (!item) return undefined;
    const { bitzeroUrl, ...rest } = item;
    return rest;
  }

  public addItem(itemData: {
    title: string;
    category: MediaCategory;
    coverUrl: string;
    description?: string;
    year?: string;
    genre?: string[];
    quality?: string;
    season?: string;
    episode?: string;
    bitzeroUrl: string;
  }): CatalogItem {
    // Extract metadata from bitzero url automatically
    let parsedMeta: any = null;
    try {
      parsedMeta = parseBitZeroUrl(itemData.bitzeroUrl);
    } catch {
      // url might be special or test
    }

    const newItem: CatalogItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: itemData.title.trim(),
      category: itemData.category,
      coverUrl: itemData.coverUrl.trim() || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80',
      description: itemData.description?.trim() || 'Subido por el bot de descargas BitZero.',
      year: itemData.year?.trim() || new Date().getFullYear().toString(),
      genre: itemData.genre || ['General'],
      quality: itemData.quality?.trim() || '1080p FHD',
      season: itemData.season?.trim(),
      episode: itemData.episode?.trim(),
      bitzeroUrl: itemData.bitzeroUrl.trim(),
      fileSize: parsedMeta?.file_size || 0,
      fileName: parsedMeta?.original_name || itemData.title,
      partsCount: parsedMeta?.file_ids?.length || 1,
      downloadsCount: 0,
      createdAt: Date.now(),
    };

    this.items.unshift(newItem);
    this.saveCatalog();
    return newItem;
  }

  public updateItem(id: string, updates: Partial<CatalogItem>): CatalogItem | null {
    const idx = this.items.findIndex(i => i.id === id);
    if (idx === -1) return null;

    this.items[idx] = {
      ...this.items[idx],
      ...updates,
    };
    this.saveCatalog();
    return this.items[idx];
  }

  public deleteItem(id: string): boolean {
    const prevLen = this.items.length;
    this.items = this.items.filter(i => i.id !== id);
    if (this.items.length !== prevLen) {
      this.saveCatalog();
      return true;
    }
    return false;
  }

  public incrementDownloads(id: string): void {
    const item = this.items.find(i => i.id === id);
    if (item) {
      item.downloadsCount = (item.downloadsCount || 0) + 1;
      this.saveCatalog();
    }
  }
}

export const catalogManager = new CatalogManager();
