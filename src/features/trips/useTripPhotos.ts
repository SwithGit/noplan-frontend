import { useEffect, useState } from 'react';
import { apiJson } from '../../api/client';
import type { TripDocument } from './tripModel';
import type { TripPhotos } from './TripPlacePhoto';

const publicPhotos: TripPhotos = {};

// Saved trips keep official content IDs; resolve their photos without rewriting
// the itinerary or storing personalized ranking data in this shared cache.
export function useTripPhotos(document?: TripDocument) {
  const ids = [...new Set(document?.days.flatMap(day => day.blocks.flatMap(block => block.places.flatMap(place => place.tourism ? [place.tourism.contentId] : []))) || [])].sort().join(',');
  const [photos, setPhotos] = useState<TripPhotos>({ ...publicPhotos });
  useEffect(() => {
    if (!ids) return;
    const controller = new AbortController();
    void (async () => {
      const missing = ids.split(',').filter(id => !publicPhotos[id]);
      for (let i = 0; i < missing.length; i += 100) {
        const result = await apiJson<{ items: { contentId: string; imageUrl?: string; imageLicense?: string }[] }>(`/api/tourism/photos?ids=${missing.slice(i, i + 100).join(',')}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
        if (controller.signal.aborted) return;
        result.items.forEach(place => { publicPhotos[place.contentId] = { imageUrl: place.imageUrl, imageLicense: place.imageLicense }; });
      }
      if (!controller.signal.aborted) setPhotos({ ...publicPhotos });
    })().catch(() => { /* A photo outage must not block editing a saved trip. */ });
    return () => controller.abort();
  }, [ids]);
  return photos;
}

