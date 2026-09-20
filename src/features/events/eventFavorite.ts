import type { FavoriteInput } from '../mobile/mobileModel';
import { eventDate, eventKinds, type TravelEvent } from './eventModel';

// Use fields already persisted by the library API, including the provider ID.
export function eventFavorite(event: TravelEvent): FavoriteInput {
  const summary = `${eventDate(event.startDate)} — ${eventDate(event.endDate)}`;
  return { kind: 'place', title: event.title.slice(0, 255), location: event.address.slice(0, 500), places: [{
    id: `event:${event.id}`, title: event.title.slice(0, 255), name: event.title.slice(0, 255),
    type: 'event', category: eventKinds[event.kind], detailType: eventKinds[event.kind],
    address: event.address.slice(0, 500), summary,
    description: `${summary}\n${event.venue}\n${event.sourceLabel}${event.imageLicense ? ` · ${event.imageLicense}` : ''}`.slice(0, 2000),
    imageUrl: event.imageUrl, sourceUrl: event.sourceUrl,
    ...(event.lat != null && event.lng != null ? { lat: event.lat, lng: event.lng } : {}),
    reason: '', moveText: '', waitText: '', moodText: '', color: '', tags: [eventKinds[event.kind]],
  }] };
}

export function favoriteEventId(item: FavoriteInput): string | undefined {
  const place = item.kind === 'place' && item.places[0];
  return place && place.type === 'event' && place.id.startsWith('event:') ? place.id.slice(6) || undefined : undefined;
}
