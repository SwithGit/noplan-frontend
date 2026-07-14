interface ChipProps {
  active?: boolean;
  children: string;
  onClick?: () => void;
}

export function Chip({ active = false, children, onClick }: ChipProps) {
  return (
    <button className={`np-chip ${active ? 'active' : ''}`} type="button" onClick={onClick}>
      {active && <span aria-hidden="true" className="chip-check">✓</span>}
      {children}
    </button>
  );
}
