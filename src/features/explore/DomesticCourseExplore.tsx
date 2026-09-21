import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTourismCourses, type TourismCourseList } from '../../api/tourismApi';
import { useLocale } from '../../i18n/locale';
import { t } from '../../i18n/translate';
import { HomeCourseCard, HomeCourseDetail } from '../trips/HomeDiscovery';
import type { HomeCourse } from '../trips/homeContent';
import nopiExplore from '../../assets/nopi/nopi-home.png';
import './domesticCourseExplore.css';

function toCourse(item: TourismCourseList['items'][number]): HomeCourse {
  const license = /^Type([1-4])$/.exec(item.imageLicense || '');
  return {
    id: item.contentId, region: item.regionName, title: item.name,
    description: item.description || item.address, duration: item.duration || '', stops: item.stops || [],
    image: item.imageUrl || '', imagePlace: item.imagePlace || item.name,
    license: license ? `${license[1]}유형` : item.imageLicense || '',
  };
}

export function DomesticCourseExplore() {
  const locale = useLocale();
  const [params, setParams] = useSearchParams();
  const [selected, setSelected] = useState<HomeCourse>();
  const [retry, setRetry] = useState(0);
  const [regions, setRegions] = useState<TourismCourseList['regions']>([]);
  const [result, setResult] = useState<{ key: string; data?: TourismCourseList; error?: boolean }>();
  const query = (params.get('q') || '').slice(0, 80);
  const region = params.get('region') || '';
  const rawPage = Number(params.get('page') || 1);
  const page = Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 3000 ? rawPage : 1;
  const key = JSON.stringify([region, query.trim(), page, retry]);
  const current = result?.key === key ? result : undefined;
  const data = current?.data;
  const loading = !current;

  useEffect(() => {
    const controller = new AbortController();
    // Cancel obsolete pages so a slow response cannot replace a new filter.
    const timer = window.setTimeout(() => {
      getTourismCourses(region, query.trim(), page, controller.signal, 'ko')
        .then(data => { if (!controller.signal.aborted) { setResult({ key, data }); setRegions(data.regions); } })
        .catch(() => { if (!controller.signal.aborted) setResult({ key, error: true }); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [region, query, page, key]);

  const update = (field: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(field, value); else next.delete(field);
    if (field !== 'page') next.delete('page');
    setSelected(undefined);
    setParams(next, { replace: field === 'q' });
  };
  const reset = () => {
    const next = new URLSearchParams(params);
    ['region', 'q', 'page'].forEach(field => next.delete(field));
    setParams(next);
  };
  const totalPages = data?.totalPages || 0;
  const activePage = data?.page || page;
  const firstPage = Math.max(1, Math.min(activePage - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => firstPage + i);
  const goToPage = (value: number) => {
    update('page', String(value));
    document.querySelector('.domestic-explore-heading')?.scrollIntoView({ block: 'start' });
  };

  return <section className="domestic-explore">
    <header className="domestic-explore-heading"><div><span>{t('여행 탐색')}</span><h1>{t('국내 여행 추천코스')}</h1><p>{t('다음 여행의 힌트, 한국관광공사가 소개하는 지역별 코스를 만나보세요.')}</p></div><img src={nopiExplore} alt="" /></header>
    <div className="domestic-explore-filters">
      <label htmlFor="domestic-course-search">{t('코스 검색')}</label>
      <input id="domestic-course-search" type="search" value={query} maxLength={80} placeholder={t('지역 또는 코스 이름 검색')} onChange={event => update('q', event.target.value)} />
      <nav aria-label={t('지역 선택')}>
        <button type="button" aria-pressed={!region} onClick={() => update('region', '')}>{t('전체')}</button>
        {regions.map(item => <button key={item.id} type="button" aria-pressed={region === item.id} onClick={() => update('region', item.id)}>{t(item.name)} <small>{item.count}</small></button>)}
      </nav>
    </div>
    <div aria-busy={loading}>
      {loading && <p className="domestic-explore-count" role="status">{t('여행 코스를 불러오고 있어요…')}</p>}
      {current?.error && <div className="domestic-explore-empty" role="alert"><p>{t('코스를 불러오지 못했어요. 다시 시도해 주세요.')}</p><button type="button" onClick={() => setRetry(value => value + 1)}>{t('다시 불러오기')}</button></div>}
      {data && <>
        {locale !== 'ko' && data.total > 0 && <p className="domestic-translation-note">{t('코스 정보는 한국어 원문으로 제공해요.')}</p>}
        <p className="domestic-explore-count" role="status">{t('추천코스')} · {data.total}{data.total > 0 && ` · ${(data.page - 1) * data.pageSize + 1}–${Math.min(data.page * data.pageSize, data.total)} / ${data.total}`}</p>
        {data.items.length ? <div className="home-courses-grid">{data.items.map(item => <HomeCourseCard key={`${locale}-${item.contentId}`} course={toCourse(item)} onSelect={setSelected} />)}</div> : <div className="domestic-explore-empty"><h2>{t('조건에 맞는 추천코스가 없어요.')}</h2><p>{t('다른 지역이나 검색어로 찾아보세요.')}</p><button type="button" onClick={reset}>{t('검색 초기화')}</button></div>}
        {totalPages > 1 && <nav className="domestic-explore-pagination" aria-label={t('코스 페이지')}>
          <button type="button" disabled={activePage === 1} onClick={() => goToPage(activePage - 1)}>{t('이전')}</button>
          {firstPage > 1 && <><button type="button" onClick={() => goToPage(1)}>1</button>{firstPage > 2 && <span>…</span>}</>}
          {pages.map(value => <button key={value} type="button" aria-current={value === activePage ? 'page' : undefined} onClick={() => goToPage(value)}>{value}</button>)}
          {pages[pages.length - 1] < totalPages && <>{pages[pages.length - 1] < totalPages - 1 && <span>…</span>}<button type="button" onClick={() => goToPage(totalPages)}>{totalPages}</button></>}
          <button type="button" disabled={activePage === totalPages} onClick={() => goToPage(activePage + 1)}>{t('다음')}</button>
        </nav>}
      </>}
    </div>
    {selected && <HomeCourseDetail key={selected.id} course={selected} onClose={() => setSelected(undefined)} />}
  </section>;
}
