import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { enterStampCard, EVENT_RETURN, getStamps, startEventSession, redeemEventReward, type StampState } from '../../api/stampEventApi';
import type { UserSession } from '../../types/noplan';
import { ROUTES } from '../../routes';
import { EventDialog } from './EventDialog';
import { EventGuide } from './EventGuide';
import { EventScanner } from './EventScanner';
import { STAMP_IDS, stampImage } from './eventModel';
import './stampEvent.css';

export function StampEventPage({ user }: { user: UserSession | null }) {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isCard = location.pathname === '/event/stamps' || id !== undefined;
  const invalid = id !== undefined && !/^[1-5]$/.test(id);
  const [state, setState] = useState<StampState>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [modal, setModal] = useState<'start' | 'guide' | 'scan' | null>(null);
  const notice = (location.state as { stampNotice?: string } | null)?.stampNotice;

  useEffect(() => {
    if (!isCard || invalid) return;
    let cancelled = false;
    setBusy(true); setError('');
    enterStampCard(user?.userId || 'guest', id ? Number(id) : undefined).then(result => {
      if (cancelled) return;
      setState(result);
      if (id) navigate('/event/stamps', { replace: true, state: { stampNotice: result.alreadyCollected ? '이미 만난 노피예요. 다른 노피를 찾아보세요!' : `노피 ${id} 스탬프를 찍었어요!` } });
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : '스탬프를 불러오지 못했어요.'); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [isCard, invalid, id, user?.userId, navigate, reload]);

  useEffect(() => {
    if (!isCard || invalid) return;
    let cancelled = false;
    const refresh = () => { if (!document.hidden) void getStamps().then(result => { if (!cancelled) setState(result); }).catch(() => undefined); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { cancelled = true; window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [isCard, invalid]);

  const begin = async () => {
    setBusy(true); setError('');
    try { await startEventSession(); setModal(null); navigate('/event/stamps'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '참여를 시작하지 못했어요.'); setModal(null); }
    finally { setBusy(false); }
  };
  const login = () => {
    try { sessionStorage.setItem(EVENT_RETURN, '/event/stamps'); } catch { /* The event banner remains available on home. */ }
    navigate(ROUTES.login);
  };
  const redeem = async () => {
    if (busy || !state?.complete || state.redeemedAt) return;
    setBusy(true); setError('');
    try { setState(await redeemEventReward()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '수령 완료를 저장하지 못했어요. 다시 눌러 주세요.'); }
    finally { setBusy(false); }
  };
  const count = state?.stamps.length || 0;
  const complete = Boolean(state?.complete);
  const redeemed = Boolean(state?.redeemedAt);
  return <main className="nopi-event-page">
    <header className="ne-top"><Link to={isCard ? '/event' : ROUTES.appHome} aria-label="뒤로 가기">‹</Link><strong>{isCard ? '내 스탬프' : '노피를 찾아라'}</strong><Link to={ROUTES.appHome} aria-label="홈으로">⌂</Link></header>
    <div className="ne-content">
      {invalid ? <section className="ne-panel ne-invalid"><h1>노피 QR을 다시 확인해 주세요</h1><p>행사장에 있는 노피 1~5번 QR코드로 참여할 수 있어요.</p><Link className="ne-primary" to="/event">이벤트 안내 보기</Link></section> : <>
        <section className={`ne-hero ${isCard ? 'ne-card-hero' : ''}`}>
          <div><span className="ne-tag">{isCard ? redeemed ? '수령 완료' : complete ? '스탬프 수집 완료' : '노피와 함께하는 스탬프 여행' : '강동해변으로 가요'}</span>
            <h1>{isCard ? complete ? <>노피를<br /><em>모두 찾았어요!</em></> : count ? <>{count}명의 노피를<br /><em>찾았어요!</em></> : <>첫 번째 노피를<br /><em>만나볼까요?</em></> : <>구석구석에<br />숨어 있는 노피를<br /><em>찾아라!</em></>}</h1>
            <p>{isCard ? complete ? '5개의 스탬프를 모두 모았어요.' : count ? `이제 남은 노피 ${5 - count}명을 찾아보세요.` : '행사장의 노피 QR을 찍어 주세요.' : <>5명의 노피를 만나<br />스탬프를 모아보세요.</>}</p>
          </div><div className="ne-hero-art"><img src={isCard ? '/images/stamp-event/hello.webp' : '/images/stamp-event/hero.webp'} alt={isCard ? '반갑게 인사하는 노피' : '스탬프 카드를 들고 있는 노피'} /></div>
        </section>
        {error && <div className="ne-error" role="alert"><p>{error}</p><button type="button" className="ne-secondary" onClick={() => isCard ? setReload(value => value + 1) : void begin()}>다시 시도하기</button></div>}
        {isCard ? <>
          {busy && <p className="ne-note" role="status">스탬프를 확인하고 있어요…</p>}
          {notice && !busy && !error && <p className="ne-notice" role="status">✓ {notice}</p>}
          {state && <>
            <section className="ne-panel ne-stamp-card" aria-label="나의 스탬프">
              <header><h2>✧ 나의 스탬프</h2><strong>{count} / 5</strong></header>
              <progress max={5} value={count} aria-label={`스탬프 ${count}개 수집`} />
              <div className="ne-stamp-grid">{STAMP_IDS.map(stamp => { const collected = state.stamps.includes(stamp); return <div key={stamp} className={`ne-stamp ${collected ? 'collected' : ''}`}><div className="ne-stamp-circle">{collected ? <img src={stampImage(stamp)} alt={`노피 ${stamp} 스탬프`} /> : <span aria-hidden="true">?</span>}</div><strong>노피 {stamp}</strong><small>{collected ? '✓ 수집 완료' : '아직 못 만났어요'}</small></div>; })}</div>
            </section>
            {complete ? <section className={`ne-completion ${redeemed ? 'redeemed' : ''}`}>
              <h2>{redeemed ? '경품 수령을 완료했어요!' : '미션 완료!'}</h2>
              <p>{redeemed ? '노피와 함께해 주셔서 고마워요.' : <>노플랜 부스에서 이 화면을 보여주고<br />경품 뽑기에 참여해 보세요.</>}</p>
              {!redeemed && <><p className="ne-note">아래 버튼은 부스에서 직원이 눌러 주세요.</p><button type="button" className="ne-primary" disabled={busy} onClick={() => void redeem()}>{busy ? '저장 중…' : '수령 완료'}</button></>}
            </section> : <><p className="ne-note">부스 주변에 숨어 있는 다른 노피의 QR을 찍어 주세요.</p><button className="ne-primary" disabled={busy} type="button" onClick={() => setModal('scan')}>⌗ 다음 노피 QR 찍기</button></>}
            <button className="ne-secondary" type="button" onClick={() => setModal('guide')}>✧ 참여 방법 보기</button>
            <p className="ne-note">같은 노피는 한 번만 적립돼요.</p>
            {!user && <div className="ne-save-note"><p>비회원 기록은 같은 브라우저에서 이어져요.<br />로그인하면 모은 스탬프를 계정에 보관할 수 있어요.</p><button type="button" onClick={login}>로그인하고 이어가기 →</button></div>}
            {complete && <Link className="ne-secondary" to={ROUTES.appHome}>노플랜 둘러보기 →</Link>}
          </>}
        </> : <>
          <button className="ne-primary ne-start" type="button" disabled={busy} onClick={() => user ? void begin() : setModal('start')}>✧ 스탬프 시작하기 <span>→</span></button>
          <p className="ne-note">로그인 없이도 가볍게 참여해요.</p>
          <section className="ne-panel ne-how"><h2>✧ 참여 방법</h2><ol><li><span>01</span><div><strong>부스 주변의 노피 찾기</strong><p>리플렛을 보고 숨은 노피를 찾아요.</p></div></li><li><span>02</span><div><strong>QR을 찍고 스탬프 모으기</strong><p>서로 다른 노피 5명을 만나보세요.</p></div></li><li><span>03</span><div><strong>5개를 모으면 부스로!</strong><p>직원 확인 후 경품 뽑기에 참여해요.</p></div></li></ol><button className="ne-secondary" type="button" onClick={() => setModal('guide')}>참여 방법 자세히 보기 →</button></section>
          <Link className="ne-text-link" to="/event/stamps">이미 참여 중인가요? 내 스탬프 보기 →</Link>
        </>}
      </>}
      <footer className="ne-footer">오늘의 작은 발견, noplan</footer>
    </div>
    {modal === 'start' && <EventDialog title="스탬프 시작하기" onClose={() => setModal(null)}><p className="ne-dialog-copy">시작 방법을 선택해 주세요.</p><button type="button" disabled={busy} className="ne-secondary" onClick={() => void begin()}>{busy ? '시작하고 있어요…' : '비회원으로 시작하기'}</button><button type="button" disabled={busy} className="ne-primary" onClick={login}>로그인하여 시작하기</button><p className="ne-note">비회원도 모든 스탬프를 모으고<br />경품 뽑기에 참여할 수 있어요.</p></EventDialog>}
    {modal === 'guide' && <EventGuide onClose={() => setModal(null)} />}
    {modal === 'scan' && <EventScanner onClose={() => setModal(null)} onScan={stamp => { setModal(null); navigate(`/event/${stamp}`); }} />}
  </main>;
}
