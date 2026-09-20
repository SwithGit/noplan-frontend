import { useEffect, useId, useRef, useState } from 'react';
import { locales, localeNames, setLocale, useLocale } from './locale';
import './language.css';

export function LanguageSelect() {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  return <div className="language-select" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => {
    if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    if (open && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const buttons = Array.from(root.current!.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
    }
  }}>
    <button className="language-trigger" ref={trigger} type="button" aria-label={`Language / 언어: ${localeNames[locale]}`} aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6.5h14M5 17.5h14"/></svg>
      <span>{locale === 'zh-CN' ? '中文' : localeNames[locale]}</span><span aria-hidden="true">⌄</span>
    </button>
    {open && <div id={id} className="language-menu" role="menu" aria-label="Language / 언어">
      <small>Language</small>
      {locales.map(item => <button key={item} type="button" role="menuitemradio" aria-checked={locale === item} lang={item} onClick={() => { setLocale(item); setOpen(false); trigger.current?.focus(); }}><span>{localeNames[item]}</span><span aria-hidden="true">{locale === item ? '✓' : ''}</span></button>)}
    </div>}
  </div>;
}
