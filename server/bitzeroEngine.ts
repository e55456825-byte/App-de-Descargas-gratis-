import https from 'https';
import http from 'http';
import { URL } from 'url';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export const DEFAULT_BITZERO_PASSWORD = '@bitzero#2024';

export const PNG_HEADER = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c49444154789c63606060000000040001f61738550000000049454e44ae426082',
  'hex'
);

export interface BitZeroInfo {
  original_name: string;
  file_size: number;
  submission_id: string;
  file_ids: string[];
  bitzero_mode: number;
  host: string;
  username: string;
  password: string;
  contexto: string;
  encryption_key: string;
  verification_hash?: string | null;
  raw_url: string;
}

export function urlSafeBase64Decode(str: string): string {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch {
    return str;
  }
}

export function urlSafeBase64Encode(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64url');
}

export function parseBitZeroUrl(inputUrl: string): BitZeroInfo {
  const cleanUrl = inputUrl.trim().replace(/^bitzero\s+/i, '').trim();
  const parts = cleanUrl.split('/').filter(p => p.length > 0);

  if (parts.length < 5) {
    throw new Error('Código BitZero inválido: contiene menos de 5 segmentos.');
  }

  const last = parts[parts.length - 1];
  const isHexHash = /^[0-9a-fA-F]{8}$/.test(last);

  let verificationHash: string | null = null;
  let filenameB64 = '';
  let keyIdx = -1;

  if (isHexHash) {
    verificationHash = last;
    filenameB64 = parts[parts.length - 2];
    keyIdx = parts.length - 3;
  } else {
    filenameB64 = last;
    keyIdx = parts.length - 2;
  }

  if (keyIdx < 3) {
    throw new Error('Estructura de enlace BitZero incompleta.');
  }

  const keyEncoded = parts[keyIdx];
  const modeStr = parts[keyIdx - 1];
  const token = parts[keyIdx - 2];
  const sizeRepo = parts[keyIdx - 3];

  if (!sizeRepo.includes('-')) {
    throw new Error(`Segmento tamaño-repo inválido: ${sizeRepo}`);
  }

  const [sizeStr, repo] = sizeRepo.split('-', 2);
  const fileSize = parseInt(sizeStr, 10) || 0;
  const bitzeroMode = parseInt(modeStr, 10) || 0;

  const keyParts = keyEncoded.split('-');
  if (keyParts.length < 5) {
    throw new Error('Clave interna BitZero incompleta (menos de 5 partes).');
  }

  const host = urlSafeBase64Decode(keyParts[0]);
  const username = urlSafeBase64Decode(keyParts[1]);
  const password = urlSafeBase64Decode(keyParts[2]);
  const submissionId = urlSafeBase64Decode(keyParts[3]) || repo;
  const contexto = urlSafeBase64Decode(keyParts[4]);

  let encryptionKey = '';
  if (keyParts.length >= 8) {
    encryptionKey = urlSafeBase64Decode(keyParts[7]);
  }
  if (!encryptionKey) {
    encryptionKey = DEFAULT_BITZERO_PASSWORD;
  }

  let originalName = urlSafeBase64Decode(filenameB64);
  if (originalName.startsWith('__multi__')) {
    try {
      const manifestB64 = originalName.slice('__multi__'.length);
      const manifest = JSON.parse(urlSafeBase64Decode(manifestB64));
      originalName = `multi_${manifest.count || 'files'}.tar`;
    } catch {
      originalName = 'archivos_multiples.tar';
    }
  }

  const fileIds = token.includes(',') ? token.split(',') : token.split('-');

  return {
    original_name: originalName,
    file_size: fileSize,
    submission_id: submissionId,
    file_ids: fileIds,
    bitzero_mode: bitzeroMode,
    host,
    username,
    password,
    contexto,
    encryption_key: encryptionKey,
    verification_hash: verificationHash,
    raw_url: inputUrl,
  };
}

/**
 * Perform HTTPS/HTTP requests with SSL verification bypass and cookie tracking
 */
export async function makeRequest(
  targetUrl: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string | Buffer;
    cookieJar?: Record<string, string>;
    timeoutMs?: number;
  } = {}
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: Buffer; text: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    // Build Cookie header
    const headers = { ...(options.headers || {}) };
    if (options.cookieJar && Object.keys(options.cookieJar).length > 0) {
      const cookieStr = Object.entries(options.cookieJar)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
      headers['Cookie'] = cookieStr;
    }

    if (!headers['User-Agent']) {
      headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    }

    const reqOptions: https.RequestOptions = {
      method: options.method || 'GET',
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      headers,
      rejectUnauthorized: false, // Critical for Cuban university OJS SSL certificates
      timeout: options.timeoutMs || 45000,
    };

    const req = lib.request(reqOptions, res => {
      // Collect set-cookie headers
      if (res.headers['set-cookie'] && options.cookieJar) {
        for (const cookieItem of res.headers['set-cookie']) {
          const parts = cookieItem.split(';')[0].split('=');
          if (parts.length >= 2) {
            const name = parts[0].trim();
            const val = parts.slice(1).join('=').trim();
            options.cookieJar[name] = val;
          }
        }
      }

      const chunks: Buffer[] = [];
      res.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode || 200,
          headers: res.headers,
          body,
          text: body.toString('utf-8'),
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Tiempo de espera agotado al contactar con el almacenamiento de archivos'));
    });

    req.on('error', err => reject(err));

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * Log into OJS server using the decrypted credentials
 */
