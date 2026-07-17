import { useState, type ReactNode } from 'react';

interface PlaceVisualProps {
  alt?: string;
  color?: string;
  imageUrl?: string;
  label?: string;
  type?: string;
  detailType?: string;
}

type IconKind = 'food' | 'cafe' | 'activity' | 'culture' | 'walk' | 'drink';

function iconKind(type = '', detailType = ''): IconKind {
  const detail = detailType.toLowerCase();
  if (type === 'food') return 'food';
  if (type === 'cafe') return 'cafe';
  if (type === 'drink') return 'drink';
  if (type === 'hotplace' || type === 'walk') return 'walk';
  if (/전시|영화|공연|팝업|미술관|박물관|갤러리/.test(detail)) return 'culture';
  return 'activity';
}

function CategoryIcon({ kind }: { kind: IconKind }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 2 };
  const paths: Record<IconKind, ReactNode> = {
    food: <><path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M15 3v18M15 3c4 2 5 7 0 10" /></>,
    cafe: <><path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V8Z" /><path d="M16 10h2a3 3 0 0 1 0 6h-2M8 3c0 1 1 1 1 2S8 6 8 7M12 3c0 1 1 1 1 2s-1 1-1 2" /></>,
    activity: <><path d="M5 7h14v10H5z" /><path d="M8 7V5h8v2M9 12h.01M15 12h.01M12 9v6M9 15h6" /></>,
    culture: <><path d="M4 5h16v14H4z" /><path d="m7 16 4-4 3 3 2-2 2 3M8 9h.01" /></>,
    walk: <><path d="M12 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path d="m9 21 2-6-2-3 2-5 4 3 3 1M11 15l4 2 1 4M7 10l3-2" /></>,
    drink: <><path d="M6 3h12l-2 7a4 4 0 0 1-8 0L6 3Z" /><path d="M12 14v7M8 21h8M8 7h8" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" {...common}>{paths[kind]}</svg>;
}

export function PlaceVisual({ alt = '', color = '#E1F0FF', imageUrl, label, type, detailType }: PlaceVisualProps) {
  const [failedImageUrl, setFailedImageUrl] = useState('');
  const imageFailed = Boolean(imageUrl && failedImageUrl === imageUrl);

  return (
    <div className={`place-visual place-visual-${iconKind(type, detailType)}`} style={{ background: color }}>
      {imageUrl && !imageFailed ? (
        <img alt={alt} src={imageUrl} onError={() => setFailedImageUrl(imageUrl)} />
      ) : (
        <span className="place-category-icon"><CategoryIcon kind={iconKind(type, detailType)} /></span>
      )}
      {label && <b>{label}</b>}
    </div>
  );
}
