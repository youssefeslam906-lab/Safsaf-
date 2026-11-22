import { Edit3, Heart, Mail } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { sanitizeText } from '../lib/validation';
import { Modal } from './Modal';

interface LoveLetterProps {
  note: string;
  onSaveNote: (nextNote: string) => Promise<void>;
  onToast: (msg: string) => void;
}

export function LoveLetter({ note, onSaveNote, onToast }: LoveLetterProps) {
  const [flipped, setFlipped] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState(note);
  const [saving, setSaving] = useState(false);

  const handleOpenEdit = () => {
    setDraft(note);
    setEditOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const clean = sanitizeText(draft, 500, true);
    if (!clean) {
      onToast('الرسالة لا يمكن أن تكون فارغة.');
      return;
    }
    setSaving(true);
    try {
      await onSaveNote(clean);
      setEditOpen(false);
      onToast('تم حفظ رسالتك 💌');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="perspective-1000 mx-auto w-full max-w-xl">
        <button
          type="button"
          onClick={() => setFlipped((prev) => !prev)}
          aria-pressed={flipped}
          aria-label={
            flipped ? 'إغلاق رسالة الحب' : 'اضغطي لفتح رسالة الحب'
          }
          className="block h-[340px] w-full text-center"
        >
          <div
            className={`flip-transition preserve-3d relative h-full w-full transition-transform duration-700 ${
              flipped ? 'rotate-y-180' : ''
            }`}
          >
            {/* Front Face */}
            <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-[#e8b4b8]/25 bg-gradient-to-br from-[#360d18] via-[#1f0910] to-[#45101f] p-6 shadow-xl">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e8b4b8]/25 bg-[#290c15] text-[#e8b4b8]">
                <Mail className="h-7 w-7" />
              </div>
              <h3 className="font-serif text-3xl font-bold text-[#e8b4b8]">
                رسالة حب خاصة لكِ
              </h3>
              <span className="mt-2 text-sm text-[#c7999d]">
                اضغطي لفتح الرسالة 💌
              </span>
            </div>

            {/* Back Face */}
            <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-3xl border border-[#f3c677]/40 bg-gradient-to-br from-[#45101f] via-[#2d0a12] to-[#1a040a] p-6 shadow-xl">
              <Heart className="mb-3 h-7 w-7 shrink-0 fill-[#d64560] text-[#d64560]" />
              <p className="whitespace-pre-line font-serif text-xl italic leading-relaxed text-[#e8b4b8]">
                {note}
              </p>
            </div>
          </div>
        </button>

        {/* Action sits outside the flip button to prevent nested interactive controls */}
        {flipped && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={handleOpenEdit}
              className="inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl border border-[#e8b4b8]/25 bg-[#e8b4b8]/10 px-4 py-2 text-sm font-semibold text-[#e8b4b8] transition-colors hover:bg-[#e8b4b8]/20"
            >
              <Edit3 className="h-4 w-4" />
              <span>تعديل الرسالة</span>
            </button>
          </div>
        )}
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="تعديل رسالة الحب ✍️"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label
              htmlFor="love-note-textarea"
              className="mb-1.5 block text-sm text-[#c7999d]"
            >
              نص الرسالة ({draft.length}/500)
            </label>
            <textarea
              id="love-note-textarea"
              rows={5}
              maxLength={500}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full rounded-xl border border-[#e8b4b8]/25 bg-[#290c15] p-3.5 text-[#f3d5d8]"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="min-h-[46px] w-full rounded-xl bg-gradient-to-r from-[#701c27] to-[#b83247] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {saving ? 'جاري التشفير والحفظ...' : 'حفظ الرسالة'}
          </button>
        </form>
      </Modal>
    </section>
  );
}
