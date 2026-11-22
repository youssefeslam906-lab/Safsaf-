import { Download, KeyRound, ShieldCheck, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import type { VaultSecuritySettings } from '../types';
import { Modal } from './Modal';

interface SecurityModalProps {
  open: boolean;
  settings: VaultSecuritySettings;
  onClose: () => void;
  onUpdateSettings: (next: VaultSecuritySettings) => Promise<void>;
  onChangePasscode: (
    currentPasscode: string,
    newPasscode: string,
  ) => Promise<boolean>;
  onExportBackup: () => Promise<void>;
  onResetVault: () => Promise<void>;
  onToast: (msg: string) => void;
}

export function SecurityModal({
  open,
  settings,
  onClose,
  onUpdateSettings,
  onChangePasscode,
  onExportBackup,
  onResetVault,
  onToast,
}: SecurityModalProps) {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handlePassSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPassError(null);

    if (!currentPass) {
      setPassError('أدخلي رمز المرور الحالي أولاً.');
      return;
    }
    if (newPass.length < 4) {
      setPassError('رمز المرور الجديد يجب أن يكون 4 أحرف أو أرقام على الأقل.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('رمز المرور الجديد وتأكيده غير متطابقين.');
      return;
    }

    setChangingPass(true);
    try {
      const ok = await onChangePasscode(currentPass, newPass);
      if (!ok) {
        setPassError('رمز المرور الحالي غير صحيح.');
        return;
      }
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      onToast('تم تغيير رمز المرور وإعادة تشفير الخزنة بنجاح 🔐');
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إعدادات الحماية والخصوصية"
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-6">
        {/* Privacy Controls */}
        <div className="space-y-4 rounded-2xl border border-[#e8b4b8]/20 bg-[#290c15]/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#e8b4b8]">
            <ShieldCheck className="h-4 w-4 text-[#f3c677]" />
            <span>خيارات الخصوصية التلقائية</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-[#f3d5d8]">
                درع إخفاء الشاشة عند تبديل التبويب
              </div>
              <div className="text-xs text-[#c7999d]">
                تعتيم المحتوى فوراً عند مغادرة الصفحة لمنع التطفل
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.blurOnHide}
              onClick={() =>
                void onUpdateSettings({
                  ...settings,
                  blurOnHide: !settings.blurOnHide,
                })
              }
              className={`relative min-h-[36px] w-14 shrink-0 rounded-xl border transition-colors ${
                settings.blurOnHide
                  ? 'border-[#b83247] bg-[#b83247]'
                  : 'border-[#e8b4b8]/25 bg-[#120408]'
              }`}
            >
              <span
                className={`block h-5 w-5 rounded-lg bg-white transition-transform ${
                  settings.blurOnHide ? '-translate-x-7' : '-translate-x-1.5'
                }`}
              />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8b4b8]/10 pt-3">
            <label
              htmlFor="idle-timeout-select"
              className="text-sm font-medium text-[#f3d5d8]"
            >
              القفل التلقائي عند الخمول
            </label>
            <select
              id="idle-timeout-select"
              value={settings.idleTimeoutMinutes}
              onChange={(e) => {
                const val = Number(e.target.value) as 0 | 2 | 5 | 15;
                void onUpdateSettings({
                  ...settings,
                  idleTimeoutMinutes: val,
                });
              }}
              className="min-h-[44px] rounded-xl border border-[#e8b4b8]/25 bg-[#120408] px-3 text-sm text-[#e8b4b8]"
            >
              <option value={2}>بعد دقيقتين</option>
              <option value={5}>بعد 5 دقائق</option>
              <option value={15}>بعد 15 دقيقة</option>
              <option value={0}>إيقاف القفل التلقائي</option>
            </select>
          </div>
        </div>

        {/* Change Passcode */}
        <form
          onSubmit={handlePassSubmit}
          className="space-y-3 rounded-2xl border border-[#e8b4b8]/20 bg-[#290c15]/60 p-4"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-[#e8b4b8]">
            <KeyRound className="h-4 w-4 text-[#f3c677]" />
            <span>تغيير رمز المرور</span>
          </div>

          <input
            type="password"
            value={currentPass}
            onChange={(e) => {
              setCurrentPass(e.target.value);
              setPassError(null);
            }}
            placeholder="رمز المرور الحالي"
            autoComplete="current-password"
            className="min-h-[44px] w-full rounded-xl border border-[#e8b4b8]/25 bg-[#120408] px-3.5 text-sm text-[#f3d5d8] placeholder:text-[#c7999d]/50"
          />

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <input
              type="password"
              value={newPass}
              onChange={(e) => {
                setNewPass(e.target.value);
                setPassError(null);
              }}
              placeholder="الرمز الجديد (4+ أحرف)"
              autoComplete="new-password"
              className="min-h-[44px] w-full rounded-xl border border-[#e8b4b8]/25 bg-[#120408] px-3.5 text-sm text-[#f3d5d8] placeholder:text-[#c7999d]/50"
            />
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => {
                setConfirmPass(e.target.value);
                setPassError(null);
              }}
              placeholder="تأكيد الرمز الجديد"
              autoComplete="new-password"
              className="min-h-[44px] w-full rounded-xl border border-[#e8b4b8]/25 bg-[#120408] px-3.5 text-sm text-[#f3d5d8] placeholder:text-[#c7999d]/50"
            />
          </div>

          {passError && (
            <p className="text-xs text-[#f3c677]" role="alert">
              {passError}
            </p>
          )}

          <button
            type="submit"
            disabled={changingPass}
            className="min-h-[44px] w-full rounded-xl bg-gradient-to-r from-[#701c27] to-[#b83247] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {changingPass ? 'جاري إعادة التشفير...' : 'تحديث رمز المرور'}
          </button>
        </form>

        {/* Encrypted Backup & Reset */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => void onExportBackup()}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#e8b4b8]/25 bg-[#290c15] px-4 py-2 text-sm font-semibold text-[#e8b4b8] transition-colors hover:bg-[#3d121d]"
          >
            <Download className="h-4 w-4" />
            <span>تحميل نسخة احتياطية مشفرة (.ysvault)</span>
          </button>

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#d64560]/30 bg-transparent px-4 py-2 text-sm font-medium text-[#d64560] transition-colors hover:bg-[#d64560]/10"
            >
              <Trash2 className="h-4 w-4" />
              <span>مسح البيانات المحلية وإعادة الضبط</span>
            </button>
          ) : (
            <div className="rounded-xl border border-[#d64560]/40 bg-[#290c15] p-3 text-center">
              <p className="text-xs text-[#f3d5d8]">
                سيتم حذف جميع الصور المضافة والرسالة المحفوظة وإزالة رمز المرور.
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => void onResetVault()}
                  className="min-h-[40px] flex-1 rounded-lg bg-[#b83247] px-3 text-xs font-semibold text-white"
                >
                  تأكيد المسح النهائي
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="min-h-[40px] flex-1 rounded-lg border border-[#e8b4b8]/25 px-3 text-xs text-[#e8b4b8]"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
