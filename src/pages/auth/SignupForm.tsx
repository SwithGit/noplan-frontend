import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { checkSignupId, completeSignup, getSignupOptions, sendSignupCode, verifySignupCode, type SignupOptions, type SignupProfile, type SignupProvider } from '../../api/signupApi';
import { storeLoggedInUser } from '../../api/client';
import { DesktopNav } from '../../components/ui/DesktopNav';
import { LanguageSelect } from '../../i18n/LanguageSelect';
import { useLocale } from '../../i18n/locale';
import { t } from '../../i18n/translate';
import { ROUTES } from '../../routes';
import nopi from '../../assets/nopi/nopi-welcome.png';
import '../../styles/app-layout.css';
import './login.css';
import './signup.css';

function PasswordField({ label, name, value, onChange, confirmation }: { label: string; name: string; value: string; onChange: (value: string) => void; confirmation?: string }) {
  const [visible, setVisible] = useState(false);
  return <div className="signup-field"><label htmlFor={name}>{t(label)}</label><div className="login-password">
    <input id={name} name={name} type={visible ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={128} value={value} placeholder={t(label === '비밀번호' ? '비밀번호를 입력해 주세요' : '비밀번호를 다시 입력해 주세요')} onChange={e => onChange(e.target.value)} aria-describedby={`${name}-hint`} />
    <button type="button" aria-label={t(visible ? '비밀번호 숨기기' : '비밀번호 보기')} aria-pressed={visible} onClick={() => setVisible(v => !v)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{visible && <path d="m3 3 18 18"/>}</svg></button>
  </div><small id={`${name}-hint`} className={confirmation !== undefined && value && confirmation !== value ? 'signup-invalid' : ''}>{t(confirmation === undefined ? '8~128자로 입력해 주세요.' : !value ? '비밀번호를 한 번 더 입력해 주세요.' : value === confirmation ? '비밀번호가 일치해요.' : '비밀번호가 일치하지 않아요.')}</small></div>;
}

function PolicyDialog({ title, url, close }: { title: string; url: string; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = ref.current; const previous = document.activeElement as HTMLElement; element?.showModal(); return () => { element?.close(); previous?.focus(); }; }, []);
  return <dialog ref={ref} className="signup-policy-dialog" aria-label={t(title)} onCancel={e => { e.preventDefault(); close(); }}><header><h2>{t(title)}</h2><button type="button" onClick={close} aria-label={t('닫기')}>×</button></header>
    <p>{t(url ? '동의하기 전에 문서 내용을 확인해 주세요.' : '약관을 준비하고 있어요. 준비가 완료되면 가입할 수 있어요.')}</p>
    {url && <a href={url} target="_blank" rel="noopener noreferrer">{t('문서 새 창에서 보기')} ↗</a>}
    <button type="button" className="signup-outline" onClick={close}>{t('확인')}</button>
  </dialog>;
}

export function SignupForm({ provider, profile = {}, registrationToken, onGoToLogin }: { provider?: SignupProvider; profile?: SignupProfile; registrationToken?: string; onGoToLogin?: () => void }) {
  useLocale();
  const navigate = useNavigate();
  const [fields, setFields] = useState({ id: '', pw: '', confirm: '', name: profile.name || '', nickname: profile.nickname || '', email: profile.email || '', phone: (profile.phone || '').replace(/\D/g, ''), birthdate: profile.birthdate || '', gender: profile.gender || '' });
  const [options, setOptions] = useState<SignupOptions | null>(null);
  const [optionsError, setOptionsError] = useState(false);
  const [checkedId, setCheckedId] = useState('');
  const [idMessage, setIdMessage] = useState('');
  const [challenge, setChallenge] = useState<{ challengeId: string; phone: string; expiresAt: number; retryAt: number } | null>(null);
  const [code, setCode] = useState('');
  const [proof, setProof] = useState<{ phoneToken: string; phone: string; expiresAt: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [agreements, setAgreements] = useState({ terms: false, privacy: false, marketing: false });
  const [policy, setPolicy] = useState<'terms' | 'privacy' | 'marketing' | null>(null);
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const busy = useRef(false);
  const idRef = useRef('');
  const phoneRef = useRef(fields.phone);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const loadOptions = () => { setOptionsError(false); return getSignupOptions().then(setOptions).catch(() => setOptionsError(true)); };
  useEffect(() => { let live = true; getSignupOptions().then(v => { if (live) setOptions(v); }).catch(() => { if (live) setOptionsError(true); }); return () => { live = false; }; }, []);
  useEffect(() => { if (!challenge && !proof) return; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, [challenge, proof]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  const update = (key: keyof typeof fields, value: string) => {
    setFields(previous => ({ ...previous, [key]: value }));
    if (key === 'id') { idRef.current = value; setCheckedId(''); setIdMessage(''); }
    if (key === 'phone') { phoneRef.current = value; setChallenge(null); setProof(null); setCode(''); }
  };
  const run = async (action: string, task: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true; setPending(action); setError('');
    try { await task(); } catch (cause) { setError(cause instanceof Error ? cause.message : '연결하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
    finally { busy.current = false; setPending(''); }
  };
  const verified = proof && proof.phone === fields.phone && proof.expiresAt > now;
  const retrySeconds = challenge ? Math.max(0, Math.ceil((challenge.retryAt - now) / 1000)) : 0;
  const expiresSeconds = challenge ? Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000)) : 0;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  const labels = { terms: '[필수] 이용약관 동의', privacy: '[필수] 개인정보 수집·이용 동의', marketing: '[선택] 마케팅 정보 수신 동의' };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!provider && checkedId !== fields.id.trim()) { setError('아이디 중복 확인을 해 주세요.'); return; }
    if (!provider && fields.pw !== fields.confirm) { setError('비밀번호가 일치하지 않아요.'); return; }
    if (!verified) { setError('휴대폰 인증을 완료해 주세요.'); return; }
    if (!agreements.terms || !agreements.privacy) { setError('필수 약관에 동의해 주세요.'); return; }
    if (!options?.available) { setError('가입 서비스를 준비하고 있어요. 잠시 후 다시 방문해 주세요.'); return; }
    void run('submit', async () => {
      const result = await completeSignup({ name: fields.name, nickname: fields.nickname, email: fields.email, phone: fields.phone, birthdate: fields.birthdate, gender: fields.gender, id: provider ? undefined : fields.id.trim(), pw: provider ? undefined : fields.pw, registrationToken, phoneToken: proof!.phoneToken, agreements: { ...agreements, version: options.policyVersion } }, provider);
      storeLoggedInUser(result.user);
      window.location.assign(ROUTES.appHome);
    });
  };
  return <div className="app-shell login-page signup-page"><DesktopNav/>
    <header className="login-mobile-header"><button type="button" className="login-back" aria-label={t('뒤로 가기')} onClick={() => onGoToLogin ? onGoToLogin() : navigate(ROUTES.login)}>‹</button><Link className="login-wordmark" to={ROUTES.appHome}>noplan</Link><LanguageSelect/></header>
    <main className="signup-layout"><div className="signup-welcome"><div><p>{t('노플랜과 함께')}</p><h1>{t('반가워요, 여행 친구!')}</h1><span>{t('나만의 여행을 시작해 보세요.')}</span></div><img src={nopi} alt=""/></div>
      <section className="signup-card" aria-labelledby="signup-title"><header className="signup-title"><h2 id="signup-title">{t(provider ? '추가 정보 입력' : '회원가입')}</h2><p>{t(provider ? '소셜 계정으로 연결했어요. 부족한 정보만 알려주세요.' : '나만의 여행을 시작해 보세요.')}</p></header>
        {optionsError ? <div className="signup-notice" role="status">{t('가입 정보를 불러오지 못했어요.')} <button type="button" onClick={() => void loadOptions()}>{t('다시 시도')}</button></div> : options && !options.available && <p className="signup-notice" role="status">{t('가입 서비스를 준비하고 있어요. 잠시 후 다시 방문해 주세요.')}</p>}
        <form onSubmit={submit} aria-busy={!!pending}>
          {!provider && <><div className="signup-field"><label htmlFor="signup-id">{t('아이디')}</label><div className="signup-input-action"><input id="signup-id" name="username" required minLength={3} maxLength={64} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder={t('아이디를 입력해 주세요')} value={fields.id} onChange={e => update('id', e.target.value)} aria-describedby="signup-id-hint"/><button className="signup-outline" type="button" disabled={!!pending || !/^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/.test(fields.id)} onClick={() => void run('id', async () => { const value = fields.id; const result = await checkSignupId(value); if (idRef.current !== value) return; setCheckedId(result.available ? value : ''); setIdMessage(result.available ? '사용할 수 있는 아이디예요.' : '이미 사용 중인 아이디입니다.'); })}>{t(pending === 'id' ? '확인 중…' : '중복 확인')}</button></div><small id="signup-id-hint" role="status" className={checkedId ? 'signup-valid' : ''}>{t(idMessage || '영문·숫자·밑줄·하이픈 3~64자')}</small></div>
          <PasswordField label="비밀번호" name="signup-password" value={fields.pw} onChange={v => update('pw', v)}/><PasswordField label="비밀번호 확인" name="signup-confirm" value={fields.confirm} onChange={v => update('confirm', v)} confirmation={fields.pw}/></>}
          <div className="signup-field"><label htmlFor="signup-email">{t('이메일')}</label><input type="email" id="signup-email" name="email" required maxLength={254} autoComplete="email" placeholder={t('이메일을 입력해 주세요')} value={fields.email} onChange={e => update('email', e.target.value)}/></div>
          <div className="signup-field"><label htmlFor="signup-name">{t('이름')}</label><input id="signup-name" name="name" required maxLength={50} autoComplete="name" placeholder={t('이름을 입력해 주세요')} value={fields.name} onChange={e => update('name', e.target.value)}/></div>
          <div className="signup-field"><label htmlFor="signup-nickname">{t('닉네임')}</label><input id="signup-nickname" name="nickname" required maxLength={30} autoComplete="nickname" placeholder={t('어떻게 불러드릴까요?')} value={fields.nickname} onChange={e => update('nickname', e.target.value)}/></div>
          <div className="signup-field"><label htmlFor="signup-phone">{t('휴대폰 번호')}</label><div className="signup-input-action"><input id="signup-phone" name="tel" type="tel" inputMode="tel" autoComplete="tel-national" required maxLength={11} placeholder="01012345678" value={fields.phone} onChange={e => update('phone', e.target.value.replace(/\D/g, ''))}/><button type="button" className="signup-outline" disabled={!!pending || !options?.phoneAvailable || !/^010\d{8}$/.test(fields.phone) || retrySeconds > 0 || !!verified} onClick={() => void run('send', async () => { const phone = fields.phone; const value = await sendSignupCode(phone); if (phoneRef.current !== phone) return; setNow(Date.now()); setChallenge({ ...value, phone }); setCode(''); setProof(null); })}>{verified ? t('인증 완료') : retrySeconds ? `${retrySeconds}s` : t(pending === 'send' ? '발송 중…' : challenge ? '재발송' : '인증번호 받기')}</button></div><small>{t('휴대폰 번호 하나로 계정 하나를 만들 수 있어요.')}</small></div>
          {challenge && !verified && <div className="signup-field"><label htmlFor="signup-code">{t('인증번호')} <span className="signup-timer">{Math.floor(expiresSeconds / 60)}:{String(expiresSeconds % 60).padStart(2, '0')}</span></label><div className="signup-input-action"><input id="signup-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder={t('숫자 6자리')} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}/><button type="button" className="signup-outline" disabled={!!pending || code.length !== 6 || expiresSeconds === 0} onClick={() => void run('verify', async () => { const phone = fields.phone; const result = await verifySignupCode(phone, challenge.challengeId, code); if (phoneRef.current !== phone) return; setProof({ ...result, phone }); setNow(Date.now()); })}>{t(pending === 'verify' ? '확인 중…' : '인증 확인')}</button></div><small role="status">{t(expiresSeconds ? '문자로 받은 인증번호를 입력해 주세요.' : '인증 시간이 만료됐어요. 인증번호를 다시 받아 주세요.')}</small></div>}
          {verified && <p className="signup-valid" role="status">✓ {t('휴대폰 인증이 완료됐어요.')}</p>}
          <div className="signup-field"><label htmlFor="signup-birthdate">{t('생년월일')} <small>{t('(선택)')}</small></label><input id="signup-birthdate" name="bday" type="date" autoComplete="bday" min={`${Number(today.slice(0, 4)) - 120}-01-01`} max={today} value={fields.birthdate} onChange={e => update('birthdate', e.target.value)}/></div>
          <fieldset className="signup-gender"><legend>{t('성별')} <small>{t('(선택)')}</small></legend><div>{[['male', '남성'], ['female', '여성'], ['', '선택 안 함']].map(([value, label]) => <label key={label}><input type="radio" name="gender" value={value} checked={fields.gender === value} onChange={() => update('gender', value)}/><span>{t(label)}</span></label>)}</div></fieldset>
          <p className="signup-demographics-hint">{t('생년월일과 성별은 맞춤 추천에 참고해요. 입력하지 않아도 가입할 수 있어요.')}</p>
          <fieldset className="signup-agreements"><legend className="signup-sr-only">{t('약관 동의')}</legend>
            <label className="signup-agree-all"><input type="checkbox" checked={agreements.terms && agreements.privacy && (!options?.documents.marketing || agreements.marketing)} disabled={!options?.available} onChange={e => setAgreements({ terms: e.target.checked, privacy: e.target.checked, marketing: !!options?.documents.marketing && e.target.checked })}/><strong>{t('전체 동의')}</strong></label>
            {(Object.keys(labels) as Array<keyof typeof labels>).map(key => <div className="signup-agreement" key={key}><label><input type="checkbox" checked={agreements[key]} disabled={!options?.documents[key]} onChange={e => setAgreements(prev => ({ ...prev, [key]: e.target.checked }))}/><span>{t(labels[key])}</span></label><button type="button" aria-label={`${t(labels[key])} · ${t('내용 보기')}`} onClick={() => setPolicy(key)}>›</button></div>)}
          </fieldset>
          {error && <p ref={errorRef} tabIndex={-1} className="login-error" role="alert">{t(error)}</p>}
          <button className="login-submit" type="submit" disabled={!!pending || !options?.available}>{t(pending === 'submit' ? '가입 중…' : '동의하고 가입하기')}</button>
        </form><p className="login-signup">{t('이미 계정이 있으신가요?')} <Link to={ROUTES.login}>{t('로그인')}</Link></p>
      </section>
    </main><footer className="login-footer">{t('계획 없어도 좋은 하루, 노플랜')}</footer>
    {policy && <PolicyDialog title={labels[policy]} url={options?.documents[policy] || ''} close={() => setPolicy(null)}/>}
  </div>;
}
