import { minutes, usedMinutes, type TripDay, type TripPlace } from './tripModel';

export type RoutePoint = { lat: number; lng: number };
export function routePoint(place?: TripPlace): RoutePoint | null {
  return place && typeof place.lat === 'number' && typeof place.lng === 'number'
    && Number.isFinite(place.lat) && Number.isFinite(place.lng)
    && place.lat >= 33 && place.lat <= 39 && place.lng >= 124 && place.lng <= 132
    ? { lat: place.lat, lng: place.lng } : null;
}
export const orderedBlocks = (day: TripDay) => [...day.blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
export function dayRouteLegs(day: TripDay) {
  const blocks = orderedBlocks(day).filter(block => block.places.length);
  return blocks.slice(1).map((next, index) => {
    const previous = blocks[index], from = previous.places.at(-1)!, to = next.places[0];
    // Reserve the full time slot. Overruns reduce the gap before the next slot.
    const departure = Math.max(minutes(previous.endTime), minutes(previous.startTime) + usedMinutes(previous));
    const origin = routePoint(from), destination = routePoint(to);
    return { id: `${previous.id}:${next.id}`, previousId: previous.id, nextId: next.id, from, to,
      origin, destination, departure, availableMinutes: minutes(next.startTime) - departure,
      key: JSON.stringify([origin, destination]) };
  });
}

// Time slots keep their identities; move a complete outing, including nearby stops.
export function moveDayOuting(day: TripDay, blockId: string, offset: -1 | 1): TripDay {
  const blocks = orderedBlocks(day), index = blocks.findIndex(block => block.id === blockId);
  if (index < 0 || !blocks[index + offset]) return day;
  const a = blocks[index], b = blocks[index + offset];
  const moveInto = (slot: typeof a, outing: typeof a) => ({ ...slot, area: outing.area, notes: outing.notes,
    places: outing.places.map(place => ({ ...place, travelMinutes: undefined })) });
  return { ...day, blocks: day.blocks.map(block => block.id === a.id ? moveInto(a, b) : block.id === b.id ? moveInto(b, a) : block) };
}
