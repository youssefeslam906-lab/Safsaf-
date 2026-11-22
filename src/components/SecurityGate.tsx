import { Eye, EyeOff, Heart, KeyRound, Lock, ShieldCheck, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import {
  evaluatePasscodeStrength,
  getRemainingLockoutSeconds,
} from '../lib/crypto';
import type { LockoutState } from '../types';

interface SecurityGateProps {
  mode: 'setup' | 'unlock';
  lockout: LockoutState;
  busy: boolean;
  errorMessage: string | null;
  onSetup: (passcode: string) => Promise<void>;
  onUnlock: (passcode: string) => Promise<void>;
  onResetVault: () => Promise<void>;
}

export function SecurityGate({
  mode,
  lockout,
  busy,
  errorMessage,
  onSetup,
  onUnlock,
  onResetVault,
}: SecurityGateProps) {
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(() =>
    getRemainingLockoutSeconds(lockout),
  );

  useEffect(() => {
    const update = () => {
      setCooldownSeconds(getRemainingLockoutSeconds(lockout));
    };
    update();
    if (lockout.lockedUntil <= Date.now()) return;
    const timer = window.setInterval(update, 500);
    return () => window.clearInterval(timer);
  }, [lockout]);

  const strength = evaluatePasscodeStrength(passcode);
  const isLockedOut = mode === 'unlock' && cooldownSeconds > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (busy || isLockedOut) return;

    if (mode === 'setup') {
      if (passcode.length < 4) {
        setLocalError('يرجى اختيار رمز مرور من 4 أحرف أو أرقام على الأقل.');
        return;
      }
      if (passcode !== confirmPasscode) {
        setLocalError('رمز المرور وتأكيده غير متطابقين.');
        return;
      }
      await onSetup(passcode);
      setPasscode('');
      setConfirmPasscode('');
      return;
    }

    if (!passcode) {
      setLocalError('يرجى إدخال رمز المرور أولاً.');
      return;
    }

    await onUnlock(passcode);
    setPasscode('');
  };

  const displayedError = localError || errorMessage;

  return (
    <div className="relative z-10 flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-[#090204] via-[#1c060d] to-[#360b17] p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#e8b4b8]/25 bg-[#1a060b]/95 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#e8b4b8]/35 bg-gradient-to-br from-[#701c27] to-[#b83247] text-[#f3d5d8] shadow-lg">
            {mode === 'setup' ? (
              <ShieldCheck className="h-8 w-8" />
            ) : (
              <Lock className="h-8 w-8" />
            )}
          </div>

          <h1
            dir="ltr"
            className="font-serif text-3xl font-bold tracking-tight text-[#e8b4b8] sm:text-4xl"
          >
            Yousef&amp;Safsofa ❤
          </h1>

          <p className="mt-2 text-sm text-[#c7999d]">
            {mode === 'setup'
              ? 'أنشئي رمز مرور خاص لحماية وتشفير ذكرياتكما على هذا الجهاز.'
              : 'أدخلي رمز المرور للدخول إلى عالمنا 💕'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="vault-passcode"
              className="mb-1.5 block text-sm font-medium text-[#e8b4b8]"
            >
              {mode === 'setup' ? 'رمز المرور الجديد' : 'رمز المرور'}
            </label>
            <div className="relative">
              <input
                id="vault-passcode"
                type={showPasscode ? 'text' : 'password'}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setLocalError(null);
                }}
                autoComplete={
                  mode === 'setup' ? 'new-password' : 'current-password'
                }
                disabled={busy || isLockedOut}
                placeholder={
                  mode === 'setup'
                    ? '4 أحرف أو أرقام على الأقل'
                    : 'اكتبي رمز المرور...'
                }
                className="min-h-[46px] w-full rounded-xl border border-[#e8b4b8]/25 bg-[#290c15] py-2.5 pr-4 pl-12 text-base text-[#f3d5d8] placeholder:text-[#c7999d]/50 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPasscode((prev) => !prev)}
                aria-label={
                  showPasscode ? 'إخفاء رمز المرور' : 'إظهار رمز المرور'
                }
                className="absolute top-1/2 left-1 flex min-h-[40px] min-w-[40px] -translate-y-1/2 items-center justify-center rounded-lg text-[#c7999d] transition-colors hover:text-[#e8b4b8]"
              >
                {showPasscode ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            {mode === 'setup' && passcode.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="grid grid-cols-3 gap-1.5">
                  {[1, 2, 3].map((level) => (
                    <div
                      key={level}
                      className={`h-1.5 rounded-sm transition-colors ${
                        strength.score >= level
                          ? strength.score === 3
                            ? 'bg-emerald-400'
                            : strength.score === 2
                              ? 'bg-[#f3c677]'
                              : 'bg-[#d64560]'
                          : 'bg-[#290c15]'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-[#c7999d]">{strength.label}</p>
              </div>
            )}
          </div>

          {mode === 'setup' && (
            <div>
              <label
                htmlFor="vault-passcode-confirm"
                className="mb-1.5 block text-sm font-medium text-[#e8b4b8]"
              >
                تأكيد رمز المرور
              </label>
              <input
                id="vault-passcode-confirm"
                type={showPasscode ? 'text' : 'password'}
                value={confirmPasscode}
                onChange={(e) => {
                  setConfirmPasscode(e.target.value);
                  setLocalError(null);
                }}
                autoComplete="new-password"
                disabled={busy}
                placeholder="أعيدي كتابة رمز المرور"
                className="min-h-[46px] w-full rounded-xl border border-[#e8b4b8]/25 bg-[#290c15] px-4 py-2.5 text-base text-[#f3d5d8] placeholder:text-[#c7999d]/50"
              />
            </div>
          )}

          {isLockedOut && (
            <div
              role="alert"
              className="rounded-xl border border-[#d64560]/40 bg-[#d64560]/10 p-3 text-center text-sm text-[#f3d5d8]"
            >
              تم إيقاف المحاولات مؤقتاً لحماية الحساب. يرجى الانتظار{' '}
              <span className="font-bold text-[#f3c677] tabular-nums">
                {cooldownSeconds}
              </span>{' '}
              ثانية.
            </div>
          )}

          {displayedError && !isLockedOut && (
            <div
              role="alert"
              className="rounded-xl border border-[#d64560]/40 bg-[#d64560]/10 p-3 text-sm text-[#f3d5d8]"
            >
              {displayedError}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || isLockedOut}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#701c27] to-[#b83247] px-5 py-3 text-base font-semibold text-white shadow-lg transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mode === 'setup' ? (
              <>
                <KeyRound className="h-5 w-5" />
                <span>
                  {busy ? 'جاري تأمين الخزنة...' : 'حفظ الرمز والدخول'}
                </span>
              </>
            ) : (
              <>
                <Heart className="h-5 w-5 fill-current" />
                <span>{busy ? 'جاري التحقق...' : 'فتح عالمنا'}</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-5 border-t border-[#e8b4b8]/15 pt-4 text-xs text-[#c7999d]">
          <p className="leading-relaxed">
            تشفير محلي كامل بتقنية AES-256 — الصور والرسائل تبقى مشفرة على جهازك
            فقط ولا تُرسل لأي خادم خارجي.
          </p>

          {mode === 'unlock' && (
            <div className="mt-3">
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="min-h-[36px] text-xs font-medium text-[#c7999d] underline underline-offset-4 transition-colors hover:text-[#e8b4b8]"
                >
                  نسيتِ رمز المرور؟ إعادة تهيئة الخزنة المحلية
                </button>
              ) : (
                <div className="mt-2 rounded-xl border border-[#d64560]/35 bg-[#290c15] p-3">
                  <p className="text-xs text-[#f3d5d8]">
                    تحذير: إعادة التهيئة ستحذف الصور والرسائل المضافة محلياً لعدم
                    إمكانية فك تشفيرها بدون الرمز. هل أنتِ متأكدة؟
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        await onResetVault();
                        setConfirmReset(false);
                      }}
                      className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#b83247] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>نعم، حذف وإعادة الضبط</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="min-h-[40px] rounded-lg border border-[#e8b4b8]/25 px-3 py-1.5 text-xs text-[#e8b4b8]"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
