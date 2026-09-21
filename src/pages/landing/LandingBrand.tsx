import nopiIcon from '../../assets/nopi/nopi-icon.png';
import { t } from '../../i18n/translate';

export function LandingBrand() {
  return <a className="landing-wordmark" href="#top" aria-label={t('NoPlan 랜딩페이지 맨 위로 이동')}>
    <img src={nopiIcon} width="40" height="40" alt="" />
    <span>noplan<small>{t('일상에서 여행까지')}</small></span>
  </a>;
}
