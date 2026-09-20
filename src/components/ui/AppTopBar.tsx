import { t as uiText } from '../../i18n/translate';
import { useNavigate } from 'react-router-dom';

interface AppTopBarProps {
  actionLabel?: string;
  onAction?: () => void;
  subtitle?: string;
  title: string;
}

export function AppTopBar({ actionLabel, onAction, subtitle, title }: AppTopBarProps) {
  const navigate = useNavigate();

  return (
    <header className="app-top-bar">
      <button aria-label={uiText("뒤로가기")} className="icon-button" type="button" onClick={() => navigate(-1)}>
        <span className="icon-chevron-left" />
      </button>
      <div className="top-title">
        <strong>{uiText(title)}</strong>
        {subtitle && <span>{uiText(subtitle)}</span>}
      </div>
      {actionLabel ? (
        <button className="soft-action" type="button" onClick={onAction}>
          {uiText(actionLabel)}
        </button>
      ) : (
        <span className="top-spacer" />
      )}
    </header>
  );
}
