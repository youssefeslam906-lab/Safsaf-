import {
  DEFAULT_NOTE,
  DEFAULT_SECURITY_SETTINGS,
  DEFAULT_START_DATE,
} from '../data/defaults';
import type {
  DecryptedVaultContent,
  EncryptedAudioRecord,
  EncryptedPayload,
  ExportedVaultBackup,
  LockoutState,
  PhotoMemory,
  VaultMeta,
  VaultSecuritySettings,
} from '../types';
import {
  computeLockoutCooldownMs,
  createVerifier,
  decryptBytes,
  decryptJson,
  deriveMasterKey,
  encryptBytes,
  encryptJson,
  generateSalt,
  verifyKeyWithVerifier,
} from './crypto';
import { isSafeMediaSrc, sanitizeText } from './validation';

const DB_NAME = 'YSdb_v2';
const DB_VERSION = 1;
const STORE_META = 'meta';
const STORE_PHOTOS = 'photos';
const STORE_AUDIO = 'audio';

const KEY_VAULT_META = 'vault_meta';
const KEY_LOCKOUT = 'lockout_state';
const KEY_NOTE = 'encrypted_note';
const KEY_START_DATE = 'encrypted_start_date';
const KEY_CUSTOM_SONG = 'custom_song';

const LEGACY_DB_NAME = 'YSdb';
const LEGACY_START_KEY = 'ys_start';
const LEGACY_NOTE_KEY = 'ys_note';

function openVaultDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (!globalThis.indexedDB) {
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META);
        }
        if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
          db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_AUDIO)) {
          db.createObjectStore(STORE_AUDIO);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
  const db = await openVaultDB();
  if (!db) return null;
  try {
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    });
  } finally {
    db.close();
  }
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openVaultDB();
  if (!db) return [];
  try {
    return await new Promise<T[]>((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve((req.result as T[]) ?? []);
      req.onerror = () => resolve([]);
    });
  } finally {
    db.close();
  }
}

