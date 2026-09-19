export type TripIconName = 'plus' | 'arrow' | 'calendar' | 'pin' | 'spark' | 'check' | 'clock' | 'lock' | 'unlock' | 'close' | 'up' | 'down' | 'save' | 'map' | 'menu' | 'people' | 'transport';
const paths: Record<TripIconName, string> = {
  people: 'M15 21H3v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4ZM9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M17 4a4 4 0 0 1 0 7m1 3a4 4 0 0 1 3 4v3',
  transport: 'm5 9 2-5h10l2 5M3 10h18v9H3ZM5 19v2m14-2v2M6 13h2m8 0h2',
  plus: 'M12 5v14M5 12h14', arrow: 'M4 12h16m-6-6 6 6-6 6', calendar: 'M7 3v4m10-4v4M4 10h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z',
  pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6', spark: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z',
  check: 'm5 12 4 4L19 6', clock: 'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5ZM12 14v3', unlock: 'M7 10V7a5 5 0 0 1 9-3M5 10h14v11H5ZM12 14v3',
  close: 'm6 6 12 12M6 18 18 6', up: 'm6 15 6-6 6 6', down: 'm6 9 6 6 6-6', save: 'M4 3h13l4 4v14H3V3ZM7 3v6h9V3M7 21v-8h10v8', map: 'm3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16M15 5v16', menu: 'M5 7h14M5 12h14M5 17h14',
};
export function TripIcon({ name }: { name: TripIconName }) { return <svg className="trip-icon" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d={paths[name]} /></svg>; }
