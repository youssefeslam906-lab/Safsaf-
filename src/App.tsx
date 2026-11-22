import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FloatingHearts } from './components/FloatingHearts';
import { HeaderBar } from './components/HeaderBar';
import { LoveCounter } from './components/LoveCounter';
import { LoveLetter } from './components/LoveLetter';
import { MemoryGallery } from './components/MemoryGallery';
import { PrivacyCurtain } from './components/PrivacyCurtain';
import { SecurityGate } from './components/SecurityGate';
import { SecurityModal } from './components/SecurityModal';
import { Toast } from './components/Toast';
import {
  DEFAULT_NOTE,
  DEFAULT_SECURITY_SETTINGS,
  DEFAULT_SONG_URL,
  DEFAULT_START_DATE,
  SEED_MEMORIES,
} from './data/defaults';
import {
  changeVaultPasscode,
  deleteCustomSong,
  deleteEncryptedPhoto,
  exportEncryptedBackup,
  getLockoutState,
  getVaultMeta,
  loadDecryptedVaultContent,
  loadEncryptedSong,
  resetEntireVault,
  saveEncryptedNote,
  saveEncryptedPhoto,
  saveEncryptedSong,
  saveEncryptedStartDate,
  setupVault,
  unlockVault,
  updateSecuritySettings,
} from './lib/storage';
import { isSafeMediaSrc, validateAudioFile } from './lib/validation';
import type {
  LockoutState,
  PhotoMemory,
  VaultSecuritySettings,
} from './types';

type AppBootPhase = 'loading' | 'setup' | 'locked' | 'unlocked';

