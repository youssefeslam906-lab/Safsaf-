import { ImagePlus, Trash2, X } from 'lucide-react';
import { type ChangeEvent, type FormEvent, useState } from 'react';
import {
  isSafeMediaSrc,
  resizeAndStripImage,
  sanitizeText,
} from '../lib/validation';
import type { PhotoMemory } from '../types';
import { Modal } from './Modal';

interface MemoryGalleryProps {
  photos: PhotoMemory[];
  uploadOpen: boolean;
  onCloseUpload: () => void;
  onOpenUpload: () => void;
  onAddPhoto: (photo: { image: string; caption: string }) => Promise<void>;
  onDeletePhoto: (id: string) => Promise<void>;
  onToast: (msg: string) => void;
}

export function MemoryGallery({
  photos,
  uploadOpen,
  onCloseUpload,
  onOpenUpload,
  onAddPhoto,
  onDeletePhoto,
  onToast,
}: MemoryGalleryProps) {
  const [previewSrc, setPreviewSrc] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [processingImg, setProcessingImg] = useState(false);
  const [saving, setSaving] = useState(false);

  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoMemory | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PhotoMemory | null>(null);
  const [brokenIds, setBrokenIds] = useState<Record<string, boolean>>({});

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setProcessingImg(true);
    try {
      const processed = await resizeAndStripImage(file, 1200);
      setPreviewSrc(processed);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'الصورة دي مش شغالة، جربي صورة تانية.';
      onToast(message);
    } finally {
      setProcessingImg(false);
    }
  };

  const handleSaveSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!previewSrc || !isSafeMediaSrc(previewSrc)) {
      onToast('اختاري صورة سليمة الأول');
      return;
    }

    setSaving(true);
    try {
      await onAddPhoto({
        image: previewSrc,
        caption: sanitizeText(caption, 120, false),
      });
      setPreviewSrc('');
      setCaption('');
      onCloseUpload();
      onToast('تمت إضافة الصورة وتشفيرها ❤️');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    await onDeletePhoto(pendingDelete.id);
    setPendingDelete(null);
    onToast('تم حذف الصورة');
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-serif text-3xl font-bold text-[#e8b4b8]">
            معرض ذكرياتنا 📸
          </h2>
          <p className="mt-1 text-sm text-[#c7999d]">
            الصور تُحفظ مشفرة على جهازك فقط بعد إزالة بيانات الموقع تلقائياً ·{' '}
            <span className="tabular-nums">{photos.length}</span> ذكرى
          </p>
        </div>
      </div>

      {photos.length === 0 ? (
        <button
          type="button"
          onClick={onOpenUpload}
          className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e8b4b8]/25 bg-[#1f0910] px-6 py-12 text-center text-[#e8b4b8] transition-colors hover:border-[#e8b4b8]/50"
        >
          <ImagePlus className="mb-3 h-10 w-10 text-[#e8b4b8]" />
          <span className="text-base font-semibold">
            المعرض جاهز لصوركم الجميلة ❤️
          </span>
          <small className="mt-1 text-xs text-[#c7999d]">
            اضغطي هنا لإضافة أول صورة
          </small>
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => {
            const safeSrc = isSafeMediaSrc(photo.image) ? photo.image : '';
            const isBroken = !safeSrc || brokenIds[photo.id];

            return (
              <article
                key={photo.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-[#e8b4b8]/20 bg-[#1f0910] shadow-lg transition-colors hover:border-[#e8b4b8]/40"
              >
                <div className="relative h-64 w-full bg-[#120408]">
                  <button
                    type="button"
                    onClick={() => setLightboxPhoto(photo)}
                    aria-label={
                      photo.caption
                        ? `عرض الصورة: ${photo.caption}`
                        : 'عرض الصورة بالحجم الكامل'
                    }
                    className="h-full w-full overflow-hidden text-right"
                  >
                    {isBroken ? (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-[#290c15] p-4 text-center text-sm text-[#c7999d]">
                        <span>تعذر عرض الصورة</span>
                      </div>
                    ) : (
                      <img
                        src={safeSrc}
                        alt={photo.caption || 'ذكرى جميلة'}
                        loading="lazy"
                        onError={() =>
                          setBrokenIds((prev) => ({ ...prev, [photo.id]: true }))
                        }
                        className="h-full w-full object-cover object-[center_35%] transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    )}
                  </button>

                  {!photo.isSeed && (
                    <button
                      type="button"
                      onClick={() => setPendingDelete(photo)}
                      aria-label="حذف الصورة"
                      className="absolute top-2.5 left-2.5 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/15 bg-black/75 text-[#f3d5d8] backdrop-blur-sm transition-colors hover:bg-[#b83247]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {photo.caption && (
                  <p className="flex-1 p-4 text-center font-serif text-lg leading-relaxed text-[#e8b4b8]">
                    {photo.caption}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Upload Photo Modal */}
      <Modal
        open={uploadOpen}
        onClose={() => {
          setPreviewSrc('');
          setCaption('');
          onCloseUpload();
        }}
        title="إضافة صورة لذكرى جميلة ✨"
      >
        <form onSubmit={handleSaveSubmit} className="space-y-4">
          <label
            htmlFor="memory-file-input"
            className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e8b4b8]/30 bg-[#290c15] p-5 text-center text-sm text-[#e8b4b8] transition-colors hover:border-[#e8b4b8]/60"
          >
            <ImagePlus className="mb-2 h-7 w-7 text-[#e8b4b8]" />
            <span>
              {processingImg
                ? 'جاري معالجة وتأمين الصورة...'
                : 'اضغطي لاختيار صورة من جهازك (JPEG / PNG / WebP)'}
            </span>
            {previewSrc && (
              <img
                src={previewSrc}
                alt="معاينة الصورة"
                className="mt-3 h-36 w-full rounded-xl object-cover"
              />
            )}
          </label>
          <input
            id="memory-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => void handleFileChange(e)}
            className="hidden"
          />

          <div>
            <label
              htmlFor="memory-caption"
              className="mb-1.5 block text-sm text-[#c7999d]"
            >
              تعليق على الصورة ({caption.length}/120)
            </label>
            <input
              id="memory-caption"
              type="text"
              maxLength={120}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="مثال: أحلى يوم في حياتي معاكي ❤️"
              className="min-h-[46px] w-full rounded-xl border border-[#e8b4b8]/25 bg-[#290c15] px-4 py-2.5 text-[#f3d5d8] placeholder:text-[#c7999d]/50"
            />
          </div>

          <button
            type="submit"
            disabled={saving || processingImg || !previewSrc}
            className="min-h-[46px] w-full rounded-xl bg-gradient-to-r from-[#701c27] to-[#b83247] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'جاري التشفير والحفظ...' : 'حفظ الصورة 💖'}
          </button>
        </form>
      </Modal>

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/92 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="عرض الصورة"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setLightboxPhoto(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setLightboxPhoto(null);
            }
          }}
        >
          <button
            type="button"
            autoFocus
            onClick={() => setLightboxPhoto(null)}
            aria-label="إغلاق العرض"
            className="fixed top-4 left-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#e8b4b8]/30 bg-[#1a060b]/90 text-[#e8b4b8] transition-colors hover:bg-[#3d121d]"
          >
            <X className="h-5 w-5" />
          </button>

          {isSafeMediaSrc(lightboxPhoto.image) && (
            <img
              src={lightboxPhoto.image}
              alt={lightboxPhoto.caption || 'ذكرى'}
              className="max-h-[65vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
          )}

          {lightboxPhoto.caption && (
            <p className="mt-4 max-h-[24vh] max-w-xl overflow-y-auto px-2 text-center font-serif text-xl leading-relaxed text-[#e8b4b8]">
              {lightboxPhoto.caption}
            </p>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="تأكيد حذف الذكرى"
        maxWidthClass="max-w-sm"
      >
        <p className="text-sm leading-relaxed text-[#c7999d]">
          هل تريدين حذف هذه الصورة من جهازك نهائياً؟ لا يمكن التراجع عن هذا
          الإجراء.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => void handleConfirmDelete()}
            className="min-h-[44px] flex-1 rounded-xl bg-[#b83247] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-95"
          >
            نعم، احذفها
          </button>
          <button
            type="button"
            onClick={() => setPendingDelete(null)}
            className="min-h-[44px] flex-1 rounded-xl border border-[#e8b4b8]/25 bg-[#290c15] px-4 py-2 text-sm font-semibold text-[#e8b4b8]"
          >
            إلغاء
          </button>
        </div>
      </Modal>
    </section>
  );
}
