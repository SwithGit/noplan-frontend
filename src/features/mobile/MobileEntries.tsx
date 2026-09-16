import type { UserSession } from '../../types/noplan';
import { ExploreTab } from '../explore/ExploreTab';
import { MyPageView } from '../my/MyPageView';
import { MobileExplore } from './MobileExplore';
import { MobileMy } from './MobileMy';
import { useDesktop } from './useDesktop';
import './mobile.css';
export function ExploreEntry(){const desktop=useDesktop();return <><div className="m-desktop-only"><ExploreTab active={desktop}/></div><div className="m-mobile-only"><MobileExplore active={!desktop}/></div></>;}
export function MyEntry({user,onLogout}:{user:UserSession|null;onLogout:()=>void}){const desktop=useDesktop();return <><div className="m-desktop-only"><MyPageView active={desktop} user={user} onLogout={onLogout}/></div><div className="m-mobile-only"><MobileMy key={user?.userId||'guest'} active={!desktop} user={user} onLogout={onLogout}/></div></>;}
