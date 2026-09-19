import { useState } from 'react';
import { TripIcon } from './TripIcon';

export interface TripPhoto { imageUrl?: string; imageLicense?: string }
export type TripPhotos = Record<string, TripPhoto>;
export function TripPlacePhoto({ photo, name }: { photo?: TripPhoto; name: string }) {
  const [failedUrl, setFailedUrl] = useState('');
  const available = photo?.imageUrl && photo.imageUrl !== failedUrl;
  return <figure className="trip-place-photo">
    {available ? <img src={photo.imageUrl} alt={name} loading="lazy" onError={() => setFailedUrl(photo.imageUrl || '')} /> : <div className="trip-place-photo-empty"><TripIcon name="map" /><span>사진 준비 중</span></div>}
    {available && <figcaption>© 한국관광공사{photo.imageLicense === 'Type3' ? ' · 공공누리 3유형' : photo.imageLicense === 'Type1' ? ' · 공공누리 1유형' : ''}</figcaption>}
  </figure>;
}
