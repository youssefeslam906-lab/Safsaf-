import { Calendar } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { isValidDateInput } from '../lib/validation';
import { Modal } from './Modal';

interface LoveCounterProps {
  startDate: string;
  onSaveStartDate: (nextStartDate: string) => Promise<void>;
  onToast: (msg: string) => void;
}

function twoDigits(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function LoveCounter({
  startDate,
  onSaveStartDate,
  onToast,
}: LoveCounterProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [modalOpen, setModalOpen] = useState(false);
  const [dateInput, setDateInput] = useState(() => startDate.split('T')[0] || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const targetDate = useMemo(() => new Date(startDate), [startDate]);
  const isValidTarget = !Number.isNaN(targetDate.getTime());

  const diffInfo = useMemo(() => {
    if (!isValidTarget) {
      return { days: '00', hours: '00', minutes: '00', seconds: '00', isFuture: false };
    }
    const rawDiff = nowMs - targetDate.getTime();
    const isFuture = rawDiff < 0;
    const absDiff = Math.abs(rawDiff);

    return {
      days: twoDigits(Math.floor(absDiff / 86_400_000)),
      hours: twoDigits(Math.floor(absDiff / 3_600_000) % 24),
      minutes: twoDigits(Math.floor(absDiff / 60_000) % 60),
      seconds: twoDigits(Math.floor(absDiff / 1000) % 60),
      isFuture,
    };
  }, [isValidTarget, nowMs, targetDate]);

  const formattedSince = useMemo(() => {
    if (!isValidTarget) return '';
    const dateLabel = targetDate.toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    if (diffInfo.isFuture) {
      return `متبقي حتى موعدنا المميز في ${dateLabel} — وكل ثانية تقربني إليكِ`;
    }
    return `منذ ${dateLabel} — وكل ثانية تزيدكِ حباً في قلبي`;
  }, [diffInfo.isFuture, isValidTarget, targetDate]);

  const handleOpenModal = () => {
    setDateInput(startDate.split('T')[0] || '');
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValidDateInput(dateInput)) {
      onToast('يرجى اختيار تاريخ صحيح.');
      return;
    }
    setSaving(true);
    try {
      await onSaveStartDate(`${dateInput}T00:00:00`);
      setModalOpen(false);
      onToast('تم تحديث التاريخ 📅');
    } finally {
      setSaving(false);
    }
  };

  const cells = [
    { label: 'يوم', value: diffInfo.days, accent: 'text-[#f3c677]' },
    { label: 'ساعة', value: diffInfo.hours, accent: 'text-[#e8b4b8]' },
    { label: 'دقيقة', value: diffInfo.minutes, accent: 'text-[#e8b4b8]' },
    { label: 'ثانية', value: diffInfo.seconds, accent: 'text-[#d64560]' },
  ];

  return (
    <section className="rounded-3xl border border-[#e8b4b8]/25 bg-gradient-to-br from-[#240b13] via-[#1a060b] to-[#2d0a14] px-4 py-7 text-center shadow-xl sm:px-8">
      <h2 className="font-serif text-3xl font-bold text-[#e8b4b8]">
        {diffInfo.isFuture ? 'العد التنازلي ليومنا ⏳' : 'عداد حبنا ⏳'}
      </h2>
      <p className="mt-1.5 text-sm text-[#c7999d]">{formattedSince}</p>

      <div className="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="rounded-2xl border border-[#e8b4b8]/20 bg-[#120408] px-3 py-4"
          >
            <b
              className={`block text-2xl font-bold tabular-nums sm:text-3xl ${cell.accent}`}
            >
              {cell.value}
            </b>
            <small className="mt-1 block text-xs text-[#c7999d]">
              {cell.label}
            </small>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleOpenModal}
        className="mx-auto mt-5 inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl border border-[#e8b4b8]/20 bg-white/5 px-4 py-2 text-xs font-semibold text-[#e8b4b8] transition-colors hover:bg-white/10"
      >
        <Calendar className="h-4 w-4" />
        <span>تعديل تاريخ البداية</span>
      </button>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="تاريخ بداية قصتنا 📅"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="start-date-input"
              className="mb-1.5 block text-sm text-[#c7999d]"
            >
              اختاري التاريخ
            </label>
            <input
              id="start-date-input"
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="min-h-[46px] w-full rounded-xl border border-[#e8b4b8]/25 bg-[#290c15] px-4 py-2.5 text-[#f3d5d8]"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="min-h-[46px] w-full rounded-xl bg-gradient-to-r from-[#701c27] to-[#b83247] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {saving ? 'جاري التحديث...' : 'تحديث العداد'}
          </button>
        </form>
      </Modal>
    </section>
  );
}
