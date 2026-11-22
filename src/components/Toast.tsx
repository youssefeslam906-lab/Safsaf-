interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(24px+env(safe-area-inset-bottom,0px))] left-1/2 z-50 w-max max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-xl border border-[#e8b4b8]/35 bg-[#2d0a12]/95 px-5 py-3 text-center text-sm font-semibold text-[#f3d5d8] shadow-xl backdrop-blur-md"
    >
      {message}
    </div>
  );
}