export async function loginOJS(
  baseUrl: string,
  contexto: string,
  username: string,
  password: string
): Promise<{ ok: boolean; cookieJar: Record<string, string>; error?: string }> {
  const cookieJar: Record<string, string> = {};
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const loginUrl = `${normalizedBase}/index.php/${contexto}/login`;

  try {
    const getRes = await makeRequest(loginUrl, { cookieJar, timeoutMs: 30000 });
    const csrfMatch = getRes.text.match(/name="csrfToken"[^>]*value="([^"]+)"/i);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';

    const postData = new URLSearchParams({
      csrfToken,
      username,
      password,
      remember: '1',
      source: '',
    }).toString();

    const postUrl = `${normalizedBase}/index.php/${contexto}/login/signIn`;
    await makeRequest(postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData).toString(),
      },
      body: postData,
      cookieJar,
      timeoutMs: 30000,
    });

    // Check if session cookie or dashboard works
    const checkUrl = `${normalizedBase}/index.php/${contexto}/user`;
    const checkRes = await makeRequest(checkUrl, { cookieJar, timeoutMs: 30000 });
    const ok = checkRes.text.toLowerCase().includes(username.toLowerCase()) || Object.keys(cookieJar).length > 0;

    return { ok, cookieJar };
  } catch (err: any) {
    return { ok: false, cookieJar, error: err.message };
  }
}

/**
 * De-camouflage chunk data according to bitzero_mode
 */
