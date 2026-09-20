import { useState } from 'react';
import { Link } from 'react-router-dom';
import { t as uiText } from '../../i18n/translate';
import { ROUTES } from '../../routes';
import { homeCourses, type HomeCourse } from '../trips/homeContent';
import { HomeCourseDetail } from '../trips/HomeDiscovery';
import { MobileIcon } from './MobileUi';
import { PlaceVisual } from '../../components/ui/PlaceVisual';

export function MobileTravelSuggestions({ guest = false }: { guest?: boolean }) {
  const [selected, setSelected] = useState<HomeCourse>();
  return <section className="m-travel-suggestions">
    <header><span className="m-kicker">TRAVEL INSPIRATION</span><h2>{uiText(guest ? '먼저 둘러볼까요?' : '조금 더 멀리 떠나볼까요?')}</h2><p>{uiText('한국관광공사가 소개하는 국내 여행 코스예요.')}</p></header>
    <div className="m-travel-grid">{homeCourses.slice(0, guest ? 3 : 4).map((course, index) => <button type="button" className={`m-travel-card ${index === 0 && guest ? 'featured' : ''}`} key={course.id} onClick={() => setSelected(course)}>
      <div className="m-travel-photo"><PlaceVisual imageUrl={course.image} type="hotplace" alt={uiText(course.imagePlace)}/><span><MobileIcon name="pin"/>{uiText(course.region)}</span></div>
      <div className="m-travel-copy"><h3>{uiText(course.title)}</h3><p>{uiText(course.description)}</p><small>{uiText(course.duration || '여유롭게 둘러보기')}</small></div>
      <span className="m-travel-credit">© 한국관광공사 · 공공누리 {uiText(course.license)}</span>
    </button>)}</div>
    {guest && <Link className="m-discovery-more" to={ROUTES.explore}>{uiText('인기 코스 더 보기')}<MobileIcon name="arrow"/></Link>}
    {selected && <HomeCourseDetail key={selected.id} course={selected} onClose={() => setSelected(undefined)}/>}
  </section>;
}
