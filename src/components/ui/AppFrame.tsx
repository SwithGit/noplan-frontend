import { t as uiText } from '../../i18n/translate';
import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import { DesktopNav } from './DesktopNav';
import '../../styles/app-layout.css';

interface AppFrameProps {
  children: ReactNode;
  hideNav?: boolean;
}

export function AppFrame({ children, hideNav = false }: AppFrameProps) {
  return (
    <div className={`app-shell${hideNav ? ' app-shell-focused' : ''}`}>
      <a className="app-skip-link" href="#app-content">{uiText("본문으로 건너뛰기")}</a>
      <DesktopNav />
      <div className="app-frame">
        {/* One mounted content tree: resizing never resets page or planner state. */}
        <main className={`screen ${hideNav ? 'without-nav' : ''}`} id="app-content" tabIndex={-1}>{children}</main>
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
}
