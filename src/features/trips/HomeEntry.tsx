import { useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../routes';
import { PlannerHome } from '../planner/PlannerScreens';
import type { UserSession } from '../../types/noplan';
import { TripHome } from './TripHome';

const subscribe = (callback: () => void) => {
  const query = window.matchMedia('(min-width: 1024px)');
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
};
export function HomeEntry({ user }: { user: UserSession | null }) {
  const desktop = useSyncExternalStore(subscribe, () => window.matchMedia('(min-width: 1024px)').matches, () => false);
  // Keep both drafts mounted on resize; only the visible home requests location.
  return <><div className="desktop-trip-home"><TripHome key={user?.userId || 'guest'} user={user} /></div><div className="mobile-quick-home"><PlannerHome active={!desktop} /><Link className="trip-my-link" to={ROUTES.trips}><strong>내 여행 노트</strong><span>PC에서 만든 여행을 이어보거나 새로운 여행을 계획해요.</span></Link></div></>;
}
