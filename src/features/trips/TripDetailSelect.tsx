import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { TripIcon, type TripIconName } from './TripIcon';

interface DetailOption<T extends string> { value: T; label: string; icon: TripIconName; description?: string }

export function TripDetailSelect<T extends string>({ label, icon, value, options, open, onOpenChange, onChange }: {
  label: string; icon: TripIconName; value: T; options: DetailOption<T>[];
  open: boolean; onOpenChange: (open: boolean) => void; onChange: (value: T) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const activeOption = useRef<HTMLLIElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const [placement, setPlacement] = useState({ above: false, height: 344 });
  const selected = Math.max(0, options.findIndex(option => option.value === value));
  const [active, setActive] = useState(selected);
  const search = useRef({ text: '', time: 0 });

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) onOpenChange(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, onOpenChange]);
  useEffect(() => {
    const list = menu.current, option = activeOption.current;
    if (!open || !list || !option) return;
    // Scroll only the options, without moving the whole home page when opening.
    const listRect = list.getBoundingClientRect(), optionRect = option.getBoundingClientRect();
    if (optionRect.bottom > listRect.bottom - 8) list.scrollTop += optionRect.bottom - listRect.bottom + 8;
    else if (optionRect.top < listRect.top + 8) list.scrollTop -= listRect.top - optionRect.top + 8;
  }, [active, open]);

  const expand = (index = selected) => {
    const rect = root.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom - 20, above = rect.top - 100;
      const useAbove = below < 240 && above > below;
      setPlacement({ above: useAbove, height: Math.max(100, Math.min(344, useAbove ? above : below)) });
    }
    setActive(index); search.current.text = ''; onOpenChange(true);
  };
  const choose = (index: number) => { onChange(options[index].value); onOpenChange(false); trigger.current?.focus(); };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      if (open) { event.preventDefault(); event.stopPropagation(); onOpenChange(false); }
      return;
    }
    if (event.key === 'Tab') { onOpenChange(false); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (!open) { expand(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : selected); return; }
      setActive(index => event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : Math.max(0, Math.min(options.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) choose(active); else expand();
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && !event.nativeEvent.isComposing) {
      const now = Date.now();
      const text = (now - search.current.time < 700 ? search.current.text : '') + event.key;
      search.current = { text, time: now };
      const match = options.findIndex(option => option.label.startsWith(text));
      if (match >= 0) { event.preventDefault(); if (!open) expand(match); else setActive(match); search.current = { text, time: now }; }
    }
  };

  return <div ref={root} className={`trip-detail-dropdown${open ? ' is-open' : ''}`} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) onOpenChange(false);
  }}>
    <button ref={trigger} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open}
      aria-labelledby={`${id}-label ${id}-value`} aria-controls={open ? `${id}-list` : undefined}
      aria-activedescendant={open ? `${id}-option-${active}` : undefined}
      className="trip-detail-card" onClick={() => { if (open) onOpenChange(false); else expand(); }} onKeyDown={onKeyDown}>
      <span id={`${id}-label`} className="trip-detail-label"><TripIcon name={icon} />{label}</span>
      <span className="trip-detail-select"><span id={`${id}-value`}>{options[selected].label}</span><span className="trip-detail-chevron"><TripIcon name="down" /></span></span>
    </button>
    {open && <ul ref={menu} id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className={`trip-detail-menu${placement.above ? ' opens-above' : ''}`} style={{ maxHeight: placement.height }}>
      {options.map((option, index) => <li key={option.value} id={`${id}-option-${index}`} role="option"
        ref={active === index ? activeOption : undefined} aria-selected={option.value === value}
        className={`trip-detail-option${active === index ? ' is-active' : ''}`}
        onMouseDown={event => event.preventDefault()} onMouseMove={() => setActive(index)} onClick={() => choose(index)}>
        <span className="trip-detail-option-icon"><TripIcon name={option.icon} /></span>
        <span className="trip-detail-option-copy"><span>{option.label}</span>{option.description && <small>{option.description}</small>}</span>
        <span className="trip-detail-option-check">{option.value === value && <TripIcon name="check" />}</span>
      </li>)}
    </ul>}
  </div>;
}
