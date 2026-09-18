import { useEffect, useRef, useState } from 'react';
import { generateCourse } from '../../api/plannerApi';
import { AccuracyPreferences } from '../planner/AccuracyPreferences';
import { accuracyMissing, savedAccuracyPreferences } from '../planner/accuracyModel';
import type { PlannerCondition } from '../../types/noplan';
import { TripIcon } from './TripIcon';
import { clock, endLimit, minutes, toTripPlace, usedMinutes, type TripBlock, type TripDay, type TripDocument, type TripPlace } from './tripModel';

export function TripRecommendations({ trip, day, block, disabled = false, onApply }: { trip: TripDocument; day: TripDay; block: TripBlock; disabled?: boolean; onApply: (places: TripPlace[], fingerprint: string) => void }) {
  const [accuracy, setAccuracy] = useState(savedAccuracyPreferences);
  const [purpose, setPurpose] = useState('카페/디저트');
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<TripPlace[]>([]);
  const [snapshot, setSnapshot] = useState('');
  const requestId = useRef(0);
  const fingerprint = JSON.stringify({ trip: { transport: trip.transport, companion: trip.companion }, day, block });
  const latest = useRef(fingerprint);
  useEffect(() => { latest.current = fingerprint; }, [fingerprint]);
  useEffect(() => () => { requestId.current += 1; }, []);
  const limit = endLimit(day, block);
  const start = minutes(block.startTime) + usedMinutes(block) + (block.places.length ? 15 : 0);
  const available = limit - start;
  const location = block.places.at(-1)?.address || block.places.at(-1)?.name || block.area || trip.destination;
  const supported = trip.transport === 'walk';
  const hour = Math.floor(start / 60);
  const condition: PlannerCondition = { rawText: '', location, locationLabel: location, time: `${day.date} ${hour >= 12 ? 'PM' : 'AM'} ${String(hour % 12 || 12).padStart(2, '0')} : ${String(start % 60).padStart(2, '0')}`, companion: trip.companion, mood: purpose, mainCategory: '', supportingCategories: [], coreIntent: '', coreIntentSkipped: true, atmosphereTags: [], duration: `종료 ${clock(limit)}`, extras: ['도보 짧게'], accuracy };
  const recommend = async () => {
    const missing = accuracyMissing(condition);
    if (missing) { setState('error'); setMessage(missing); return; }
    const token = ++requestId.current, original = fingerprint;
    setState('loading'); setMessage('영업시간과 도보 동선을 확인하고 있어요.'); setPreview([]);
    try {
      const anchor = block.places.at(-1);
      const result = await generateCourse(condition, anchor?.lat != null && anchor.lng != null ? { address: location, lat: anchor.lat, lng: anchor.lng } : null);
      if (token !== requestId.current) return;
      if (latest.current !== original) { setState('error'); setMessage('일정이 바뀌었어요. 최신 조건으로 다시 추천받아 주세요.'); return; }
      if (result.source !== 'api' || !result.courseData.length) throw new Error(result.message || '지금 조건에 맞는 장소를 찾지 못했어요.');
      const names = new Set(block.places.map(place => place.name.replace(/\s/g, '')));
      let elapsed = 0;
      const places: TripPlace[] = [];
      for (const candidate of result.courseData) {
        const place = toTripPlace(candidate);
        if (names.has(place.name.replace(/\s/g, ''))) continue;
        // Keep the generator's validated schedule, with a conservative travel
        // allowance for itinerary editing. Unknown/late ends are not stretched.
        const move = Number(candidate.moveText.match(/(\d+)분/)?.[1] || 15);
        const cost = place.durationMinutes + Math.max(15, move);
        const end = candidate.scheduledEnd ? new Date(candidate.scheduledEnd).getTime() : null;
        const windowEnd = new Date(`${day.date}T${clock(limit)}:00+09:00`).getTime();
        if (end != null && (!Number.isFinite(end) || end > windowEnd)) continue;
        if (elapsed + cost > available || block.places.length + places.length >= 15) break;
        elapsed += cost; places.push(place); names.add(place.name.replace(/\s/g, ''));
      }
      if (places.length !== result.courseData.length) throw new Error('추천한 모든 활동을 이 구간에 담을 수 없어요. 중복 장소나 남은 시간을 확인하고 다시 추천받아 주세요.');
      setPreview(places); setSnapshot(original); setState('ready');
      const cost = result.accuracySummary;
      setMessage([`기존 장소 ${block.places.length}곳을 유지하고 ${places.length}곳을 추가해요.`, cost?.costKnown ? `추가 일정의 1인 예상 비용 ${cost.estimatedMin?.toLocaleString()}~${cost.estimatedMax?.toLocaleString()}원.` : '추가 일정의 비용 확인이 필요해요.', ...(cost?.warnings || [])].join(' '));
    } catch (cause) { if (token === requestId.current) { setState('error'); setMessage(cause instanceof Error ? cause.message : '추천을 불러오지 못했어요. 다시 시도해 주세요.'); } }
  };
  return <section className="trip-ai-panel" aria-label="이 구간 AI 추천">
    <div className="trip-ai-heading"><span><TripIcon name="spark" /></span><div><h3>빈 시간은 노피에게</h3><p>이 구간의 흐름에 맞춰 채워드려요.</p></div></div>
    <div className="trip-ai-context"><span><TripIcon name="pin" />{location}</span><span><TripIcon name="clock" />{available > 0 ? `${clock(start)}–${clock(limit)} · ${available}분 여유` : '구간에 남은 시간이 없어요'}</span></div>
    <label className="trip-field">어떤 시간을 보내고 싶나요?<select value={purpose} onChange={event => { setPurpose(event.target.value); setPreview([]); setState('idle'); setMessage(''); }} disabled={disabled || state === 'loading'}><option>카페/디저트</option><option>맛집</option><option>산책/구경</option><option>놀거리</option><option>맛집 · 카페/디저트</option><option>술/야간</option><option>맛집 · 술/야간</option></select></label>
    <p className="trip-muted">아래 예산은 이번에 추가로 추천받는 일정만 기준으로 해요.</p>
    <fieldset className="trip-accuracy-wrapper" disabled={disabled || state === 'loading'}><AccuracyPreferences condition={condition} onChange={value => { setAccuracy(value); setPreview([]); setState('idle'); setMessage(''); }} /></fieldset>
    {!supported && <p className="trip-muted">AI 주변 추천은 도보 일정에서 사용할 수 있어요. 이 여행에는 장소를 직접 담아주세요.</p>}
    <button className="trip-button primary" disabled={disabled || !supported || available < 30 || state === 'loading'} onClick={() => void recommend()} type="button"><TripIcon name="spark" />{state === 'loading' ? '코스를 찾고 있어요…' : '이 구간 추천받기'}</button>
    {message && <p className={state === 'error' ? 'trip-alert' : 'trip-ai-message'} role={state === 'error' ? 'alert' : 'status'}>{message}</p>}
    {state === 'ready' && <div className="trip-suggestions"><span className="trip-eyebrow">변경 미리보기</span>{preview.map(place => <article key={place.id}><span className="trip-place-marker"><TripIcon name="pin" /></span><div><strong>{place.name}</strong><small>{place.type} · {place.durationMinutes}분</small></div><TripIcon name="plus" /></article>)}<button className="trip-button primary" disabled={disabled || snapshot !== fingerprint} onClick={() => { onApply(preview, snapshot); setPreview([]); setState('idle'); setMessage('선택한 구간에 담았어요.'); }} type="button">이 구간에 담기 <TripIcon name="check" /></button>{snapshot !== fingerprint && <p className="trip-alert">일정이 바뀌어 다시 추천이 필요해요.</p>}</div>}
    <p className="trip-footnote">고정 장소와 다른 구간은 유지해요. 다음 일정까지의 이동·예약 시간은 적용 전 확인해 주세요.</p>
  </section>;
}
