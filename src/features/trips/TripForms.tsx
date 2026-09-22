import { TravelNeedsForm } from './TravelNeedsForm';
import { t as uiText } from '../../i18n/translate';
import { useState, type FormEvent } from 'react';
import { TripDialog } from './TripDialog';
import { TripIcon } from './TripIcon';
import { createTrip, dayCount, minutes, newId, outboundLabels, transportLabels, usedMinutes, type TripBlock, type TripDay, type TripDocument, type TripPlace } from './tripModel';

export function PlaceForm({ place, onClose, onAdd }: { place?: TripPlace; onClose: () => void; onAdd: (place: TripPlace) => void }) {
  const [name, setName] = useState(place?.name || ''), [address, setAddress] = useState(place?.address || ''), [duration, setDuration] = useState(place?.durationMinutes || 60), [fixed, setFixed] = useState(place?.fixed || false);
  return <TripDialog title={uiText(place ? '장소 정보 수정' : '가고 싶은 장소 담기')} onClose={onClose}><form className="trip-form" onSubmit={e => { e.preventDefault(); if (name.trim()) onAdd({ ...(place || { id: newId(), lat: null, lng: null, type: '직접 추가', source: 'manual' as const, sourceUrl: '' }), ...(place && (name.trim() !== place.name || address.trim() !== place.address) ? { lat: null, lng: null, source: 'manual' as const, sourceUrl: '' } : {}), name: name.trim(), address: address.trim(), durationMinutes: duration, fixed }); }}>
    <p className="trip-muted">{uiText("꼭 가고 싶은 곳, 예약한 식당, 숙소까지 자유롭게 담아보세요.")}</p>
    <label>{uiText("장소 이름")}<input autoFocus required maxLength={160} placeholder={uiText("예: 성산 일출봉")} value={name} onChange={e => setName(e.target.value)} /></label>
    <label>{uiText("주소 또는 지역 ")}<small>{uiText("선택")}</small><input maxLength={300} placeholder={uiText("예: 제주 서귀포시 성산읍")} value={address} onChange={e => setAddress(e.target.value)} /></label>
    <label>{uiText("머무는 시간 (분)")}<input type="number" min={10} max={600} step={5} required value={duration} onChange={e => setDuration(Number(e.target.value))} /></label>
    <label className="trip-checkbox"><input type="checkbox" checked={fixed} onChange={e => setFixed(e.target.checked)} /><span>{uiText("꼭 갈 장소로 고정하기")}<small>{uiText("순서를 옮기거나 삭제하기 전에 고정을 해제해요.")}</small></span><TripIcon name="lock" /></label>
    <button className="trip-button primary" type="submit">{uiText(place ? '장소 수정하기' : '일정에 담기')} <TripIcon name="check" /></button>
  </form></TripDialog>;
}

