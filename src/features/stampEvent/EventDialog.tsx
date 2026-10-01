import { useEffect, useRef, type ReactNode } from 'react';

export function EventDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog?.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="nopi-event-dialog" aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h2>{title}</h2><button type="button" aria-label="닫기" onClick={onClose}>×</button></header>
    {children}
  </dialog>;
}
