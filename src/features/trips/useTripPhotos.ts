import { useEffect, useState } from 'react';
import { apiJson } from '../../api/client';
import type { TourismSearchResult } from '../../api/tourismApi';
import type { TripPhotos } from './TripPlacePhoto';

let publicPhotos: TripPhotos | undefined;

// Saved trips keep official content IDs; resolve their photos without rewriting
// the itinerary or storing personalized ranking data in this shared cache.
export function useTripPhotos(enabled: boolean) {
  const [photos, setPhotos] = useState<TripPhotos>(publicPhotos || {});
  useEffect(() => {
    if (!enabled || publicPhotos) return;
    const controller = new AbortController();
    apiJson<TourismSearchResult>('/api/tourism/nopi-catalog', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) })
      .then(result => {
        if (controller.signal.aborted) return;
        publicPhotos = Object.fromEntries(result.items.map(place => [place.contentId, { imageUrl: place.imageUrl, imageLicense: place.imageLicense }]));
        setPhotos(publicPhotos);
      }).catch(() => { /* A photo outage must not block editing a saved trip. */ });
    return () => controller.abort();
  }, [enabled]);
  return photos;
}

