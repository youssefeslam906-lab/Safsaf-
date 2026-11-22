import {
  Camera,
  Lock,
  Music,
  Pause,
  Play,
  RotateCcw,
  Shield,
} from 'lucide-react';
import { type ChangeEvent, useRef } from 'react';

interface HeaderBarProps {
  isPlaying: boolean;
  hasCustomSong: boolean;
  customSongName: string | null;
  onTogglePlay: () => void;
  onSelectSong: (file: File) => Promise<void>;
  onResetSong: () => Promise<void>;
  onOpenAddPhoto: () => void;
  onOpenSecurity: () => void;
  onLockNow: () => void;
}

export function HeaderBar({
  isPlaying,
  hasCustomSong,
  customSongName,
  onTogglePlay,
  onSelectSong,
  onResetSong,
  onOpenAddPhoto,
  onOpenSecurity,
  onLockNow,
}: HeaderBarProps) {
  const songInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await onSelectSong(file);
  };

  return (
    <header className="space-y-6">
      <div className="border-b border-[#e8b4b8]/20 pb-6 text-center">
        <div className="mb-2 flex items-center justify-center gap-2 text-xs font-medium text-[#c7999d]">
          <span>مساحة خاصة ومشفرة</span>
          <span aria-hidden="true">·</span>
          <span>Yousef &amp; Safsofa</span>
        </div>

        <h1
          dir="ltr"
          className="font-serif text-4xl font-bold tracking-tight text-[#e8b4b8] drop-shadow-[0_0_24px_rgba(214,69,96,0.3)] sm:text-5xl"
        >
          Yousef&amp;Safsofa ❤
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-sm text-[#c7999d] sm:text-base">
          كل لحظة معكِ هي حكاية عشق أعتز بها طوال العمر...
        </p>
      </div>

      <nav
        aria-label="أدوات التحكم"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e8b4b8]/20 bg-[#1f0910] p-3.5 shadow-lg"
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            className="flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-[#e8b4b8]/25 bg-[#5c1d24] px-4 py-2 text-sm font-semibold text-[#f3d5d8] transition-colors hover:bg-[#701c27]"
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 shrink-0" />
                <span>إيقاف الموسيقى</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 shrink-0" />
                <span>تشغيل الأغنية</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => songInputRef.current?.click()}
            className="flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-[#e8b4b8]/20 bg-[#e8b4b8]/10 px-4 py-2 text-sm font-semibold text-[#e8b4b8] transition-colors hover:bg-[#e8b4b8]/15"
          >
            <Music className="h-4 w-4 shrink-0" />
            <span>
              {hasCustomSong && customSongName
                ? `تغيير (${customSongName.slice(0, 14)})`
                : 'رفع أغنية (MP3)'}
            </span>
          </button>

          {hasCustomSong && (
            <button
              type="button"
              onClick={() => void onResetSong()}
              title="العودة للأغنية الافتراضية"
              aria-label="العودة للأغنية الافتراضية"
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-[#e8b4b8]/20 bg-[#290c15] px-3 text-[#c7999d] transition-colors hover:text-[#e8b4b8]"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          <input
            ref={songInputRef}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,audio/aac,audio/webm"
            onChange={(e) => void handleFileChange(e)}
            className="hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenAddPhoto}
            className="flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#701c27] to-[#b83247] px-4 py-2 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-95"
          >
            <Camera className="h-4 w-4 shrink-0" />
            <span>إضافة صورة</span>
          </button>

          <button
            type="button"
            onClick={onOpenSecurity}
            className="flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-[#e8b4b8]/20 bg-[#290c15] px-3.5 py-2 text-sm font-semibold text-[#e8b4b8] transition-colors hover:bg-[#3d121d]"
          >
            <Shield className="h-4 w-4 shrink-0 text-[#f3c677]" />
            <span>الحماية</span>
          </button>

          <button
            type="button"
            onClick={onLockNow}
            aria-label="قفل سريع"
            className="flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#e8b4b8]/20 bg-[#290c15] px-3.5 py-2 text-sm font-semibold text-[#c7999d] transition-colors hover:border-[#d64560]/50 hover:text-[#f3d5d8]"
          >
            <Lock className="h-4 w-4 shrink-0" />
            <span>قفل</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