export default function App() {
  const [phase, setPhase] = useState<AppBootPhase>('loading');
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [settings, setSettings] = useState<VaultSecuritySettings>(
    DEFAULT_SECURITY_SETTINGS,
  );
  const [lockout, setLockout] = useState<LockoutState>({
    failedAttempts: 0,
    lockedUntil: 0,
  });
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(DEFAULT_START_DATE);
  const [note, setNote] = useState(DEFAULT_NOTE);
  const [userPhotos, setUserPhotos] = useState<PhotoMemory[]>([]);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [curtainVisible, setCurtainVisible] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasCustomSong, setHasCustomSong] = useState(false);
  const [customSongName, setCustomSongName] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const shouldSeekOnLoadRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  const revokeActiveSongUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const setAudioSource = useCallback(
    (src: string, isObjectUrl: boolean, seekFromMiddle: boolean) => {
      const audio = audioRef.current;
      if (!audio || !isSafeMediaSrc(src)) return;

      revokeActiveSongUrl();
      if (isObjectUrl) {
        objectUrlRef.current = src;
      }

      shouldSeekOnLoadRef.current = seekFromMiddle;
      audio.src = src;
      audio.load();
    },
    [revokeActiveSongUrl],
  );

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (!shouldSeekOnLoadRef.current) return;
      const duration = audio.duration;
      if (duration && Number.isFinite(duration)) {
        shouldSeekOnLoadRef.current = false;
        audio.currentTime = duration > 90 ? 90 : duration / 2;
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = () => {
      setIsPlaying(false);
      showToast('تعذر تشغيل الملف الصوتي، تأكدي من سلامته.');
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      revokeActiveSongUrl();
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [revokeActiveSongUrl, showToast]);

  // Check vault initialization state on boot
  useEffect(() => {
    let active = true;
    (async () => {
      const [meta, lock] = await Promise.all([
        getVaultMeta(),
        getLockoutState(),
      ]);
      if (!active) return;
      setLockout(lock);
      if (meta) {
        setSettings(meta.settings ?? DEFAULT_SECURITY_SETTINGS);
        setPhase('locked');
      } else {
        setPhase('setup');
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const hydrateUnlockedSession = useCallback(
    async (key: CryptoKey, autoPlay: boolean) => {
      const content = await loadDecryptedVaultContent(key);
      setStartDate(content.startDate);
      setNote(content.note);
      setUserPhotos(content.photos);

      const customSong = await loadEncryptedSong(key);
      if (customSong) {
        const blobUrl = URL.createObjectURL(customSong.blob);
        setAudioSource(blobUrl, true, true);
        setHasCustomSong(true);
        setCustomSongName(customSong.fileName);
      } else {
        setAudioSource(DEFAULT_SONG_URL, false, false);
        setHasCustomSong(false);
        setCustomSongName(null);
      }

      setPhase('unlocked');

      if (autoPlay && audioRef.current) {
        try {
          await audioRef.current.play();
        } catch {
          // Browser autoplay may still require explicit click on Play button
        }
      }
    },
    [setAudioSource],
  );

  const lockNow = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    revokeActiveSongUrl();
    setIsPlaying(false);
    setVaultKey(null);
    setUserPhotos([]);
    setNote(DEFAULT_NOTE);
    setStartDate(DEFAULT_START_DATE);
    setUploadModalOpen(false);
    setSecurityModalOpen(false);
    setCurtainVisible(false);
    setAuthError(null);
    setPhase('locked');
  }, [revokeActiveSongUrl]);

  // Tab visibility privacy curtain
  useEffect(() => {
    if (phase !== 'unlocked' || !settings.blurOnHide) {
      setCurtainVisible(false);
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setCurtainVisible(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [phase, settings.blurOnHide]);

  // Idle auto-lock timer
  useEffect(() => {
    if (phase !== 'unlocked' || settings.idleTimeoutMinutes <= 0) return;

    const timeoutMs = settings.idleTimeoutMinutes * 60_000;
    let timerId = window.setTimeout(() => {
      lockNow();
      showToast('تم قفل الخزنة تلقائياً لعدم النشاط 🔒');
    }, timeoutMs);

    const resetTimer = () => {
      window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        lockNow();
        showToast('تم قفل الخزنة تلقائياً لعدم النشاط 🔒');
      }, timeoutMs);
    };

    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((evt) =>
      window.addEventListener(evt, resetTimer, { passive: true }),
    );

    return () => {
      window.clearTimeout(timerId);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [lockNow, phase, settings.idleTimeoutMinutes, showToast]);

  const handleSetupVault = async (passcode: string) => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const { key, meta } = await setupVault(passcode);
      setVaultKey(key);
      setSettings(meta.settings);
      await hydrateUnlockedSession(key, true);
      showToast('تم تأمين وتشفير خزنتك بنجاح 🔐');
    } catch {
      setAuthError('حدث خطأ أثناء إعداد التشفير. تأكدي من استخدام متصفح حديث.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleUnlockVault = async (passcode: string) => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const result = await unlockVault(passcode);
      if (!result.ok) {
        setLockout(result.lockout);
        setAuthError('رمز المرور غير صحيح، يرجى المحاولة مرة أخرى.');
        return;
      }
      setLockout({ failedAttempts: 0, lockedUntil: 0 });
      setVaultKey(result.key);
      setSettings(result.meta.settings ?? DEFAULT_SECURITY_SETTINGS);
      await hydrateUnlockedSession(result.key, true);
    } catch {
      setAuthError('تعذر فتح الخزنة. يرجى المحاولة مرة أخرى.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleResetVault = async () => {
    setAuthBusy(true);
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
      }
      revokeActiveSongUrl();
      await resetEntireVault();
      setVaultKey(null);
      setUserPhotos([]);
      setNote(DEFAULT_NOTE);
      setStartDate(DEFAULT_START_DATE);
      setSettings(DEFAULT_SECURITY_SETTINGS);
      setLockout({ failedAttempts: 0, lockedUntil: 0 });
      setSecurityModalOpen(false);
      setAuthError(null);
      setPhase('setup');
      showToast('تمت إعادة تهيئة الخزنة المحلية.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleTogglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !audio.src) {
      showToast('ارفعي أغنية الأول 🎵');
      return;
    }
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        showToast('تعذر بدء التشغيل، اضغطي مرة أخرى.');
      }
    } else {
      audio.pause();
    }
  };

  const handleSelectSong = async (file: File) => {
    if (!vaultKey) return;
    const validation = await validateAudioFile(file);
    if (!validation.valid) {
      showToast(validation.reason);
      return;
    }

    const normalizedBlob = new Blob([file], { type: validation.mimeType });
    const blobUrl = URL.createObjectURL(normalizedBlob);
    setAudioSource(blobUrl, true, true);
    setHasCustomSong(true);
    setCustomSongName(file.name);

    await saveEncryptedSong(vaultKey, normalizedBlob, file.name);
    showToast('تم تشفير وتغيير الأغنية 🎵');

    try {
      await audioRef.current?.play();
    } catch {
      // ignore autoplay blocks
    }
  };

  const handleResetSong = async () => {
    await deleteCustomSong();
    setAudioSource(DEFAULT_SONG_URL, false, false);
    setHasCustomSong(false);
    setCustomSongName(null);
    showToast('تمت استعادة الأغنية الافتراضية 🎵');
  };

  const handleSaveStartDate = async (nextDate: string) => {
    if (!vaultKey) return;
    setStartDate(nextDate);
    await saveEncryptedStartDate(vaultKey, nextDate);
  };

  const handleSaveNote = async (nextNote: string) => {
    if (!vaultKey) return;
    setNote(nextNote);
    await saveEncryptedNote(vaultKey, nextNote);
  };

  const handleAddPhoto = async (input: { image: string; caption: string }) => {
    if (!vaultKey) return;
    const newPhoto: PhotoMemory = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      image: input.image,
      caption: input.caption,
      createdAt: Date.now(),
    };
    await saveEncryptedPhoto(vaultKey, newPhoto);
    setUserPhotos((prev) => [newPhoto, ...prev]);
  };

  const handleDeletePhoto = async (id: string) => {
    await deleteEncryptedPhoto(id);
    setUserPhotos((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateSettings = async (next: VaultSecuritySettings) => {
    setSettings(next);
    await updateSecuritySettings(next);
    showToast('تم حفظ إعدادات الحماية');
  };

  const handleChangePasscode = async (
    currentPasscode: string,
    newPasscode: string,
  ): Promise<boolean> => {
    const res = await changeVaultPasscode(currentPasscode, newPasscode);
    if (!res) return false;
    setVaultKey(res.key);
    return true;
  };

  const handleExportBackup = async () => {
    const backup = await exportEncryptedBackup();
    if (!backup) {
      showToast('لا توجد بيانات لتصديرها.');
      return;
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `yousef-safsofa-backup-${new Date().toISOString().slice(0, 10)}.ysvault`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('تم تحميل النسخة الاحتياطية المشفرة 💾');
  };

  const allPhotos = useMemo(
    () => [...SEED_MEMORIES, ...userPhotos],
    [userPhotos],
  );

  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#120408] text-[#e8b4b8]">
        <p className="font-serif text-xl">جاري تجهيز المساحة الآمنة...</p>
      </div>
    );
  }

  if (phase === 'setup' || phase === 'locked') {
    return (
      <>
        <FloatingHearts />
        <SecurityGate
          mode={phase === 'setup' ? 'setup' : 'unlock'}
          lockout={lockout}
          busy={authBusy}
          errorMessage={authError}
          onSetup={handleSetupVault}
          onUnlock={handleUnlockVault}
          onResetVault={handleResetVault}
        />
        <Toast message={toastMessage} />
      </>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#120408] text-[#f3d5d8]">
      <FloatingHearts />

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col gap-9 px-4 py-6 pb-20 sm:px-6 sm:py-10">
        <HeaderBar
          isPlaying={isPlaying}
          hasCustomSong={hasCustomSong}
          customSongName={customSongName}
          onTogglePlay={() => void handleTogglePlay()}
          onSelectSong={handleSelectSong}
          onResetSong={handleResetSong}
          onOpenAddPhoto={() => setUploadModalOpen(true)}
          onOpenSecurity={() => setSecurityModalOpen(true)}
          onLockNow={lockNow}
        />

        <LoveCounter
          startDate={startDate}
          onSaveStartDate={handleSaveStartDate}
          onToast={showToast}
        />

        <MemoryGallery
          photos={allPhotos}
          uploadOpen={uploadModalOpen}
          onCloseUpload={() => setUploadModalOpen(false)}
          onOpenUpload={() => setUploadModalOpen(true)}
          onAddPhoto={handleAddPhoto}
          onDeletePhoto={handleDeletePhoto}
          onToast={showToast}
        />

        <LoveLetter
          note={note}
          onSaveNote={handleSaveNote}
          onToast={showToast}
        />
      </main>

      <SecurityModal
        open={securityModalOpen}
        settings={settings}
        onClose={() => setSecurityModalOpen(false)}
        onUpdateSettings={handleUpdateSettings}
        onChangePasscode={handleChangePasscode}
        onExportBackup={handleExportBackup}
        onResetVault={handleResetVault}
        onToast={showToast}
      />

      <PrivacyCurtain
        visible={curtainVisible}
        onDismiss={() => setCurtainVisible(false)}
        onLockNow={lockNow}
      />

      <Toast message={toastMessage} />
    </div>
  );
}