async function idbPut<T>(
  storeName: string,
  value: T,
  key?: IDBValidKey,
): Promise<boolean> {
  const db = await openVaultDB();
  if (!db) return false;
  try {
    return await new Promise<boolean>((resolve) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = key !== undefined ? store.put(value, key) : store.put(value);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } finally {
    db.close();
  }
}

async function idbDelete(
  storeName: string,
  key: IDBValidKey,
): Promise<boolean> {
  const db = await openVaultDB();
  if (!db) return false;
  try {
    return await new Promise<boolean>((resolve) => {
      const tx = db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } finally {
    db.close();
  }
}

async function idbClearAll(): Promise<void> {
  const db = await openVaultDB();
  if (!db) return;
  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction([STORE_META, STORE_PHOTOS, STORE_AUDIO], 'readwrite');
      tx.objectStore(STORE_META).clear();
      tx.objectStore(STORE_PHOTOS).clear();
      tx.objectStore(STORE_AUDIO).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } finally {
    db.close();
  }
}

interface StoredPhotoRow {
  id: string;
  createdAt: number;
  payload: EncryptedPayload;
}

interface LegacyPhotoRow {
  id?: number;
  image?: string;
  caption?: string;
}

function readLegacyLocalStorage(): {
  startDate: string | null;
  note: string | null;
} {
  try {
    return {
      startDate: localStorage.getItem(LEGACY_START_KEY),
      note: localStorage.getItem(LEGACY_NOTE_KEY),
    };
  } catch {
    return { startDate: null, note: null };
  }
}

function clearLegacyLocalStorage(): void {
  try {
    localStorage.removeItem(LEGACY_START_KEY);
    localStorage.removeItem(LEGACY_NOTE_KEY);
  } catch {
    // ignore storage errors
  }
}

async function readLegacyIndexedDb(): Promise<{
  photos: LegacyPhotoRow[];
  song: Blob | null;
}> {
  return new Promise((resolve) => {
    try {
      if (!globalThis.indexedDB) {
        resolve({ photos: [], song: null });
        return;
      }
      const req = indexedDB.open(LEGACY_DB_NAME, 1);
      let createdFresh = false;
      req.onupgradeneeded = () => {
        createdFresh = true;
      };
      req.onsuccess = async () => {
        const db = req.result;
        if (createdFresh) {
          db.close();
          try {
            indexedDB.deleteDatabase(LEGACY_DB_NAME);
          } catch {
            // ignore
          }
          resolve({ photos: [], song: null });
          return;
        }
        try {
          const photos = db.objectStoreNames.contains('photos')
            ? await new Promise<LegacyPhotoRow[]>((ok) => {
                const r = db
                  .transaction('photos', 'readonly')
                  .objectStore('photos')
                  .getAll();
                r.onsuccess = () => ok((r.result as LegacyPhotoRow[]) || []);
                r.onerror = () => ok([]);
              })
            : [];
          const song = db.objectStoreNames.contains('audio')
            ? await new Promise<Blob | null>((ok) => {
                const r = db
                  .transaction('audio', 'readonly')
                  .objectStore('audio')
                  .get('song');
                r.onsuccess = () =>
                  ok(r.result instanceof Blob ? r.result : null);
                r.onerror = () => ok(null);
              })
            : null;
          db.close();
          resolve({ photos, song });
        } catch {
          db.close();
          resolve({ photos: [], song: null });
        }
      };
      req.onerror = () => resolve({ photos: [], song: null });
    } catch {
      resolve({ photos: [], song: null });
    }
  });
}

export async function getVaultMeta(): Promise<VaultMeta | null> {
  return idbGet<VaultMeta>(STORE_META, KEY_VAULT_META);
}

export async function getLockoutState(): Promise<LockoutState> {
  const stored = await idbGet<LockoutState>(STORE_META, KEY_LOCKOUT);
  return stored ?? { failedAttempts: 0, lockedUntil: 0 };
}

export async function recordFailedUnlockAttempt(): Promise<LockoutState> {
  const current = await getLockoutState();
  const nextCount = current.failedAttempts + 1;
  const cooldownMs = computeLockoutCooldownMs(nextCount);
  const next: LockoutState = {
    failedAttempts: nextCount,
    lockedUntil: cooldownMs > 0 ? Date.now() + cooldownMs : 0,
  };
  await idbPut(STORE_META, next, KEY_LOCKOUT);
  return next;
}

export async function resetLockoutState(): Promise<void> {
  await idbPut<LockoutState>(
    STORE_META,
    { failedAttempts: 0, lockedUntil: 0 },
    KEY_LOCKOUT,
  );
}

/**
 * First-time vault setup: creates PBKDF2 salt & AES-GCM verifier,
 * imports & encrypts any legacy data if present, and clears plaintext legacy stores.
 */
export async function setupVault(passcode: string): Promise<{
  key: CryptoKey;
  meta: VaultMeta;
}> {
  const salt = generateSalt();
  const key = await deriveMasterKey(passcode, salt);
  const verifier = await createVerifier(key);

  const now = Date.now();
  const meta: VaultMeta = {
    version: 2,
    salt,
    verifier,
    settings: DEFAULT_SECURITY_SETTINGS,
    createdAt: now,
    updatedAt: now,
  };

  await idbPut(STORE_META, meta, KEY_VAULT_META);
  await resetLockoutState();

  const legacyLs = readLegacyLocalStorage();
  const startDate = legacyLs.startDate || DEFAULT_START_DATE;
  const note = legacyLs.note
    ? sanitizeText(legacyLs.note, 500, true)
    : DEFAULT_NOTE;

  await saveEncryptedStartDate(key, startDate);
  await saveEncryptedNote(key, note);

  const legacyIdb = await readLegacyIndexedDb();
  for (const item of legacyIdb.photos) {
    if (item.image && isSafeMediaSrc(item.image)) {
      const memory: PhotoMemory = {
        id: `migrated-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        image: item.image,
        caption: sanitizeText(item.caption || '', 120, false),
        createdAt: Date.now(),
      };
      await saveEncryptedPhoto(key, memory);
    }
  }
  if (legacyIdb.song) {
    await saveEncryptedSong(key, legacyIdb.song, 'custom-track');
  }

  clearLegacyLocalStorage();
  try {
    indexedDB.deleteDatabase(LEGACY_DB_NAME);
  } catch {
    // ignore
  }

  return { key, meta };
}

export async function unlockVault(passcode: string): Promise<{
  ok: true;
  key: CryptoKey;
  meta: VaultMeta;
} | {
  ok: false;
  lockout: LockoutState;
}> {
  const meta = await getVaultMeta();
  if (!meta) {
    throw new Error('Vault is not initialized.');
  }

  const key = await deriveMasterKey(passcode, meta.salt);
  const valid = await verifyKeyWithVerifier(key, meta.verifier);

  if (!valid) {
    const lockout = await recordFailedUnlockAttempt();
    return { ok: false, lockout };
  }

  await resetLockoutState();
  return { ok: true, key, meta };
}

export async function updateSecuritySettings(
  settings: VaultSecuritySettings,
): Promise<VaultMeta | null> {
  const meta = await getVaultMeta();
  if (!meta) return null;
  const next: VaultMeta = {
    ...meta,
    settings,
    updatedAt: Date.now(),
  };
  await idbPut(STORE_META, next, KEY_VAULT_META);
  return next;
}

export async function loadDecryptedVaultContent(
  key: CryptoKey,
): Promise<DecryptedVaultContent> {
  const notePayload = await idbGet<EncryptedPayload>(STORE_META, KEY_NOTE);
  const datePayload = await idbGet<EncryptedPayload>(STORE_META, KEY_START_DATE);
  const photoRows = await idbGetAll<StoredPhotoRow>(STORE_PHOTOS);

  let note = DEFAULT_NOTE;
  if (notePayload) {
    try {
      const decoded = await decryptJson<string>(key, notePayload);
      if (typeof decoded === 'string' && decoded.trim()) {
        note = sanitizeText(decoded, 500, true);
      }
    } catch {
      // keep default on corruption
    }
  }

  let startDate = DEFAULT_START_DATE;
  if (datePayload) {
    try {
      const decoded = await decryptJson<string>(key, datePayload);
      if (typeof decoded === 'string' && !Number.isNaN(new Date(decoded).getTime())) {
        startDate = decoded;
      }
    } catch {
      // keep default
    }
  }

  const photos: PhotoMemory[] = [];
  for (const row of photoRows) {
    try {
      const item = await decryptJson<PhotoMemory>(key, row.payload);
      if (item && isSafeMediaSrc(item.image)) {
        photos.push({
          ...item,
          caption: sanitizeText(item.caption || '', 120, false),
        });
      }
    } catch {
      // skip corrupted item
    }
  }

  photos.sort((a, b) => b.createdAt - a.createdAt);

  return { startDate, note, photos };
}

export async function saveEncryptedNote(
  key: CryptoKey,
  note: string,
): Promise<void> {
  const payload = await encryptJson(key, sanitizeText(note, 500, true));
  await idbPut(STORE_META, payload, KEY_NOTE);
}

export async function saveEncryptedStartDate(
  key: CryptoKey,
  startDate: string,
): Promise<void> {
  const payload = await encryptJson(key, startDate);
  await idbPut(STORE_META, payload, KEY_START_DATE);
}

export async function saveEncryptedPhoto(
  key: CryptoKey,
  photo: PhotoMemory,
): Promise<void> {
  const payload = await encryptJson(key, photo);
  const row: StoredPhotoRow = {
    id: photo.id,
    createdAt: photo.createdAt,
    payload,
  };
  await idbPut(STORE_PHOTOS, row);
}

export async function deleteEncryptedPhoto(id: string): Promise<void> {
  await idbDelete(STORE_PHOTOS, id);
}

export async function saveEncryptedSong(
  key: CryptoKey,
  blob: Blob,
  fileName: string,
): Promise<void> {
  const buffer = await blob.arrayBuffer();
  const payload = await encryptBytes(key, new Uint8Array(buffer));
  const record: EncryptedAudioRecord = {
    mimeType: blob.type || 'audio/mpeg',
    fileName: sanitizeText(fileName, 80, false) || 'song',
    payload,
    updatedAt: Date.now(),
  };
  await idbPut(STORE_AUDIO, record, KEY_CUSTOM_SONG);
}

export async function loadEncryptedSong(
  key: CryptoKey,
): Promise<{ blob: Blob; fileName: string } | null> {
  const record = await idbGet<EncryptedAudioRecord>(STORE_AUDIO, KEY_CUSTOM_SONG);
  if (!record) return null;
  try {
    const raw = await decryptBytes(key, record.payload);
    const bytesCopy = new Uint8Array(raw.byteLength);
    bytesCopy.set(raw);
    return {
      blob: new Blob([bytesCopy.buffer], { type: record.mimeType || 'audio/mpeg' }),
      fileName: record.fileName,
    };
  } catch {
    return null;
  }
}

export async function deleteCustomSong(): Promise<void> {
  await idbDelete(STORE_AUDIO, KEY_CUSTOM_SONG);
}

/**
 * Re-encrypts all vault entries under a new passcode after verifying the current one.
 */
export async function changeVaultPasscode(
  currentPasscode: string,
  newPasscode: string,
): Promise<{ key: CryptoKey; meta: VaultMeta } | null> {
  const verified = await unlockVault(currentPasscode);
  if (!verified.ok) {
    return null;
  }

  const oldKey = verified.key;
  const oldMeta = verified.meta;

  const content = await loadDecryptedVaultContent(oldKey);
  const song = await loadEncryptedSong(oldKey);

  const newSalt = generateSalt();
  const newKey = await deriveMasterKey(newPasscode, newSalt);
  const newVerifier = await createVerifier(newKey);

  const newMeta: VaultMeta = {
    ...oldMeta,
    salt: newSalt,
    verifier: newVerifier,
    updatedAt: Date.now(),
  };

  await idbPut(STORE_META, newMeta, KEY_VAULT_META);
  await saveEncryptedStartDate(newKey, content.startDate);
  await saveEncryptedNote(newKey, content.note);

  for (const photo of content.photos) {
    await saveEncryptedPhoto(newKey, photo);
  }

  if (song) {
    await saveEncryptedSong(newKey, song.blob, song.fileName);
  }

  return { key: newKey, meta: newMeta };
}

export async function exportEncryptedBackup(): Promise<ExportedVaultBackup | null> {
  const meta = await getVaultMeta();
  if (!meta) return null;
  const note = await idbGet<EncryptedPayload>(STORE_META, KEY_NOTE);
  const startDate = await idbGet<EncryptedPayload>(STORE_META, KEY_START_DATE);
  const photos = await idbGetAll<StoredPhotoRow>(STORE_PHOTOS);

  return {
    format: 'ys-encrypted-vault',
    version: 2,
    exportedAt: Date.now(),
    meta,
    note,
    startDate,
    photos,
  };
}

export async function resetEntireVault(): Promise<void> {
  await idbClearAll();
  clearLegacyLocalStorage();
}
