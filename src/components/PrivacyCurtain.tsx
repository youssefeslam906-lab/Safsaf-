import { EyeOff, Lock } from 'lucide-react';

interface PrivacyCurtainProps {
  visible: boolean;
  onDismiss: () => void;
  onLockNow: () => void;
}

export function PrivacyCurtain({
  visible,
  onDismiss,
  onLockNow,
}: PrivacyCurtainProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#120408]/95 p-6 text-center backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="حماية الخصوصية"
    >
      <div className="max-w-sm rounded-2xl border border-[#e8b4b8]/25 bg-[#1f0910] p-7 shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e8b4b8]/25 bg-[#290c15] text-[#e8b4b8]">
          <EyeOff className="h-7 w-7" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-[#e8b4b8]">
          درع الخصوصية مُفعّل
        </h2>
        <p className="mt-2 text-sm text-[#c7999d]">
          تم إخفاء المحتوى تلقائياً عند مغادرة النافذة لحماية ذكرياتكما من المتطفلين.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-[44px] flex-1 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#701c27] to-[#b83247] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
          >
            متابعة التصفح
          </button>
          <button
            type="button"
            onClick={onLockNow}
            className="flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#e8b4b8]/25 bg-[#290c15] px-4 py-2.5 text-sm font-semibold text-[#e8b4b8] transition-colors hover:bg-[#3d121d]"
          >
            <Lock className="h-4 w-4" />
            <span>قفل الآن</span>
          </button>
        </div>
      </div>
    </div>
  );
}
