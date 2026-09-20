import { t } from '../../i18n/translate';
import nopi from '../../assets/nopi/nopi-icon.png';

/** Localized product illustration. The Korean page retains the original screenshots. */
export function LandingPhonePreview({variant='home'}:{variant?:'home'|'search'|'detail'|'result'}) {
  const searching=variant==='search',detail=variant==='detail',result=variant==='result';
  return <div className={`landing-phone-preview ${variant}`}>
    <div className="preview-status"><b>9:41</b><span>••• ▰</span></div>
    <div className="preview-brand">noplan <span>☰</span></div>
    <img src={nopi} alt=""/>
    <span className="preview-eyebrow">{t(searching?'코스 찾는 중':detail?'장소 정보':result?'추천코스':'오늘')}</span>
    <h3>{t(searching?'나에게 맞는 코스를 찾고 있어요':detail?'작은 발견, 좋은 하루':result?'우리다운 하루 코스':'오늘 어디 갈까요?')}</h3>
    <p>{t(searching?'취향과 이동 동선을 함께 확인해요.':'하고 싶은 일을 고르면 노피가 이어드려요.')}</p>
    {!searching&&!detail&&!result&&<><div className="preview-input">{t('친구와 조용히 이야기할 카페')} <b>↑</b></div><div className="preview-primary">{t('빠른 추천 받기')} →</div></>}
    <div className="preview-cards">{(searching?['장소','방문 시간','동행','취향','코스']:['맛집','카페','산책·명소']).map((label,i)=><div key={label}><span>{searching?'✓':i+1}</span><section><strong>{t(label)}</strong><small>{t(searching?'조건 확인':'가까운 곳부터, 가볍게')}</small></section></div>)}</div>
    <div className="preview-bottom">⌂ <span>⌕</span> ♡</div>
  </div>;
}