export function BlockForm({ block, day, days, onClose, onSave }: { block: TripBlock; day: TripDay; days: TripDay[]; onClose: () => void; onSave: (block: TripBlock, dayId: string) => void }) {
  const [value, setValue] = useState(block), [target, setTarget] = useState(day.id), [error, setError] = useState('');
  const change = (patch: Partial<TripBlock>) => setValue(previous => ({ ...previous, ...patch }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const targetDay = days.find(item => item.id === target)!;
    if(value.places.some(place=>place.event&&(targetDay.date<place.event.startDate||targetDay.date>place.event.endDate)))return setError('담긴 행사의 개최 기간에 해당하는 날짜를 선택해 주세요.');
    if (!value.title.trim()) return setError('구간 이름을 입력해 주세요.');
    if (minutes(value.endTime) <= minutes(value.startTime)) return setError('종료 시각을 시작 시각보다 늦게 선택해 주세요.');
    if (targetDay.blocks.some(item => item.id !== value.id && minutes(item.startTime) < minutes(value.endTime) && minutes(value.startTime) < minutes(item.endTime))) return setError('다른 일정 구간과 시간이 겹쳐요. 시작·종료 시각을 조정해 주세요.');
    if (target !== day.id && targetDay.blocks.length >= 12) return setError('하루에 최대 12개 구간을 만들 수 있어요.');
    if (value.places.some(place => place.requiredVisit)) {
      if (value.places.some(place => place.requiredVisit && place.tourism) && targetDay.blocks.some(item => item.id !== value.id && item.places.some(place => place.requiredVisit && place.tourism))) return setError('꼭 방문할 장소는 하루에 한 곳만 선택해 주세요.');
      if (usedMinutes(value) > minutes(value.endTime) - minutes(value.startTime)) return setError('체류시간이 방문 시간대를 넘어요. 종료 시각을 조정해 주세요.');
    }
    const timesChanged = value.startTime !== block.startTime || value.endTime !== block.endTime;
    onSave({ ...value, title: value.title.trim(), area: value.area.trim(), places: value.places.map(place => place.requiredVisit && timesChanged ? { ...place, requiredVisit: { start: value.startTime, end: value.endTime } } : place) }, target);
  };
  return <TripDialog title={uiText("일정 구간 정하기")} onClose={onClose}><form className="trip-form" onSubmit={submit}>
    <label>{uiText("구간 이름")}<input required maxLength={80} value={value.title} onChange={e => change({ title: e.target.value })} autoFocus /></label>
    <label>{uiText("출발 장소·지역")}<input maxLength={160} value={value.area} onChange={e => change({ area: e.target.value })} placeholder={uiText("예: 서울숲역, 성산 일출봉")} /></label>
    <div className="trip-form-row"><label>{uiText("시작")}<input type="time" required value={value.startTime} onChange={e => change({ startTime: e.target.value })} /></label><label>{uiText("종료")}<input type="time" required value={value.endTime} onChange={e => change({ endTime: e.target.value })} /></label></div>
    <label>{uiText("날짜")}<select value={target} onChange={e => setTarget(e.target.value)}>{days.map((item, index) => <option key={item.id} value={item.id}>DAY {index + 1} · {item.date}</option>)}</select></label>
    <label>{uiText("메모")}<textarea value={value.notes} maxLength={1000} onChange={e => change({ notes: e.target.value })} placeholder={uiText("예약 시간이나 기억해둘 내용을 적어주세요.")} /></label>
    {error && <p className="trip-alert" role="alert">{uiText(error)}</p>}<button className="trip-button primary" type="submit">{uiText("구간 저장하기 ")}<TripIcon name="check" /></button>
  </form></TripDialog>;
}

export function TripSettings({ trip, onClose, onSave }: { trip: TripDocument; onClose: () => void; onSave: (patch: Partial<TripDocument>) => void }) {
  const [value, setValue] = useState(trip);
  const [error, setError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!value.title.trim() || !value.destination.trim()) return setError('여행 이름과 목적지를 입력해 주세요.');
    const count = dayCount(value.startDate, value.endDate);
    if (!Number.isFinite(count) || count < 1 || count > 14) return setError('여행 기간은 1~14일로 선택해 주세요.');
    if (count < trip.days.length && !window.confirm(`여행을 ${count}일로 줄이면 이후 날짜의 일정이 제외돼요. 계속할까요? 저장 전에는 되돌릴 수 있어요.`)) return;
    const template = createTrip(value).document;
    const days = template.days.map((day, index) => trip.days[index] ? { ...trip.days[index], date: day.date } : day);
    if(days.some(day=>day.blocks.some(block=>block.places.some(place=>place.event&&(day.date<place.event.startDate||day.date>place.event.endDate)))))return setError('여행 날짜를 바꾸면 담긴 행사의 개최 기간을 벗어나요. 행사 일정을 먼저 조정해 주세요.');
    onSave({ ...value, title: value.title.trim(), destination: value.destination.trim(), days });
  };
  return <TripDialog title={uiText("여행 정보")} onClose={onClose}><form className="trip-form" onSubmit={submit}>
    <label>{uiText("여행 이름")}<input autoFocus required maxLength={100} value={value.title} onChange={e => setValue({ ...value, title: e.target.value })} /></label>
    <label>{uiText("목적지")}<input required maxLength={100} value={value.destination} onChange={e => setValue({ ...value, destination: e.target.value })} /></label>
    <div className="trip-form-row"><label>{uiText("가는 날")}<input type="date" required value={value.startDate} onChange={e => setValue({ ...value, startDate: e.target.value })} /></label><label>{uiText("오는 날")}<input type="date" required min={value.startDate} value={value.endDate} onChange={e => setValue({ ...value, endDate: e.target.value })} /></label></div>
    <p className="trip-muted">{uiText("날짜를 바꾸면 DAY 순서대로 일정을 옮겨요. 목적지를 바꿔도 담아둔 장소와 구간의 출발 지역은 유지돼요.")}</p>
    <label>{uiText("함께하는 사람")}<select value={value.companion} onChange={e => setValue({ ...value, companion: e.target.value })}>{['혼자', '친구', '연인', '가족', '동료'].map(item => <option key={item} value={item}>{uiText(item)}</option>)}</select></label>
    <label>{uiText("여행지까지")}<select value={value.outbound} onChange={e => setValue({ ...value, outbound: e.target.value as TripDocument['outbound'] })}>{Object.entries(outboundLabels).map(([key, label]) => <option value={key} key={key}>{uiText(label)}</option>)}</select></label>
    <label>{uiText("여행지 안에서")}<select value={value.transport} onChange={e => setValue({ ...value, transport: e.target.value as TripDocument['transport'] })}>{Object.entries(transportLabels).map(([key, label]) => <option value={key} key={key}>{uiText(label)}</option>)}</select></label>
    <TravelNeedsForm value={value.needs} onChange={needs => setValue({ ...value, needs })} />
    {error && <p className="trip-alert" role="alert">{uiText(error)}</p>}<button className="trip-button primary" type="submit">{uiText("변경 저장 ")}<TripIcon name="check" /></button>
  </form></TripDialog>;
}
