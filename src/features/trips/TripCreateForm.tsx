import { TravelNeedsForm } from './TravelNeedsForm';
import { normalizeNeeds } from './travelNeeds';
import { TravelDiscovery } from './TravelDiscovery';
import { t as uiText } from '../../i18n/translate';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserSession } from '../../types/noplan';
import { ROUTES } from '../../routes';
import { createTrip, dayCount, outboundLabels, transportLabels, type TripDocument, type TripRecord } from './tripModel';
import { TripIcon, type TripIconName } from './TripIcon';
import { TripDetailSelect } from './TripDetailSelect';
import { TourismPicker } from './TourismPicker';
import { setTourismAnchor } from './tourismModel';
import { courseDistanceLabel } from './coursePolicy';
import { readTripCreation, writeTripCreation, type TripCreationDraft } from './tripCreationDraft';
import { queueTripCreation } from './pendingTripCreation';
import { TripDialog } from './TripDialog';
import { getTourismRegions, type TourismRegion } from '../../api/tourismApi';
import { destinationDistricts, formatDestination, resolveDestination } from './tripDestination';

export function TripCreateForm({ user }: { user: UserSession | null }) {
  const navigate = useNavigate();
  const [initial] = useState(() => readTripCreation(user?.userId));
  const [destination, setDestination] = useState(initial.destination);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [transport, setTransport] = useState(initial.transport);
  const selectTransport = (value: TripDocument['transport']) => { setTransport(value); try { localStorage.setItem(`noplan.trip.transport:${user?.userId || 'guest'}`, value); } catch { /* Optional preference. */ } };
  const [outbound, setOutbound] = useState(initial.outbound);
  const [needs, setNeeds] = useState(() => normalizeNeeds(initial.needs));
  const [companion, setCompanion] = useState(initial.companion);
  const [openDetail, setOpenDetail] = useState<'province' | 'district' | 'companion' | 'outbound' | 'transport' | null>(null);
  const [regions, setRegions] = useState<TourismRegion[]>([]);
  const [regionError, setRegionError] = useState(false);
  const [regionAttempt, setRegionAttempt] = useState(0);
  const selectedDestination = resolveDestination(destination, regions);
  useEffect(() => {
    const controller = new AbortController();
    getTourismRegions(controller.signal).then(result => {
      if (!result.items?.length) throw new Error('Empty regions');
      if (!controller.signal.aborted) setRegions(result.items);
    }).catch(() => { if (!controller.signal.aborted) setRegionError(true); });
    return () => controller.abort();
  }, [regionAttempt]);
  const [pickingTourism, setPickingTourism] = useState(false);
  const [attraction, setAttraction] = useState(initial.attraction);
  const [visitDuration, setVisitDuration] = useState(initial.visitDuration);
  const [visitDate, setVisitDate] = useState(initial.visitDate);
  const [visitSlot, setVisitSlot] = useState(initial.visitSlot);
  const [error, setError] = useState('');
  const [loginTrip, setLoginTrip] = useState<{ trip: TripRecord; draft: TripCreationDraft; focusDayId?: string; focusBlockId?: string } | null>(null);
  const [destinationNotice, setDestinationNotice] = useState('');
  const selectDestination = (region: TourismRegion, district = '') => {
    const next = formatDestination(region, district);
    if (next !== (selectedDestination ? formatDestination(selectedDestination.region, selectedDestination.district) : destination)) {
      if (attraction) { setAttraction(undefined); setDestinationNotice('여행지가 바뀌어 이전에 담은 관광지는 선택 해제했어요.'); }
      setDestination(next);
      setError('');
    }
  };
  useEffect(() => {
    writeTripCreation({ destination, startDate, endDate, transport, outbound, companion, needs, attraction, visitDuration, visitDate, visitSlot }, user?.userId);
  }, [destination, startDate, endDate, transport, outbound, companion, needs, attraction, visitDuration, visitDate, visitSlot, user?.userId]);
  const create = (event: FormEvent) => {
    event.preventDefault();
    try {
      if (!selectedDestination) throw new Error('여행할 시·도와 시·군·구를 선택해 주세요.');
      const selectedRegion = formatDestination(selectedDestination.region, selectedDestination.district);
      const trip = createTrip({ title: `${selectedRegion}에서 보내는 ${dayCount(startDate, endDate) === 1 ? '하루' : `${dayCount(startDate, endDate)}일`}`.slice(0, 100), destination: selectedRegion, startDate, endDate, transport, outbound, companion, needs });
      const targetDay = trip.document.days.find(day => day.date === (visitDate || startDate));
      const targetBlock = targetDay?.blocks[visitSlot];
      if (attraction) {
        if (!targetDay || !targetBlock) throw new Error('관광지를 방문할 날짜를 여행 기간 안에서 다시 선택해 주세요.');
        trip.document = setTourismAnchor(trip.document, targetDay.id, targetBlock.id, attraction, visitDuration);
      }
      const prepared = { trip, draft: { destination: selectedRegion, startDate, endDate, transport, outbound, companion, needs, attraction, visitDuration, visitDate, visitSlot }, ...(attraction ? { focusDayId: targetDay?.id, focusBlockId: targetBlock?.id } : {}) };
      if (!user) { setLoginTrip(prepared); return; }
      queueTripCreation({ ...prepared, sourceUserId: user.userId, accountId: user.userId });
      navigate(`${ROUTES.newTrip}?resume=1`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '여행 조건을 확인해 주세요.'); }
  };
  const count = dayCount(startDate, endDate);
  return <>
    <form id="trip-create" className="trip-create-form" onSubmit={create}>
      <div className="trip-create-heading"><span><TripIcon name="spark" />{uiText(" 나의 다음 여행")}</span><small>{uiText(count > 0 && count <= 14 ? count === 1 ? '가볍게, 당일치기' : `${count - 1}박 ${count}일의 새로운 발견` : '최대 14일')}</small></div>
      <div className="trip-create-fields">
        <div className="trip-destination" role="group" aria-label={uiText("어디로 떠날까요?")}>
          <span className="trip-destination-heading"><TripIcon name="pin" />{uiText(" 어디로 떠날까요?")}</span>
          {regions.length > 0 ? <div className="trip-destination-selects">
            <TripDetailSelect label={uiText("시·도")} icon="pin" value={selectedDestination?.region.id || ''}
              open={openDetail === 'province'} onOpenChange={open => setOpenDetail(open ? 'province' : null)}
              onChange={id => { const region = regions.find(item => item.id === id); if (region) selectDestination(region); }}
              options={[...(!selectedDestination ? [{ value: '', label: '시·도 선택', icon: 'pin' as const }] : []), ...regions.map(region => ({ value: region.id, label: region.name, icon: 'pin' as const }))]} />
            {selectedDestination ? <TripDetailSelect key={selectedDestination.region.id} label={uiText("시·군·구")} icon="pin" value={selectedDestination.district}
              open={openDetail === 'district'} onOpenChange={open => setOpenDetail(open ? 'district' : null)}
              onChange={district => selectDestination(selectedDestination.region, district)}
              options={[{ value: '', label: '전체', icon: 'map' as const }, ...destinationDistricts(selectedDestination.region).map(district => ({ value: district, label: district, icon: 'pin' as const }))]} />
              : <span className="trip-destination-pending">{uiText("시·도를 먼저 선택")}</span>}
          </div> : <div className="trip-destination-status" role="status">{regionError ? <>{uiText("지역을 불러오지 못했어요. ")}<button type="button" onClick={() => { setRegionError(false); setRegionAttempt(value => value + 1); }}>{uiText("다시 시도")}</button></> : uiText('지역을 불러오는 중…')}</div>}
        </div>
        <label><span>{uiText("가는 날")}</span><input aria-label={uiText("여행 시작일")} type="date" required value={startDate} onChange={event => { setStartDate(event.target.value); if (event.target.value > endDate) setEndDate(event.target.value); }} /></label>
        <label><span>{uiText("오는 날")}</span><input aria-label={uiText("여행 종료일")} type="date" required min={startDate} value={endDate} onChange={event => setEndDate(event.target.value)} /></label>
      </div>
      {regions.length > 0 && !selectedDestination && <p className="trip-destination-notice" role="status">{uiText("기존 여행지 ‘")}{destination}{uiText("’의 시·도와 시·군·구를 다시 선택해 주세요.")}</p>}
      {destinationNotice && <p className="trip-destination-notice" role="status">{destinationNotice}</p>}
      <fieldset className="trip-detail-options">
        <legend>{uiText("상세 정보")}</legend>
        <p>{uiText("누구와, 어떻게 떠날지 골라주세요. 선택한 조건은 일정에도 그대로 이어져요.")}</p>
        <div className="trip-detail-grid">
          <TripDetailSelect label={uiText("함께하는 사람")} icon="people" value={companion} onChange={setCompanion}
            open={openDetail === 'companion'} onOpenChange={open => setOpenDetail(open ? 'companion' : null)}
            options={['혼자', '친구', '연인', '가족', '동료'].map((label, index) => ({ value: label, label, icon: (['person', 'people', 'heart', 'home', 'briefcase'] as TripIconName[])[index] }))} />
          <TripDetailSelect<TripDocument['outbound']> label={uiText("여행지까지")} icon="pin" value={outbound} onChange={setOutbound}
            open={openDetail === 'outbound'} onOpenChange={open => setOpenDetail(open ? 'outbound' : null)}
            options={(Object.keys(outboundLabels) as TripDocument['outbound'][]).map(value => ({ value, label: outboundLabels[value], icon: ({ undecided: 'clock', local: 'pin', train: 'train', bus: 'bus', flight: 'flight', car: 'transport' } as const)[value] }))} />
          <TripDetailSelect<TripDocument['transport']> label={uiText("이동 방식")} icon="transport" value={transport} onChange={selectTransport}
            open={openDetail === 'transport'} onOpenChange={open => setOpenDetail(open ? 'transport' : null)}
            options={[
              { value: 'walk', label: transportLabels.walk, icon: 'walk', description: '가까운 곳을 천천히 · 이동 최대 1km' },
              { value: 'car', label: transportLabels.car, icon: 'transport', description: '자가용 또는 렌터카 · 이동 최대 7km' },
              { value: 'transit', label: transportLabels.transit, icon: 'bus', description: '자동 추천 준비 중 · 코스 직접 편집' },
            ]} />
        </div>
      </fieldset>
      <TravelNeedsForm value={needs} onChange={setNeeds} />
      <TravelDiscovery destination={destination} onSelect={place => { setAttraction(place); setPickingTourism(true); }} />
      <div className="trip-home-tourism"><div><span className="trip-eyebrow">{uiText("여행의 중심이 될 곳")}</span><h3>{uiText(attraction?.name || '꼭 가고 싶은 관광지가 있나요?')}</h3><p>{uiText(attraction ? `${attraction.address} · 관람 ${visitDuration}분` : '관광지를 고르면 오전·오후·저녁의 중심 일정으로 담아드려요.')}</p></div><div className="tourism-home-actions"><button className="trip-button" type="button" disabled={!selectedDestination} onClick={() => setPickingTourism(true)}><TripIcon name="pin" />{uiText(attraction ? '관광지 변경' : '관광지부터 고르기')}</button>{attraction && <button className="trip-text-link" type="button" onClick={() => setAttraction(undefined)}>{uiText("선택 해제")}</button>}</div>{attraction && <div className="trip-form-row tourism-home-schedule"><label className="trip-field">{uiText("방문 날짜")}<input type="date" required min={startDate} max={endDate} value={visitDate || startDate} onChange={e => setVisitDate(e.target.value)} /></label><label className="trip-field">{uiText("방문 구간")}<select value={visitSlot} onChange={e => setVisitSlot(Number(e.target.value))}><option value={0}>{uiText("오전 · 09:00–12:00")}</option><option value={1}>{uiText("오후 · 13:00–17:00")}</option><option value={2}>{uiText("저녁 · 18:00–21:00")}</option></select></label></div>}</div>
      <div className="trip-create-submit"><span><b>{uiText(transportLabels[transport])}</b>{uiText("로 여행해요")}<small>{uiText(transport === 'transit' ? '대중교통 자동 추천은 준비 중이에요.' : `자동 코스는 장소 사이 실제 이동 ${courseDistanceLabel(transport)} 이내로 연결해요.`)}</small></span><button className="trip-button primary" type="submit">{uiText("이 조건으로 일정 시작하기 ")}<TripIcon name="arrow" /></button></div>
    </form>
    {pickingTourism && <TourismPicker needs={needs} destination={destination} initial={attraction} initialDuration={visitDuration} context={uiText("선택할 여행 구간")} onClose={() => setPickingTourism(false)} onSelect={(place, duration) => { setAttraction(place); setVisitDuration(duration); setPickingTourism(false); }} />}
    {loginTrip && <TripDialog title={uiText('여행을 저장하고 친구와 함께 계획해 보세요.')} onClose={() => setLoginTrip(null)}>
      <p className="trip-muted">{uiText('입력한 여행 조건은 그대로 유지돼요. 로그인하면 여행을 만들고 일정 화면으로 바로 이어져요.')}</p>
      <div className="trip-timeline-actions"><button className="trip-button" type="button" onClick={() => setLoginTrip(null)}>{uiText('계속 수정하기')}</button><button className="trip-button primary" type="button" onClick={() => {
        queueTripCreation(loginTrip);
        navigate(ROUTES.login);
      }}>{uiText('로그인하고 여행 만들기')}</button></div>
    </TripDialog>}
    {error && <div className="trip-alert trip-create-error" role="alert">{uiText(error)}</div>}
  </>;
}
