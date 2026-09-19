import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserSession } from '../../types/noplan';
import { tripRoute } from '../../routes';
import { createTrip, dayCount, outboundLabels, transportLabels, writeDraft, type TripDocument } from './tripModel';
import { TripIcon, type TripIconName } from './TripIcon';
import { TripDetailSelect } from './TripDetailSelect';
import { TourismPicker } from './TourismPicker';
import { setTourismAnchor } from './tourismModel';
import { courseDistanceLabel } from './coursePolicy';
import { readTripCreation, writeTripCreation, clearTripCreation } from './tripCreationDraft';

export function TripCreateForm({ user }: { user: UserSession | null }) {
  const navigate = useNavigate();
  const [initial] = useState(() => readTripCreation(user?.userId));
  const [destination, setDestination] = useState(initial.destination);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [transport, setTransport] = useState(initial.transport);
  const selectTransport = (value: TripDocument['transport']) => { setTransport(value); try { localStorage.setItem(`noplan.trip.transport:${user?.userId || 'guest'}`, value); } catch { /* Optional preference. */ } };
  const [outbound, setOutbound] = useState(initial.outbound);
  const [companion, setCompanion] = useState(initial.companion);
  const [openDetail, setOpenDetail] = useState<'companion' | 'outbound' | 'transport' | null>(null);
  const [pickingTourism, setPickingTourism] = useState(false);
  const [attraction, setAttraction] = useState(initial.attraction);
  const [visitDuration, setVisitDuration] = useState(initial.visitDuration);
  const [visitDate, setVisitDate] = useState(initial.visitDate);
  const [visitSlot, setVisitSlot] = useState(initial.visitSlot);
  const [error, setError] = useState('');
  useEffect(() => {
    writeTripCreation({ destination, startDate, endDate, transport, outbound, companion, attraction, visitDuration, visitDate, visitSlot }, user?.userId);
  }, [destination, startDate, endDate, transport, outbound, companion, attraction, visitDuration, visitDate, visitSlot, user?.userId]);
  const create = (event: FormEvent) => {
    event.preventDefault();
    try {
      const trip = createTrip({ title: `${destination.trim()}에서 보내는 ${dayCount(startDate, endDate) === 1 ? '하루' : `${dayCount(startDate, endDate)}일`}`.slice(0, 100), destination: destination.trim(), startDate, endDate, transport, outbound, companion });
      const targetDay = trip.document.days.find(day => day.date === (visitDate || startDate));
      const targetBlock = targetDay?.blocks[visitSlot];
      if (attraction) {
        if (!targetDay || !targetBlock) throw new Error('관광지를 방문할 날짜를 여행 기간 안에서 다시 선택해 주세요.');
        trip.document = setTourismAnchor(trip.document, targetDay.id, targetBlock.id, attraction, visitDuration);
      }
      // Navigation state keeps creation usable even when browser storage is full.
      try { writeDraft(trip, user?.userId); } catch { /* editor shows persistence status */ }
      clearTripCreation(user?.userId);
      navigate(tripRoute(trip.id), { state: { initialTrip: trip, ...(attraction ? { focusDayId: targetDay?.id, focusBlockId: targetBlock?.id } : {}) } });
    } catch (cause) { setError(cause instanceof Error ? cause.message : '여행 조건을 확인해 주세요.'); }
  };
  const count = dayCount(startDate, endDate);
  return <>
    <form id="trip-create" className="trip-create-form" onSubmit={create}>
      <div className="trip-create-heading"><span><TripIcon name="spark" /> 나의 다음 여행</span><small>{count > 0 && count <= 14 ? count === 1 ? '가볍게, 당일치기' : `${count - 1}박 ${count}일의 새로운 발견` : '최대 14일'}</small></div>
      <div className="trip-create-fields">
        <label><span><TripIcon name="pin" /> 어디로 떠날까요?</span><input aria-label="여행 목적지" maxLength={100} required value={destination} onChange={event => setDestination(event.target.value)} placeholder="도시 또는 지역" /></label>
        <label><span>가는 날</span><input aria-label="여행 시작일" type="date" required value={startDate} onChange={event => { setStartDate(event.target.value); if (event.target.value > endDate) setEndDate(event.target.value); }} /></label>
        <label><span>오는 날</span><input aria-label="여행 종료일" type="date" required min={startDate} value={endDate} onChange={event => setEndDate(event.target.value)} /></label>
      </div>
      <fieldset className="trip-detail-options">
        <legend>상세 정보</legend>
        <p>누구와, 어떻게 떠날지 골라주세요. 선택한 조건은 일정에도 그대로 이어져요.</p>
        <div className="trip-detail-grid">
          <TripDetailSelect label="함께하는 사람" icon="people" value={companion} onChange={setCompanion}
            open={openDetail === 'companion'} onOpenChange={open => setOpenDetail(open ? 'companion' : null)}
            options={['혼자', '친구', '연인', '가족', '동료'].map((label, index) => ({ value: label, label, icon: (['person', 'people', 'heart', 'home', 'briefcase'] as TripIconName[])[index] }))} />
          <TripDetailSelect<TripDocument['outbound']> label="여행지까지" icon="pin" value={outbound} onChange={setOutbound}
            open={openDetail === 'outbound'} onOpenChange={open => setOpenDetail(open ? 'outbound' : null)}
            options={(Object.keys(outboundLabels) as TripDocument['outbound'][]).map(value => ({ value, label: outboundLabels[value], icon: ({ undecided: 'clock', local: 'pin', train: 'train', bus: 'bus', flight: 'flight', car: 'transport' } as const)[value] }))} />
          <TripDetailSelect<TripDocument['transport']> label="이동 방식" icon="transport" value={transport} onChange={selectTransport}
            open={openDetail === 'transport'} onOpenChange={open => setOpenDetail(open ? 'transport' : null)}
            options={[
              { value: 'walk', label: transportLabels.walk, icon: 'walk', description: '가까운 곳을 천천히 · 이동 최대 1km' },
              { value: 'car', label: transportLabels.car, icon: 'transport', description: '자가용 또는 렌터카 · 이동 최대 7km' },
              { value: 'transit', label: transportLabels.transit, icon: 'bus', description: '자동 추천 준비 중 · 코스 직접 편집' },
            ]} />
        </div>
      </fieldset>
      <div className="trip-home-tourism"><div><span className="trip-eyebrow">여행의 중심이 될 곳</span><h3>{attraction?.name || '꼭 가고 싶은 관광지가 있나요?'}</h3><p>{attraction ? `${attraction.address} · 관람 ${visitDuration}분` : '관광지를 고르면 오전·오후·저녁의 중심 일정으로 담아드려요.'}</p></div><div className="tourism-home-actions"><button className="trip-button" type="button" onClick={() => setPickingTourism(true)}><TripIcon name="pin" />{attraction ? '관광지 변경' : '관광지부터 고르기'}</button>{attraction && <button className="trip-text-link" type="button" onClick={() => setAttraction(undefined)}>선택 해제</button>}</div>{attraction && <div className="trip-form-row tourism-home-schedule"><label className="trip-field">방문 날짜<input type="date" required min={startDate} max={endDate} value={visitDate || startDate} onChange={e => setVisitDate(e.target.value)} /></label><label className="trip-field">방문 구간<select value={visitSlot} onChange={e => setVisitSlot(Number(e.target.value))}><option value={0}>오전 · 09:00–12:00</option><option value={1}>오후 · 13:00–17:00</option><option value={2}>저녁 · 18:00–21:00</option></select></label></div>}</div>
      <div className="trip-create-submit"><span><b>{transportLabels[transport]}</b>로 여행해요<small>{transport === 'transit' ? '대중교통 자동 추천은 준비 중이에요.' : `자동 코스는 장소 사이 실제 이동 ${courseDistanceLabel(transport)} 이내로 연결해요.`}</small></span><button className="trip-button primary" type="submit">이 조건으로 일정 시작하기 <TripIcon name="arrow" /></button></div>
    </form>
    {pickingTourism && <TourismPicker destination={destination} initial={attraction} initialDuration={visitDuration} context="선택할 여행 구간" onClose={() => setPickingTourism(false)} onSelect={(place, duration) => { setAttraction(place); setVisitDuration(duration); setPickingTourism(false); }} />}
    {error && <div className="trip-alert trip-create-error" role="alert">{error}</div>}
  </>;
}
