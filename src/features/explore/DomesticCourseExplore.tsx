import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLocale } from '../../i18n/locale';
import { t } from '../../i18n/translate';
import { HomeCourseCard, HomeCourseDetail } from '../trips/HomeDiscovery';
import { homeCourses, type HomeCourse } from '../trips/homeContent';
import './domesticCourseExplore.css';

export function DomesticCourseExplore() {
  useLocale();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<HomeCourse>();
  const query = params.get('q') || '';
  const region = params.get('region') || '';
  const regions = [...new Set(homeCourses.map(course => course.region))];
  const keyword = query.trim().toLocaleLowerCase();
  const courses = homeCourses.filter(course => (!region || course.region === region) &&
    [course.title, course.region, course.description, ...course.stops].flatMap(value => [value, t(value)]).join(' ').toLocaleLowerCase().includes(keyword));
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };
  return <section className="domestic-explore">
    <header className="domestic-explore-heading"><span>{t('여행 탐색')}</span><h1>{t('국내 여행 추천코스')}</h1><p>{t('다음 여행의 힌트, 한국관광공사가 소개하는 지역별 코스를 만나보세요.')}</p></header>
    <div className="domestic-explore-filters">
      <label htmlFor="domestic-course-search">{t('코스 검색')}</label>
      <input id="domestic-course-search" type="search" value={query} maxLength={100} placeholder={t('지역, 코스 이름 또는 방문 장소 검색')} onChange={event => update('q', event.target.value)} />
      <nav aria-label={t('지역 선택')}><button type="button" aria-pressed={!region} onClick={() => update('region', '')}>{t('전체')}</button>{regions.map(item => <button key={item} type="button" aria-pressed={region === item} onClick={() => update('region', item)}>{t(item)}</button>)}</nav>
    </div>
    <p className="domestic-explore-count" role="status">{t('추천코스')} · {courses.length}</p>
    {courses.length ? <div className="home-courses-grid">{courses.map(course => <HomeCourseCard key={course.id} course={course} onSelect={setSelected} />)}</div> : <div className="domestic-explore-empty"><h2>{t('조건에 맞는 추천코스가 없어요.')}</h2><p>{t('다른 지역이나 검색어로 찾아보세요.')}</p><button type="button" onClick={() => { const next = new URLSearchParams(params); next.delete('region'); next.delete('q'); setParams(next, { replace: true }); }}>{t('검색 초기화')}</button></div>}
    {selected && <HomeCourseDetail key={selected.id} course={selected} onClose={() => setSelected(undefined)} />}
  </section>;
}