export async function deCamouflage(
  data: Buffer,
  mode: number,
  encryptionKey?: string
): Promise<Buffer> {
  // Mode 0: Sin ofuscación
  if (mode === 0) {
    return data;
  }

  // Mode 1: Falsa cabecera PNG
  if (mode === 1) {
    if (data.subarray(0, PNG_HEADER.length).equals(PNG_HEADER)) {
      return data.subarray(PNG_HEADER.length);
    }
    // Fallback: check standard 8-byte PNG signature
    if (
      data.length > 8 &&
      data[0] === 0x89 &&
      data[1] === 0x50 &&
      data[2] === 0x4e &&
      data[3] === 0x47
    ) {
      // Find IEND chunk end
      const iendIdx = data.indexOf(Buffer.from('IEND\xaeB`\x82'));
      if (iendIdx !== -1) {
        return data.subarray(iendIdx + 8);
      }
    }
    return data;
  }

  // Mode 2: HTML con Base64 (+ XOR opcional)
  if (mode === 2) {
    const content = data.toString('utf-8');
    let encoded: string | null = null;

    if (content.includes('<!-- encoded:')) {
      const parts = content.split('<!-- encoded:')[1].split('-->');
      if (parts.length > 0) encoded = parts[0].trim();
    }

    if (!encoded && content.includes('id="encoded-data"')) {
      const match = content.match(/id="encoded-data">([^<]+)<\/div>/i);
      if (match) encoded = match[1].trim();
    }

    if (!encoded) {
      const matches = content.match(/[A-Za-z0-9+/=_-]{100,}/g);
      if (matches && matches.length > 0) {
        encoded = matches.reduce((a, b) => (a.length > b.length ? a : b));
      }
    }

    if (!encoded) {
      throw new Error('No se encontraron datos codificados en el contenido HTML descargado');
    }

    const key = encryptionKey || DEFAULT_BITZERO_PASSWORD;

    try {
      // Try decrypting with key (layer 2: url-safe base64 + XOR)
      const xorBuffer = Buffer.from(encoded, 'base64url');
      const keyBytes = Buffer.from(key, 'utf-8');
      const unXored = Buffer.alloc(xorBuffer.length);
      for (let i = 0; i < xorBuffer.length; i++) {
        unXored[i] = xorBuffer[i] ^ keyBytes[i % keyBytes.length];
      }
      const innerB64 = unXored.toString('utf-8');
      const decodedOriginal = Buffer.from(innerB64, 'base64');
      if (decodedOriginal.length > 0) {
        return decodedOriginal;
      }
    } catch {
      // Fallback: direct base64 decode without XOR
      return Buffer.from(encoded, 'base64');
    }

    return Buffer.from(encoded, 'base64');
  }

  // Mode 3: ZIP AES-256 / Estándar
  if (mode === 3) {
    const key = encryptionKey || DEFAULT_BITZERO_PASSWORD;
    try {
      // Write temporary zip file to disk and use unzip -P
      const tmpDir = path.join(process.cwd(), '.tmp_bitzero');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      const tmpZip = path.join(tmpDir, `part_${Date.now()}_${Math.random().toString(36).slice(2)}.zip`);
      const extractDir = path.join(tmpDir, `ext_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      fs.mkdirSync(extractDir, { recursive: true });
      fs.writeFileSync(tmpZip, data);

      try {
        await execPromise(`unzip -q -P "${key}" "${tmpZip}" -d "${extractDir}"`);
        const files = fs.readdirSync(extractDir);
        if (files.length > 0) {
          const extractedPath = path.join(extractDir, files[0]);
          const extractedBytes = fs.readFileSync(extractedPath);
          fs.rmSync(extractDir, { recursive: true, force: true });
          fs.unlinkSync(tmpZip);
          return extractedBytes;
        }
      } catch (unzipErr) {
        // Try unzip without password
        try {
          await execPromise(`unzip -q -o "${tmpZip}" -d "${extractDir}"`);
          const files = fs.readdirSync(extractDir);
          if (files.length > 0) {
            const extractedBytes = fs.readFileSync(path.join(extractDir, files[0]));
            fs.rmSync(extractDir, { recursive: true, force: true });
            fs.unlinkSync(tmpZip);
            return extractedBytes;
          }
        } catch {
          // fallback to adm-zip
        }
      } finally {
        if (fs.existsSync(tmpZip)) fs.unlinkSync(tmpZip);
        if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
      }

      // AdmZip in-memory fallback
      const zip = new AdmZip(data);
      const zipEntries = zip.getEntries();
      if (zipEntries.length > 0) {
        return zipEntries[0].getData();
      }
    } catch (err: any) {
      throw new Error(`Falló la extracción del archivo ZIP camuflado: ${err.message}`);
    }
  }

  return data;
}

/**
 * In-memory Mock store for demonstration & testing
 */
export const testMocksStore: Map<string, { filename: string; mime: string; chunks: Buffer[] }> = new Map();

/**
 * Helper to generate a test BitZero URL with simulated camouflaged chunks
 * so the user can test the entire pipeline locally immediately!
 */
export function generateTestBitZeroUrl(
  filename: string,
  contentStr: string,
  mode: number = 2,
  customKey: string = DEFAULT_BITZERO_PASSWORD
): string {
  const contentBuf = Buffer.from(contentStr, 'utf-8');
  const partCount = 3;
  const chunkSize = Math.ceil(contentBuf.length / partCount);
  const rawChunks: Buffer[] = [];

  for (let i = 0; i < contentBuf.length; i += chunkSize) {
    rawChunks.push(contentBuf.subarray(i, Math.min(i + chunkSize, contentBuf.length)));
  }

  const camouflagedChunks: Buffer[] = rawChunks.map(chunk => {
    if (mode === 0) return chunk;
    if (mode === 1) {
      return Buffer.concat([PNG_HEADER, chunk]);
    }
    if (mode === 2) {
      const b64 = chunk.toString('base64');
      const keyBytes = Buffer.from(customKey, 'utf-8');
      const xorBuf = Buffer.alloc(b64.length);
      for (let i = 0; i < b64.length; i++) {
        xorBuf[i] = b64.charCodeAt(i) ^ keyBytes[i % keyBytes.length];
      }
      const encoded = xorBuf.toString('base64url');
      const html = `<!-- encoded:${encoded} --><html><body><div id="encoded-data">${encoded}</div></body></html>`;
      return Buffer.from(html, 'utf-8');
    }
    if (mode === 3) {
      const zip = new AdmZip();
      zip.addFile('data.bin', chunk);
      return zip.toBuffer();
    }
    return chunk;
  });

  const submissionId = `mock_${Math.floor(1000 + Math.random() * 9000)}`;
  const fileIds = camouflagedChunks.map((_, idx) => `part_${idx + 1}`);

  testMocksStore.set(submissionId, {
    filename,
    mime: 'text/plain',
    chunks: camouflagedChunks,
  });

  const host = 'http://localhost:3000/api/bitzero/mock-ojs';
  const username = 'emanuel_bot';
  const password = 'PasswordRepo#2024';
  const contexto = 'descargas_gratis';
  const timestamp = Math.floor(Date.now() / 1000);

  const keyParts = [
    urlSafeBase64Encode(host),
    urlSafeBase64Encode(username),
    urlSafeBase64Encode(password),
    urlSafeBase64Encode(submissionId),
    urlSafeBase64Encode(contexto),
    urlSafeBase64Encode(mode.toString()),
    urlSafeBase64Encode(timestamp.toString()),
    urlSafeBase64Encode(customKey),
  ];
  const keyEncoded = keyParts.join('-');
  const filenameB64 = urlSafeBase64Encode(filename);
  const token = fileIds.join('-');

  const dataToHash = `${filename}${contentBuf.length}${timestamp}${customKey}`;
  const verificationHash = crypto.createHash('md5').update(dataToHash).digest('hex').substring(0, 8);

  return `${contentBuf.length}-${submissionId}/${token}/${mode}/${keyEncoded}/${filenameB64}/${verificationHash}`;
}
