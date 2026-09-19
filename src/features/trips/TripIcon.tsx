export type TripIconName = 'plus' | 'arrow' | 'calendar' | 'pin' | 'spark' | 'check' | 'clock' | 'lock' | 'unlock' | 'close' | 'up' | 'down' | 'save' | 'map' | 'menu' | 'people' | 'transport' | 'person' | 'heart' | 'home' | 'briefcase' | 'train' | 'bus' | 'flight' | 'walk';
const paths: Record<TripIconName, string> = {
  person: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M5 21v-3a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v3Z',
  heart: 'M12 21 3.5 12.5a5.5 5.5 0 0 1 8-7.5l.5.5.5-.5a5.5 5.5 0 0 1 8 7.5Z',
  home: 'm3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8',
  briefcase: 'M8 7V3h8v4M3 7h18v14H3ZM3 12l9 3 9-3M12 12v5',
  train: 'M5 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v13H5ZM5 10h14M12 2v8M8 14h1m6 0h1M8 17l-3 5m11-5 3 5M7 20h10',
  bus: 'M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14H5ZM5 11h14M8 15h1m6 0h1M7 19v2m10-2v2M2 7v5m20-5v5',
  flight: 'm3 10 7 2 7-8c2-2 4-1 3 1l-7 9 1 7-3-2-1-4-4-1Z',
  walk: 'M14 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4M7 13l2-4 4-1 3 5 4 1M13 8l-2 7-5 6m5-6 5 2 1 5',

  people: 'M15 21H3v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4ZM9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M17 4a4 4 0 0 1 0 7m1 3a4 4 0 0 1 3 4v3',
  transport: 'm5 9 2-5h10l2 5M3 10h18v9H3ZM5 19v2m14-2v2M6 13h2m8 0h2',
  plus: 'M12 5v14M5 12h14', arrow: 'M4 12h16m-6-6 6 6-6 6', calendar: 'M7 3v4m10-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z',
  pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6', spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z',
  check: 'm5 12 4 4L19 6', clock: 'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5ZM12 14v3', unlock: 'M7 10V7a5 5 0 0 1 9-3M5 10h14v11H5ZM12 14v3',
  close: 'm6 6 12 12M6 18 18 6', up: 'm6 15 6-6 6 6', down: 'm6 9 6 6 6-6', save: 'M4 3h13l4 4v14H3V3ZM7 3v6h9V3M7 21v-8h10v8', map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16M15 5v16', menu: 'M5 7h14M5 12h14M5 17h14',
};
export function TripIcon({ name }: { name: TripIconName }) { return <svg className="trip-icon" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={paths[name]} /></svg>; }
