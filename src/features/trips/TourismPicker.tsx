import { getPlaceSupport } from '../../api/travelSupportApi';
import { evaluateNeeds, hasTravelNeeds, type TravelSupport } from './travelNeeds';
import type { TravelNeeds } from './travelNeeds';
import { TravelSupportPanel } from './TravelSupportPanel';
import { TravelDiscovery } from './TravelDiscovery';
import { TourismText } from '../../i18n/TourismText';
import { useLocale } from '../../i18n/locale';
import { t as uiText } from '../../i18n/translate';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { searchTourism, type TourismAttraction, type TourismSearchResult, type TourismRankingOptions } from '../../api/tourismApi';
import { TripDialog } from './TripDialog';
import { TripIcon } from './TripIcon';
import { excludedPlace } from './placeIdentity';
import { TourismDetails } from './TourismDetails';
import './tourismPicker.css';

const categories = [{ id: '12', name: '관광지' }, { id: '14', name: '문화시설' }, { id: '28', name: '레포츠' }, { id: '25', name: '여행코스' }, { id: '38', name: '쇼핑' }, { id: '39', name: '음식점' }] as const;
type SearchQuery = TourismRankingOptions & { keyword: string; type: TourismAttraction['contentTypeId'] | 'all'; page: number };

function AttractionPhoto({ place, large = false }: { place: TourismAttraction; large?: boolean }) {
  const [failedUrl, setFailedUrl] = useState('');
  const available = place.imageUrl && failedUrl !== place.imageUrl;
  return <div className={`tourism-photo ${available ? '' : 'without-photo'} ${place.imageLicense === 'Type3' ? 'license-no-crop' : ''}`}>
    {available ? <img src={place.imageUrl} alt={place.name} loading={large ? 'eager' : 'lazy'} onError={() => setFailedUrl(place.imageUrl || '')} /> : <div className="tourism-photo-placeholder"><TripIcon name="map" /><span>{uiText("사진 준비 중")}</span><small>{uiText(place.type)}</small></div>}
    {available && <span className="tourism-photo-credit">{uiText("사진 © 한국관광공사")}{uiText(place.imageLicense === 'Type1' ? ' · 공공누리 1유형' : place.imageLicense === 'Type3' ? ' · 공공누리 3유형' : '')}</span>}
  </div>;
}

