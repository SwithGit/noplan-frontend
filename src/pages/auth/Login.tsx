import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createOAuthState } from '../../api/authApi';
import { DesktopNav } from '../../components/ui/DesktopNav';
import { LanguageSelect } from '../../i18n/LanguageSelect';
import { useLocale } from '../../i18n/locale';
import { t as uiText } from '../../i18n/translate';
import { ROUTES } from '../../routes';
import coast from '../../assets/travel/coastal-escape.webp';
import nopi from '../../assets/nopi/nopi-welcome.png';
import kakao from '../../assets/auth/kakao.png';
import google from '../../assets/auth/google.png';
import '../../styles/app-layout.css';
import './login.css';

interface LoginProps {
  onLoginSuccess: (id: string, profileUrl: string | null, nickname: string) => void;
  onGoToSignup: () => void;
}

function Login({ onLoginSuccess, onGoToSignup }: LoginProps) {
  useLocale();
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);

  const beginRequest = () => {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    setError('');
    return true;
  };
  const endRequest = () => { busy.current = false; setPending(false); };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!beginRequest()) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_APP_API_URL}/api/auth/login`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, pw }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        onLoginSuccess(result.user.id, result.user.profileURL, result.user.nickname);
      } else {
        setError(result.message || '로그인하지 못했어요. 아이디와 비밀번호를 확인해 주세요.');
      }
    } catch {
      setError('연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally { endRequest(); }
  };

  const handleSocialLogin = async (provider: 'kakao' | 'google') => {
    if (!beginRequest()) return;
    try {
      const state = await createOAuthState(provider);
      const params = new URLSearchParams({
        client_id: provider === 'kakao' ? import.meta.env.VITE_KAKAO_REST_API_KEY : import.meta.env.VITE_GOOGLE_CLIENT_ID,
        redirect_uri: provider === 'kakao' ? import.meta.env.VITE_KAKAO_REDIRECT_URI : import.meta.env.VITE_GOOGLE_REDIRECT_URI,
        response_type: 'code', state,
      });
      if (provider === 'google') params.set('scope', 'email profile');
      window.location.href = `${provider === 'kakao' ? 'https://kauth.kakao.com/oauth/authorize' : 'https://accounts.google.com/o/oauth2/v2/auth'}?${params.toString()}`;
    } catch {
      setError(provider === 'kakao' ? '카카오 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.' : '구글 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      endRequest();
    }
  };

  return <div className="app-shell login-page">
    <DesktopNav />
    <header className="login-mobile-header">
      <button type="button" className="login-back" aria-label={uiText('뒤로 가기')} onClick={() => {
        if (window.history.state?.idx > 0) navigate(-1); else navigate(ROUTES.appHome);
      }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 4-8 8 8 8" /></svg></button>
      <Link to={ROUTES.appHome} className="login-wordmark" aria-label={uiText('NoPlan 홈')}>noplan</Link>
      <LanguageSelect />
    </header>
    <main className="login-layout">
      <aside className="login-visual" aria-label={uiText('노플랜과 함께')}>
        <img className="login-coast" src={coast} alt="" />
        <div className="login-visual-copy">
          <p className="login-eyebrow">LESS PLANNING, MORE MEMORIES.</p>
          <h2>{uiText('계획은 가볍게,')}<br />{uiText('여행은 나답게.')}</h2>
          <p className="login-visual-description">{uiText('가고 싶은 곳만 떠올려 보세요.')}<br />{uiText('나머지는 노플랜이 함께할게요.')}</p>
        </div>
        <span className="login-location"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>{uiText('나의 다음 여행')}</span>
      </aside>
      <section className="login-content" aria-labelledby="login-title">
        <div className="login-intro">
          <p className="login-eyebrow login-desktop-welcome">WELCOME TO NOPLAN</p>
          <p className="login-mobile-welcome">{uiText('노플랜과 함께')}</p>
          <h1 id="login-title">{uiText('다시 만나 반가워요')}</h1>
          <p className="login-subtitle">{uiText('로그인하고 나만의 여행을 이어가세요.')}</p>
          <img className="login-mascot" src={nopi} alt="" />
        </div>
        <div className="login-card">
          <form onSubmit={handleLogin} aria-busy={pending}>
            <label className="login-field" htmlFor="login-id">{uiText('아이디')}
              <input id="login-id" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required placeholder={uiText('아이디를 입력해 주세요')} value={id} onChange={event => setId(event.target.value)} />
            </label>
            <label className="login-field" htmlFor="login-password">{uiText('비밀번호')}</label>
            <div className="login-password">
              <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required placeholder={uiText('비밀번호를 입력해 주세요')} value={pw} onChange={event => setPw(event.target.value)} />
              <button type="button" aria-label={uiText(showPassword ? '비밀번호 숨기기' : '비밀번호 보기')} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{showPassword && <path d="m3 3 18 18" />}</svg>
              </button>
            </div>
            {error && <p className="login-error" role="alert">{uiText(error)}</p>}
            <button className="login-submit" type="submit" disabled={pending}>{uiText(pending ? '로그인 중…' : '로그인')}</button>
          </form>
          <p className="login-signup">{uiText('아직 회원이 아니신가요?')} <button type="button" onClick={onGoToSignup}>{uiText('회원가입')}</button></p>
          <div className="login-divider"><span>{uiText('또는 간편하게 시작하기')}</span></div>
          <div className="login-socials">
            <button type="button" disabled={pending} onClick={() => void handleSocialLogin('kakao')}><img src={kakao} alt="" width="72" height="72" /><span>{uiText('카카오로 시작하기')}</span></button>
            <button type="button" disabled={pending} onClick={() => void handleSocialLogin('google')}><img src={google} alt="" width="72" height="72" /><span>{uiText('Google로 시작하기')}</span></button>
          </div>
        </div>
      </section>
    </main>
    <footer className="login-footer"><span className="login-desktop-footer">© NoPlan. All rights reserved.</span><span className="login-mobile-footer">{uiText('계획 없어도 좋은 하루, 노플랜')}</span></footer>
  </div>;
}

export default Login;
