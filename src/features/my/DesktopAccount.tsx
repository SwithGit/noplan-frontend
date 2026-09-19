import { Link } from 'react-router-dom';
import { ROUTES } from '../../routes';
import type { UserSession } from '../../types/noplan';
import nopi from '../../assets/nopi/nopi-icon.png';

export function DesktopAccount({ user, onLogout }: { user: UserSession | null; onLogout: () => void }) {
  if (!user) return <div className="my-screen logged-out-my-screen"><section className="login-empty"><img alt="" className="login-nopi" src={nopi} /><span className="eyebrow">나의 여행</span><h1>우리의 여행을 이어서 계획해요</h1><p>로그인하면 저장한 여행 일정을 다른 기기에서도 이어볼 수 있어요.</p><Link className="trip-button primary" to={ROUTES.login}>로그인하기</Link></section><Link className="trip-my-link" to={ROUTES.trips}><strong>내 여행 노트</strong><span>이 브라우저에서 만들던 여행 보기 →</span></Link></div>;
  return <div className="my-screen"><header className="my-compact-header"><div className="my-title-row"><h1>마이</h1></div><div className="my-profile-row"><div className="profile-avatar">{user.profileURL ? <img alt="" src={user.profileURL} /> : <span>{user.userNick.slice(0, 1)}</span>}</div><div><strong>{user.userNick}님</strong><p>{user.userId}</p></div></div></header><Link className="trip-my-link" to={ROUTES.trips}><strong>내 여행 노트</strong><span>날짜별 일정을 이어서 계획해요 →</span></Link><section className="my-settings-panel" aria-label="계정 설정"><span>계정 설정</span><button className="text-action" type="button" onClick={onLogout}>로그아웃</button></section></div>;
}
