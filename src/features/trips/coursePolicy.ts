import type { TripDay, TripDocument } from './tripModel';

export const courseDistanceLimit = (transport: TripDocument['transport']) => transport === 'walk' ? 1000 : transport === 'car' ? 7000 : 0;
export const courseDistanceLabel = (transport: TripDocument['transport']) => transport === 'walk' ? '도보 1km' : transport === 'car' ? '차량 7km' : '대중교통';
export const effectiveTransport = (trip: TripDocument, day: TripDay) => day.transport ?? trip.transport;
// An unchanged default stays inherited. Only intentional per-day differences override it.
export function withDayTransport(day: TripDay, transport: TripDocument['transport'], defaultTransport: TripDocument['transport']): TripDay {
  const next = { ...day };
  if (transport === defaultTransport) delete next.transport;
  else next.transport = transport;
  return next;
}