export function TourismPicker({ needs, destination, initial, initialDuration = 90, context, disabledPlaces = {}, onClose, onSelect, onDirectSearch }: {
  needs?: TravelNeeds; destination: string; initial?: TourismAttraction; initialDuration?: number; context: string; disabledPlaces?: Record<string, string>;
  onClose: () => void; onSelect: (place: TourismAttraction, duration: number) => void; onDirectSearch?: () => void;
}) {
  const regionKeyword = destination.trim();
  const locale = useLocale();
  const categoryOptions = [{ id: 'all', name: '전체' }, ...categories];
  // Keep the selected place in the detail panel, independently of the search.
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState<SearchQuery>({ keyword: '', destination: regionKeyword, type: 'all', page: 1, sort: 'recommended', profile: 'member' });
  const [response, setResponse] = useState<{ query: SearchQuery; locale: string; data?: TourismSearchResult; error?: string }>();
  const [selected, setSelected] = useState(initial);
  const [duration, setDuration] = useState(initialDuration);
  const [applyError, setApplyError] = useState('');
  const [detailExpanded, setDetailExpanded] = useState(false);
  const browsingPosition = useRef({ list: 0, detail: 0 });
  const resultsPane = useRef<HTMLDivElement>(null);
  const detailPane = useRef<HTMLDivElement>(null);
  const result = response?.query === query && response.locale === locale ? response.data : undefined;
  const searchError = response?.query === query && response.locale === locale ? response.error : '';
  const periodLabel = result?.period ? `${result.period.start.replace('-', '.')}–${result.period.end.replace('-', '.')}` : '';
  const loading = response?.query !== query || response.locale !== locale;
  const [onlyMatching, setOnlyMatching] = useState(false);
  const supportKey = JSON.stringify([result?.items.map(p => p.contentId) || [], needs]);
  const [supports, setSupports] = useState<{key:string;items:TravelSupport[];failed:boolean}>();
  const supported = supports?.key === supportKey ? supports : undefined;
  useEffect(() => {
    if (!onlyMatching) return;
    let active = true;
    const [ids] = JSON.parse(supportKey) as [string[]];
    Promise.allSettled(ids.map(getPlaceSupport)).then(rows => {
      if (active) setSupports({ key: supportKey, items: rows.flatMap(r => r.status === 'fulfilled' && r.value ? [r.value] : []), failed: rows.some(r => r.status === 'rejected' || r.status === 'fulfilled' && (!r.value || r.value.pet.status !== 'ok' || r.value.access.status !== 'ok')) });
    });
    return () => { active = false; };
  }, [onlyMatching, supportKey]);
  const visibleItems = onlyMatching ? (supported ? result?.items || [] : []).filter(p => evaluateNeeds(supported?.items.find(item => item.contentId === p.contentId), needs).eligible).sort((a,b) => evaluateNeeds(supported?.items.find(item => item.contentId === b.contentId), needs).score - evaluateNeeds(supported?.items.find(item => item.contentId === a.contentId), needs).score) : result?.items || [];
  const current = result?.items.find(item => item.contentId === selected?.contentId) || selected;

  useEffect(() => {
    const request = new AbortController();
    searchTourism(query.keyword, query.type, query.page, request.signal, { destination: query.destination, sort: query.sort, profile: query.profile, ageBand: query.ageBand, gender: query.gender })
      .then(data => { if (!request.signal.aborted) { setResponse({ query, locale, data }); setSelected(previous => data.items.find(item => item.contentId === previous?.contentId) || previous); resultsPane.current?.scrollTo({ top: 0 }); } })
      .catch(cause => { if (!request.signal.aborted) setResponse({ query, locale, error: cause instanceof Error ? cause.message : '검색을 불러오지 못했어요. 다시 시도해 주세요.' }); });
    return () => request.abort();
  }, [query, locale]);

  useEffect(() => { detailPane.current?.scrollTo({ top: 0 }); }, [current?.contentId]);

  useEffect(() => {
    if (detailExpanded) detailPane.current?.scrollTo({ top: 0 });
    else {
      resultsPane.current?.scrollTo({ top: browsingPosition.current.list });
      detailPane.current?.scrollTo({ top: browsingPosition.current.detail });
    }
  }, [detailExpanded]);
  const toggleDetail = () => {
    if (!detailExpanded) browsingPosition.current = { list: resultsPane.current?.scrollTop || 0, detail: detailPane.current?.scrollTop || 0 };
    setDetailExpanded(value => !value);
  };

  const search = (event: FormEvent) => {
    event.preventDefault();
    setQuery({ ...query, keyword: keyword.trim(), page: 1 });
  };
  const showRegion = () => {
    setKeyword('');
    setQuery({ ...query, keyword: '', type: 'all', page: 1 });
  };
  const disabledReason = (place: TourismAttraction) => excludedPlace({ ...place, tourism: { contentId: place.contentId, contentTypeId: place.contentTypeId } }, disabledPlaces);
  const apply = (event: FormEvent) => {
    event.preventDefault(); if (!current || disabledReason(current)) return;
    try { onSelect(current, duration); } catch (cause) { setApplyError(cause instanceof Error ? cause.message : '일정을 확인해 주세요.'); }
  };

  return <TripDialog title={uiText("어디를 여행의 중심으로 할까요?")} className={`tourism-dialog ${detailExpanded ? 'tourism-expanded' : ''}`} onClose={onClose}>
    <div className="tourism-intro"><span className="tourism-context"><TripIcon name="calendar" />{context}</span><p>{uiText("마음에 드는 곳을 고르면, 그 주변으로 여행을 이어갈 수 있어요.")}</p>{onDirectSearch && <button type="button" className="trip-button tourism-direct-entry" onClick={onDirectSearch}><TripIcon name="pin" />{uiText("장소 직접 검색")}</button>}</div>
    <div className="tourism-workbench">
      <section className="tourism-discovery" aria-label={uiText("관광지 찾아보기")}>
        {result?.translationStatus === 'unavailable' && <p className="tourism-language-notice" role="status">{uiText('외국어 관광정보에 연결하지 못해 한국어 원문을 표시해요.')}</p>}
        <form className="tourism-search-bar" onSubmit={search}><TripIcon name="pin" /><input aria-label={uiText("관광지 이름 또는 지역")} autoFocus maxLength={80} placeholder={uiText(`${uiText(regionKeyword)} 관광지 전체 · 이름으로 검색해 보세요`)} value={keyword} onChange={e => setKeyword(e.target.value)} /><button className="tourism-reset-search" type="button" onClick={showRegion}>{uiText("지역 전체 보기")}</button><button className="trip-button primary" type="submit">{uiText("검색")}</button></form>
        <div className="tourism-discovery-toolbar">
          <div className="tourism-categories" aria-label={uiText("관광지 종류")}>{categoryOptions.map(category => <button type="button" key={category.id} aria-pressed={query.type === category.id} onClick={() => setQuery({ ...query, keyword: keyword.trim(), type: category.id as SearchQuery['type'], page: 1 })}>{uiText(category.name)}</button>)}</div>
          {<div className="tourism-sort-tabs" aria-label={uiText("관광지 정렬")}>{([{ id: 'recommended', label: '맞춤 추천순' }, { id: 'popular', label: '인기순' }, { id: 'name', label: '이름순' }] as const).map(sort => <button key={sort.id} type="button" aria-pressed={query.sort === sort.id} onClick={() => setQuery({ ...query, sort: sort.id, page: 1 })}>{uiText(sort.label)}</button>)}</div>}
        </div>
        {<div className="tourism-ranking-panel">
          {query.sort === 'recommended' && <div className="tourism-profile-controls">
            <label>{uiText("추천 연령대")}<select aria-label={uiText("추천 연령대")} value={query.profile === 'custom' ? query.ageBand : result?.profile?.ageBand || ''} onChange={e => setQuery({ ...query, profile: 'custom', ageBand: e.target.value, gender: query.gender || result?.profile?.gender || 'all', page: 1 })}>
              <option value="" disabled>{uiText("연령대 선택")}</option>{['10', '20', '30', '40', '50', '60', '70'].map(band => <option key={band} value={band}>{uiText(band === '10' ? '10대 이하' : band === '70' ? '70대 이상' : `${band}대`)}</option>)}
            </select></label>
            <label>{uiText("성별")}<select aria-label={uiText("추천 성별")} disabled={!query.ageBand && !result?.profile?.ageBand} value={query.profile === 'custom' ? query.gender : result?.profile?.gender || 'all'} onChange={e => setQuery({ ...query, profile: 'custom', ageBand: query.ageBand || result?.profile?.ageBand || '20', gender: e.target.value as 'all' | 'male' | 'female', page: 1 })}><option value="all">{uiText("전체")}</option><option value="male">{uiText("남성")}</option><option value="female">{uiText("여성")}</option></select></label>
            <button type="button" className="trip-text-link" onClick={() => setQuery({ ...query, profile: 'member', ageBand: undefined, gender: undefined, page: 1 })}>{uiText("내 회원정보 적용")}</button>
          </div>}
          <p className="tourism-ranking-explanation" role="status">{uiText(loading ? '추천 기준을 확인하고 있어요…' : result?.fallbackReason || (query.sort === 'recommended' ? `${result?.profile?.source === 'member' ? '회원정보 기준' : '직접 선택한 기준'} · ${result?.rankingNote || ''}` : query.sort === 'popular' ? result?.rankingNote : '관광지 이름의 가나다순으로 보여드려요.'))}</p>
          <small>{uiText("한국관광 데이터랩")}{periodLabel && ` · ${periodLabel}`}{uiText(query.profile === 'custom' && query.sort === 'recommended' ? ' · 회원정보는 변경되지 않아요.' : '')}</small>
        </div>}
        {hasTravelNeeds(needs) && <div className="support-filter"><label className="needs-toggle"><input type="checkbox" checked={onlyMatching} onChange={e => setOnlyMatching(e.target.checked)} />{uiText('현재 페이지에서 조건에 맞는 장소 보기')}</label>{onlyMatching && <p role="status">{uiText(!supported ? '공식 정보를 확인하고 있어요…' : supported.failed ? '일부 장소의 조건 정보를 불러오지 못했어요.' : '확인된 필수 조건으로 걸러내고, 선호 시설이 있는 곳부터 보여드려요.')}</p>}{onlyMatching && supported && !visibleItems.length && <p>{uiText('이 페이지에는 조건에 맞는 장소가 없어요. 다음 페이지나 다른 지역을 확인해 주세요.')}</p>}</div>}
        <div className="tourism-results-pane" ref={resultsPane} aria-busy={loading}>
          <div className="tourism-results-heading" role="status"><h3>{uiText(query.keyword ? `‘${query.keyword}’ 둘러보기` : `‘${result?.scope?.label || regionKeyword}’ 둘러보기`)}</h3><span>{uiText(loading ? '관광지를 찾고 있어요' : result ? `${result.total ?? result.items.length}곳 · ${result.page}페이지` : '')}</span></div>
          {loading ? <div className="tourism-card-grid tourism-skeletons" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map(i => <div className="tourism-skeleton" key={i}><div /><span /><small /></div>)}</div> : searchError ? <div className="tourism-empty" role="alert"><TripIcon name="map" /><h3>{uiText("잠시 연결이 어려워요")}</h3><p>{searchError}</p><button className="trip-button" type="button" onClick={() => setQuery({ ...query })}>{uiText("다시 불러오기")}</button></div> : visibleItems.length ? <div className="tourism-card-grid">{visibleItems.map(item => <button className={`tourism-card ${current?.contentId === item.contentId ? 'selected' : ''}`} aria-pressed={current?.contentId === item.contentId} type="button" key={item.contentId} disabled={Boolean(disabledReason(item))} onClick={() => { setSelected(item); setApplyError(''); }}><div className="tourism-card-media"><AttractionPhoto place={item} /><span className="tourism-card-select"><TripIcon name={current?.contentId === item.contentId ? 'check' : 'arrow'} /></span></div><div className="tourism-card-copy"><span className="tourism-card-type">{uiText(item.type)}</span><h4><TourismText place={item} /></h4>{<span className="tourism-ranking-badge">{uiText(result?.effectiveSort === 'recommended' ? item.demographicShare != null ? `${result?.profile?.label} 방문 비중 ${item.demographicShare.toFixed(1)}%` : '성·연령 방문 자료 없음' : item.searchCount != null ? `관광지 검색 ${item.searchCount.toLocaleString()}건` : '검색건수 자료 없음')}</span>}<p><TripIcon name="pin" /><span>{uiText(item.address || '주소 정보 없음')}</span></p><span className="tourism-card-action">{uiText(disabledReason(item) || (current?.contentId === item.contentId ? '상세정보 보는 중' : '이곳 살펴보기'))}<TripIcon name="arrow" /></span></div></button>)}</div> : <div className="tourism-empty"><TripIcon name="map" /><h3>{uiText(query.keyword ? '아직 찾는 곳이 없네요' : '이번 여행에서 꼭 가고 싶은 곳은?')}</h3><p>{uiText("‘첨성대’, ‘태화강’처럼 관광지 이름을 검색하거나")}<br />{uiText("다른 종류를 선택해 보세요.")}</p><button className="trip-button" type="button" onClick={showRegion}>{uiText("지역 전체 보기")}</button></div>}
          {result && (result.page > 1 || result.hasMore) && <nav className="tourism-pagination" aria-label={uiText("검색 결과 페이지")}><button className="trip-button" type="button" disabled={result.page <= 1} onClick={() => setQuery({ ...query, page: result.page - 1 })}>{uiText("이전")}</button><span>{result.page}{uiText(" 페이지")}</span><button className="trip-button" type="button" disabled={!result.hasMore} onClick={() => setQuery({ ...query, page: result.page + 1 })}>{uiText("다음 ")}<TripIcon name="arrow" /></button></nav>}
        </div>
      </section>
      <aside className="tourism-detail" aria-label={uiText("선택한 관광지")}>
        {current ? <form onSubmit={apply} className="tourism-detail-form">
          <div className="tourism-detail-toolbar"><button className="tourism-expand-button" type="button" aria-expanded={detailExpanded} onClick={toggleDetail}><TripIcon name="arrow" />{uiText(detailExpanded ? '목록으로 돌아가기' : '상세 크게 보기')}</button><span>{uiText(detailExpanded ? '사진과 방문 정보를 여유롭게 살펴보세요' : '더 넓게 읽어보세요')}</span></div>
          <div className="tourism-detail-scroll" ref={detailPane}>
            <div className="tourism-detail-identity"><span className="trip-eyebrow">{uiText("장소 살펴보기")}</span>{(current.contentTypeId !== '25' || current.imageUrl) && <AttractionPhoto place={current} large />}<span className="tourism-detail-type">{uiText(current.type)}</span><h3><TourismText place={current} /></h3><p className="tourism-detail-address">{current.address}</p></div>
            <div className="tourism-detail-copy"><TravelSupportPanel key={current.contentId} contentId={current.contentId} needs={needs} /><TravelDiscovery destination={destination} anchorId={current.contentId} onSelect={setSelected} /><TourismDetails key={`${current.contentId}:${current.contentTypeId}`} place={current} wide={detailExpanded} />{current.contentTypeId === '25' && <p className="tourism-course-note"><strong>{uiText("코스의 대표 위치를 중심으로 담아요.")}</strong>{uiText(" 여러 장소를 묶은 여행코스예요. 코스 전체 경유지가 자동으로 추가되지는 않으며, 주변 추천도 이 대표 위치를 기준으로 찾아요. 이동을 포함해 이번 구간에서 쓸 시간을 정해 주세요.")}</p>}</div>
          </div>
          <div className="tourism-apply"><div className="tourism-duration"><label htmlFor="tourism-duration">{uiText(current.contentTypeId === '25' ? '이번 구간에 얼마나 배정할까요?' : '얼마나 머무를까요?')}<span><input id="tourism-duration" type="number" required min={10} max={600} step={5} value={duration} onChange={e => { setDuration(Number(e.target.value)); setApplyError(''); }} />{uiText("분")}</span></label><div className="tourism-duration-options">{[60, 90, 120].map(value => <button type="button" aria-pressed={duration === value} key={value} onClick={() => { setDuration(value); setApplyError(''); }}>{uiText(value === 60 ? '1시간' : value === 90 ? '1시간 30분' : '2시간')}</button>)}</div></div>{applyError && <p className="trip-alert" role="alert">{applyError}</p>}<button className="trip-button primary" type="submit" disabled={Boolean(disabledReason(current))}>{uiText(initial ? '이곳으로 변경하기' : '이곳 일정에 담기')}<TripIcon name="arrow" /></button><small>{uiText("선택한 구간의 첫 일정으로 고정돼요.")}</small></div>
        </form> : <div className="tourism-detail-empty"><span className="tourism-empty-orbit"><TripIcon name="pin" /></span><span className="trip-eyebrow">A PLACE TO START</span><h3>{uiText("여행의 중심이 될")}<br />{uiText("한 곳을 골라보세요.")}</h3><p>{uiText("왼쪽에서 관광지를 선택하면")}<br />{uiText("관람시간을 정하고 일정에 담을 수 있어요.")}</p><div><span>01</span>{uiText(" 마음에 드는 관광지 선택")}</div><div><span>02</span>{uiText(" 머무는 시간 정하기")}</div><div><span>03</span>{uiText(" 내 여행에 담기")}</div></div>}
      </aside>
    </div>
    <footer className="tourism-dialog-footer"><span>{uiText(regionKeyword)}{uiText(" 관광지 · 문화시설 · 레포츠 · 여행코스 · 쇼핑 · 음식점")}</span><a href="https://www.data.go.kr/data/15101578/openapi.do" target="_blank" rel="noreferrer">{uiText("관광정보·사진 출처: 한국관광공사 TourAPI ↗")}</a></footer>
  </TripDialog>;
}
