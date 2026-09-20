import { SafeBitZeroInfo, BitzeroMode } from '../types';

export const MODE_NAMES: Record<BitzeroMode, string> = {
  0: 'Modo 0: Directo',
  1: 'Modo 1: Camuflaje Seguro',
  2: 'Modo 2: Ofuscación Protegida',
  3: 'Modo 3: Cifrado Avanzado',
};

/**
 * Base64 URL-safe decode helper (RFC 4648)
 */
export function urlSafeBase64Decode(str: string): string {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (err) {
    return str;
  }
}

/**
 * Base64 URL-safe encode helper
 */
export function urlSafeBase64Encode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Safely validates format and extracts public metadata (filename, size, parts count).
 * No passwords, encryption keys, or repository hosts are parsed or exposed on client.
 */
export function parseBitZeroUrl(inputUrl: string): SafeBitZeroInfo {
  const cleanUrl = inputUrl.trim().replace(/^bitzero\s+/i, '').trim();

  // Split by slashes
  const parts = cleanUrl.split('/').filter(p => p.length > 0);

  if (parts.length < 5) {
    throw new Error(
      'Código de descarga BitZero incompleto. Formato esperado: <tamaño-id>/<partes>/<modo>/<cifrado>/<nombre>'
    );
  }

  // Check if last segment is an 8-character hex hash
  const lastSegment = parts[parts.length - 1];
  const isHexHash = /^[0-9a-fA-F]{8}$/.test(lastSegment);

  let filenameB64 = '';
  let keyIdx = -1;

  if (isHexHash) {
    filenameB64 = parts[parts.length - 2];
    keyIdx = parts.length - 3;
  } else {
    filenameB64 = lastSegment;
    keyIdx = parts.length - 2;
  }

  if (keyIdx < 3) {
    throw new Error('Estructura de enlace BitZero incompleta.');
  }

  const modeStr = parts[keyIdx - 1];
  const token = parts[keyIdx - 2];
  const sizeRepo = parts[keyIdx - 3];

  if (!sizeRepo.includes('-')) {
    throw new Error('Formato de identificación del archivo no válido.');
  }

  const [sizeStr] = sizeRepo.split('-', 2);
  const fileSize = parseInt(sizeStr, 10) || 0;
  const bitzeroMode = (parseInt(modeStr, 10) || 0) as BitzeroMode;

  // Safe Filename decode
  let originalName = urlSafeBase64Decode(filenameB64);

  if (originalName.startsWith('__multi__')) {
    originalName = 'paquete_multimedia.tar';
  }

  // File parts count
  const fileIds = token.includes(',') ? token.split(',') : token.split('-');

  return {
    original_name: originalName,
    file_size: fileSize,
    file_ids: fileIds,
    parts_count: fileIds.length,
    bitzero_mode: bitzeroMode,
    bitzero_mode_name: MODE_NAMES[bitzeroMode] || `Modo ${bitzeroMode}`,
    is_valid: true,
  };
}

/**
 * Format bytes nicely into B, KB, MB, GB
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

