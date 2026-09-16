import type { NavigationIconName } from './appNavigation';

export function NavigationIcon({ name }: { name: NavigationIconName }) {
  return (
    <svg aria-hidden="true" className="navigation-icon" fill="none" focusable="false" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
      {name === 'calendar' && <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-14 4h3m4 0h3m-10 3h3"/></>}
      {name === 'home' && <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>}
      {name === 'compass' && <><circle cx="12" cy="12" r="9" /><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z" /></>}
      {name === 'route' && <><circle cx="6" cy="6" r="3" /><circle cx="18" cy="18" r="3" /><path d="M12 6h4a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h4" /></>}
      {name === 'user' && <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>}
      {name === 'heart' && <path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/>}
    </svg>
  );
}
