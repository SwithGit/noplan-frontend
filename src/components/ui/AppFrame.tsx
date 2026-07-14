import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface AppFrameProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function AppFrame({ children, hideNav = false }: AppFrameProps) {
  return (
    <div className="app-shell">
      <div className="phone-frame">
        <main className={`screen ${hideNav ? 'without-nav' : ''}`}>{children}</main>
        {!hideNav && <BottomNav />}
      </div>
    </div>
  );
}
