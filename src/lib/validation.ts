const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const ALLOWED_AUDIO_MIME = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/webm',
]);

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB

async function readMagicBytes(file: File, count = 16): Promise<Uint8Array> {
  const slice = file.slice(0, count);
  const buf = await slice.arrayBuffer();
  return new Uint8Array(buf);
}

function hasPrefix(bytes: Uint8Array, prefix: number[]): boolean {
  if (bytes.length < prefix.length) return false;
  return prefix.every((val, idx) => bytes[idx] === val);
}

function hasAsciiAt(bytes: Uint8Array, offset: number, text: string): boolean {
  if (bytes.length < offset + text.length) return false;
  for (let i = 0; i < text.length; i++) {
    if (bytes[offset + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

export async function validateImageFile(
  file: File,
): Promise<{ valid: true } | { valid: false; reason: string }> {
  if (!file || file.size === 0) {
    return { valid: false, reason: 'الملف فارغ أو غير صالح.' };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      valid: false,
      reason: 'حجم الصورة كبير جداً (الحد الأقصى 15 ميجابايت).',
    };
  }

  const mime = file.type.toLowerCase();
  if (mime === 'image/svg+xml' || mime === 'text/html') {
    return {
      valid: false,
      reason: 'نوع الملف غير مدعوم لأسباب أمنية. يرجى اختيار JPEG أو PNG أو WebP.',
    };
  }

  if (mime && !ALLOWED_IMAGE_MIME.has(mime)) {
    return {
      valid: false,
      reason: 'يرجى اختيار صورة بصيغة JPEG أو PNG أو WebP فقط.',
    };
  }

  const head = await readMagicBytes(file, 16);
  const isJpeg = hasPrefix(head, [0xff, 0xd8, 0xff]);
  const isPng = hasPrefix(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const isWebp =
    hasAsciiAt(head, 0, 'RIFF') && hasAsciiAt(head, 8, 'WEBP');

  if (!isJpeg && !isPng && !isWebp) {
    return {
      valid: false,
      reason: 'محتوى الملف لا يطابق صورة حقيقية (JPEG / PNG / WebP).',
    };
  }

  return { valid: true };
}

export async function validateAudioFile(
  file: File,
): Promise<{ valid: true; mimeType: string } | { valid: false; reason: string }> {
  if (!file || file.size === 0) {
    return { valid: false, reason: 'ملف الصوت فارغ أو غير صالح.' };
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return {
      valid: false,
      reason: 'حجم الملف الصوتي كبير جداً (الحد الأقصى 25 ميجابايت).',
    };
  }

  const mime = file.type.toLowerCase();
  if (mime && !ALLOWED_AUDIO_MIME.has(mime)) {
    return {
      valid: false,
      reason: 'صيغة الصوت غير مدعومة. يرجى اختيار MP3 أو M4A أو WAV أو OGG.',
    };
  }

  const head = await readMagicBytes(file, 16);
  const isId3 = hasAsciiAt(head, 0, 'ID3');
  const isMpegFrame =
    head.length >= 2 && head[0] === 0xff && (head[1] & 0xe0) === 0xe0;
  const isWav = hasAsciiAt(head, 0, 'RIFF') && hasAsciiAt(head, 8, 'WAVE');
  const isOgg = hasAsciiAt(head, 0, 'OggS');
  const isMp4 = hasAsciiAt(head, 4, 'ftyp');
  const isAdtsAac =
    head.length >= 2 && head[0] === 0xff && (head[1] & 0xf6) === 0xf0;
  const isWebm = hasPrefix(head, [0x1a, 0x45, 0xdf, 0xa3]);

  if (
    !isId3 &&
    !isMpegFrame &&
    !isWav &&
    !isOgg &&
    !isMp4 &&
    !isAdtsAac &&
    !isWebm
  ) {
    return {
      valid: false,
      reason: 'تعذر التحقق من صيغة الملف الصوتي. يرجى اختيار ملف MP3 أو M4A أو WAV سليم.',
    };
  }

  return {
    valid: true,
    mimeType: mime || (isWav ? 'audio/wav' : isOgg ? 'audio/ogg' : 'audio/mpeg'),
  };
}

/**
 * Decodes, resizes, and re-encodes an image via Canvas to strip EXIF/GPS metadata
 * and cap storage footprint.
 */
export async function resizeAndStripImage(
  file: File,
  maxDimension = 1200,
): Promise<string> {
  const validation = await validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('تعذر فك تشفير الصورة.'));
      el.src = objectUrl;
    });

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    if (!width || !height || width < 2 || height < 2) {
      throw new Error('أبعاد الصورة غير صالحة.');
    }

    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('تعذر معالجة الصورة في المتصفح.');
    }

    ctx.drawImage(img, 0, 0, targetW, targetH);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.84);

    if (!dataUrl.startsWith('data:image/jpeg;base64,')) {
      throw new Error('فشل حفظ الصورة المعالجة.');
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function sanitizeText(
  value: string,
  maxLength: number,
  allowNewlines = false,
): string {
  const withoutUnsafeControl = allowNewlines
    ? value.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    : value.replace(/[\u0000-\u001F\u007F]/g, ' ');

  return withoutUnsafeControl.trim().slice(0, maxLength);
}

export function isSafeMediaSrc(src: string): boolean {
  if (!src) return false;
  if (src.startsWith('/media/')) return true;
  if (src.startsWith('blob:')) return true;
  if (/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src)) {
    return true;
  }
  if (
    /^data:audio\/(mpeg|mp3|wav|ogg|mp4|aac|webm);base64,[A-Za-z0-9+/=]+$/.test(
      src,
    )
  ) {
    return true;
  }
  return false;
}

export function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  const [y, m, d] = value.split('-').map(Number);
  return (
    parsed.getFullYear() === y &&
    parsed.getMonth() + 1 === m &&
    parsed.getDate() === d
  );
}
