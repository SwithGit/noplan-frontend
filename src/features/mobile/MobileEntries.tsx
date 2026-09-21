import type { UserSession } from '../../types/noplan';
import { DomesticCourseExplore } from '../explore/DomesticCourseExplore';
import { DesktopAccount } from '../my/DesktopAccount';
import { MobileExplore } from './MobileExplore';
import { MobileMy } from './MobileMy';
import { useDesktop } from './useDesktop';
import './mobile.css';
export function ExploreEntry(){const desktop=useDesktop();return desktop ? <DomesticCourseExplore /> : <MobileExplore active />;}
export function MyEntry({user,onLogout}:{user:UserSession|null;onLogout:()=>void}){const desktop=useDesktop();return desktop ? <DesktopAccount user={user} onLogout={onLogout}/> : <MobileMy key={user?.userId||'guest'} active user={user} onLogout={onLogout}/>;}
