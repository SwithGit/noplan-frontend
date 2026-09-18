import { useEffect, useRef, type ReactNode } from 'react';
import { TripIcon } from './TripIcon';

export function TripDialog({ title, onClose, children, className = '' }: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; const previous = document.activeElement as HTMLElement | null; element?.showModal(); return () => { element?.close(); previous?.focus(); }; }, []);
  return <dialog className={`trip-dialog ${className}`} ref={dialog} aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); } }}>
    <header><h2>{title}</h2><button className="trip-icon-button" aria-label="닫기" type="button" onClick={onClose}><TripIcon name="close" /></button></header>{children}
  </dialog>;
}
