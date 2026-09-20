import { orderedBlocks, routePoint } from './dayRouteModel';
import type { TripDocument, TripPlace } from './tripModel';

export function overviewDays(document: TripDocument) {
  return document.days.map((day, index) => {
    const stops = orderedBlocks(day).flatMap(block => block.places.map((place, placeIndex) => ({
      id: `${day.id}:${block.id}:${place.id}:${placeIndex}`,
      place,
      time: placeIndex === 0 ? `${block.startTime} — ${block.endTime}` : '',
      blockTitle: block.title,
    }))).map((stop, index) => ({ ...stop, number: index + 1 }));
    const points = stops.flatMap(stop => {
      const point = routePoint(stop.place);
      return point ? [{ ...point, id: stop.id, name: stop.place.name, number: stop.number }] : [];
    });
    return { day, number: index + 1, stops, points, hasMissingCoordinates: points.length < stops.length };
  });
}

export function overviewPlaceUrl(place: TripPlace) {
  return `https://map.naver.com/p/search/${encodeURIComponent(`${place.name} ${place.address}`.trim())}`;
}
