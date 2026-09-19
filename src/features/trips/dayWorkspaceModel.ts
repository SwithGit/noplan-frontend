import { clock, minutes, type TripDay, type TripPlace } from './tripModel';
import { orderedBlocks, routePoint } from './dayRouteModel';

export function workspaceStops(day: TripDay) {
  let number = 0;
  return orderedBlocks(day).flatMap(block => {
    let arrival = minutes(block.startTime);
    let provisional = false;
    return block.places.map((place, index) => {
      provisional ||= index > 0 && place.travelMinutes == null;
      arrival += place.travelMinutes ?? (index ? 15 : 0);
      const stop = { place, block, index, number: ++number, arrival, departure: arrival + place.durationMinutes, provisional };
      arrival = stop.departure;
      return stop;
    });
  });
}
export function workspaceLegs(day: TripDay) {
  const stops = workspaceStops(day);
  return stops.slice(1).map((stop, index) => ({ id: `${stops[index].place.id}:${stop.place.id}`, from: routePoint(stops[index].place), to: routePoint(stop.place), previous: stops[index], next: stop }));
}
export const workspaceTime = (value: number) => value >= 1440 ? `다음 날 ${clock(value % 1440)}` : clock(value);
export function removeWorkspacePlace(day: TripDay, place: TripPlace): TripDay {
  // Keep empty time slots available for a replacement and preserve other days.
  return { ...day, blocks: day.blocks.map(block => {
    if (!block.places.some(item => item.id === place.id)) return block;
    const places = block.places.filter(item => item.id !== place.id).map(item => ({ ...item, travelMinutes: undefined }));
    return { ...block, places, area: places[0]?.address || '' };
  }) };
}
