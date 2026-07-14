interface PlaceVisualProps {
  alt?: string;
  color?: string;
  imageUrl?: string;
  label?: string;
}

export function PlaceVisual({ alt = '', color = '#E1F0FF', imageUrl, label }: PlaceVisualProps) {
  return (
    <div className="place-visual" style={{ background: color }}>
      {imageUrl ? <img alt={alt} src={imageUrl} /> : <><span /><i /></>}
      {label && <b>{label}</b>}
    </div>
  );
}
