import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '../../routes';
import { useDesktop } from './useDesktop';

// Match the same breakpoint as the home and navigation. Do not mount mobile
// course screens (or start their requests) on a desktop viewport.
export function MobileRoute() {
  return useDesktop() ? <Navigate replace to={ROUTES.appHome} /> : <Outlet />;
}
