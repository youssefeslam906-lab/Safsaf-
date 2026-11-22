export interface PhotoMemory {
  id: string;
  image: string;
  caption: string;
  createdAt: number;
  isSeed?: boolean;
}

export interface VaultSecuritySettings {
  idleTimeoutMinutes: 0 | 2 | 5 | 15;
  blurOnHide: boolean;
}

export interface EncryptedPayload {
  iv: string; // base64
  data: string; // base64
}

export interface VaultMeta {
  version: 2;
  salt: string; // base64
  verifier: EncryptedPayload;
  settings: VaultSecuritySettings;
  createdAt: number;
  updatedAt: number;
}

export interface LockoutState {
  failedAttempts: number;
  lockedUntil: number;
}

export interface DecryptedVaultContent {
  startDate: string;
  note: string;
  photos: PhotoMemory[];
}

export interface EncryptedAudioRecord {
  mimeType: string;
  fileName: string;
  payload: EncryptedPayload;
  updatedAt: number;
}

export interface ExportedVaultBackup {
  format: 'ys-encrypted-vault';
  version: 2;
  exportedAt: number;
  meta: VaultMeta;
  note: EncryptedPayload | null;
  startDate: EncryptedPayload | null;
  photos: Array<{
    id: string;
    createdAt: number;
    payload: EncryptedPayload;
  }>;
}
