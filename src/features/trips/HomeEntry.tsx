import { MobileHome } from '../mobile/MobileHome';
import { useDesktop } from '../mobile/useDesktop';
import type { UserSession } from '../../types/noplan';
import { TripHome } from './TripHome';

export function HomeEntry({ user }: { user: UserSession | null }) {
  const desktop = useDesktop();
  // Keep both drafts mounted on resize; only the visible home requests location.
  return <><div className="desktop-trip-home"><TripHome key={user?.userId || 'guest'} user={user} /></div><div className="mobile-quick-home"><MobileHome key={user?.userId || 'guest'} active={!desktop} user={user}/></div></>;
}
