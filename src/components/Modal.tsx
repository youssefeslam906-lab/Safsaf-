import { X } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  maxWidthClass?: string;
  children: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  maxWidthClass = 'max-w-md',
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/88 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'نافذة حوار'}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`relative max-h-[92vh] w-full ${maxWidthClass} overflow-y-auto rounded-2xl border border-[#e8b4b8]/25 bg-[#1a060b] p-6 shadow-2xl`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? (
            <h3 className="font-serif text-2xl font-bold text-[#e8b4b8]">
              {title}
            </h3>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-[#e8b4b8]/20 bg-[#290c15] text-[#e8b4b8] transition-colors hover:border-[#e8b4b8]/45 hover:bg-[#3d121d]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
