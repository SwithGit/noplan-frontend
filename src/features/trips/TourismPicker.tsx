import { useEffect, useRef, useState, type FormEvent } from 'react';
import { searchTourism, type TourismAttraction, type TourismSearchResult } from '../../api/tourismApi';
import { TripDialog } from './TripDialog';
import { TripIcon } from './TripIcon';

export function TourismPicker({ destination, initial, initialDuration = 90, context, onClose, onSelect }: {
  destination: string; initial?: TourismAttraction; initialDuration?: number; context: string;
  onClose: () => void; onSelect: (place: TourismAttraction, duration: number) => void;
}) {
  const [keyword, setKeyword] = useState(destination);
  const [type, setType] = useState<TourismAttraction['contentTypeId']>('12');
  const [result, setResult] = useState<TourismSearchResult | null>(null);
  const [selected, setSelected] = useState(initial);
  const [duration, setDuration] = useState(initialDuration);
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const [searched, setSearched] = useState<{ keyword: string; type: TourismAttraction['contentTypeId'] } | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const search = async (page = 1) => {
    const query = keyword.trim();
    if (!query) { setError('관광지 이름이나 지역을 입력해 주세요.'); return; }
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setLoading(true); setError(''); setResult(null); setSearched(null);
    try {
      const data = await searchTourism(query, type, page, request.signal);
      if (request.signal.aborted) return;
      setResult(data); setSearched({ keyword: query, type });
    } catch (cause) {
      if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : '관광지를 불러오지 못했어요. 다시 검색해 주세요.');
    } finally { if (!request.signal.aborted) setLoading(false); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); void search(); };
  const apply = (event: FormEvent) => {
    event.preventDefault(); if (!selected) return;
    try { onSelect(selected, duration); } catch (cause) { setError(cause instanceof Error ? cause.message : '일정을 확인해 주세요.'); }
  };
  return <TripDialog title="중심 관광지 고르기" onClose={onClose}>
    <p className="trip-muted">{context}의 첫 일정으로 담아요. 관람 후 남는 시간에는 주변 코스를 더할 수 있어요.</p>
    <form className="tourism-search" onSubmit={submit}>
      <label className="trip-field">관광지 이름 또는 지역<input autoFocus required maxLength={80} placeholder="예: 첨성대, 태화강, 경주" value={keyword} onChange={e => setKeyword(e.target.value)} /></label>
      <div className="tourism-search-controls"><label className="trip-field">종류<select value={type} onChange={e => setType(e.target.value as TourismAttraction['contentTypeId'])}><option value="12">관광지</option><option value="14">문화시설</option><option value="28">레포츠</option></select></label><button className="trip-button primary" type="submit" disabled={loading}>{loading ? '검색 중…' : '관광지 검색'}</button></div>
    </form>
    {error && <p className="trip-alert" role="alert">{error}</p>}
    {result && <div className="tourism-results" aria-label="관광지 검색 결과"><p className="trip-muted" role="status">{result.items.length ? `${result.page}페이지 · ${result.items.length}곳` : '검색 결과가 없어요. 짧은 관광지 이름이나 다른 종류로 검색해 보세요.'}</p>{result.items.map(item => <button className={`tourism-result ${selected?.contentId === item.contentId ? 'selected' : ''}`} aria-pressed={selected?.contentId === item.contentId} type="button" key={item.contentId} onClick={() => { setSelected(item); setError(''); }}><span className="trip-place-marker"><TripIcon name="pin" /></span><span><strong>{item.name}</strong><small>{item.address}</small><small>{item.type} · 한국관광공사</small></span><TripIcon name={selected?.contentId === item.contentId ? 'check' : 'plus'} /></button>)}{(result.page > 1 || result.hasMore) && <div className="tourism-pagination"><button className="trip-button" type="button" disabled={loading || result.page <= 1 || searched?.keyword !== keyword.trim() || searched?.type !== type} onClick={() => void search(result.page - 1)}>이전</button><button className="trip-button" type="button" disabled={loading || !result.hasMore || searched?.keyword !== keyword.trim() || searched?.type !== type} onClick={() => void search(result.page + 1)}>다음</button></div>}</div>}
    {selected && <form className="trip-form tourism-selection" onSubmit={apply}><div><span className="trip-eyebrow">이 구간의 중심 관광지</span><h3>{selected.name}</h3><p className="trip-muted">{selected.address}</p><a className="trip-text-link" href={`https://map.kakao.com/link/map/${encodeURIComponent(selected.name)},${selected.lat},${selected.lng}`} target="_blank" rel="noreferrer">지도에서 위치 확인 <TripIcon name="arrow" /></a></div><label>관람시간 (분)<input type="number" required min={10} max={600} step={5} value={duration} onChange={e => setDuration(Number(e.target.value))} /></label><p className="trip-muted">관람시간은 직접 정하는 예상 시간이에요. 입장료·운영시간·휴무는 방문 전에 확인해 주세요.</p><button className="trip-button primary" type="submit">이 관광지로 일정 정하기 <TripIcon name="check" /></button></form>}
    <p className="trip-footnote">출처: <a href="https://www.data.go.kr/data/15101578/openapi.do" target="_blank" rel="noreferrer">한국관광공사 TourAPI</a> · 전국 관광정보 검색</p>
  </TripDialog>;
}
