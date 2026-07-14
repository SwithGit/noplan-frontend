interface PlaceVisualProps {
  color?: string;
  label?: string;
}

export function PlaceVisual({ color = '#E1F0FF', label }: PlaceVisualProps) {
  return (
    <div className="place-visual" style={{ background: color }}>
      <span />
      <i />
      {label && <b>{label}</b>}
    </div>
  );
}
