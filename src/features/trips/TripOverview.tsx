import { TourismText } from '../../i18n/TourismText';
import { t as uiText } from '../../i18n/translate';
import { TripPlacePhoto, type TripPhotos } from './TripPlacePhoto';
import { TripDialog } from './TripDialog';
import { shortDate, transportLabels, type TripDocument } from './tripModel';
import './nopiPlanner.css';

export function TripOverview({ document, photos, onClose, onEdit, onDayRoute }: { document: TripDocument; photos: TripPhotos; onClose: () => void; onEdit: (dayId: string) => void; onDayRoute: (dayId: string) => void }) {
  const filled = document.days.filter(day => day.blocks.some(block => block.places.length)).length;
  return <TripDialog title={uiText("전체 일정 보기")} className="trip-overview-dialog" onClose={onClose}>
    <div className="trip-overview-intro"><strong>{uiText(document.title)}</strong> · {document.startDate} — {document.endDate} · {uiText(transportLabels[document.transport])}<p>{document.days.length}{uiText("일 중 ")}{filled}{uiText("일에 장소를 담았어요. 날짜별 코스를 이어서 살펴보세요.")}</p></div>
    <div className="trip-overview-days">{document.days.map((day, index) => <section className="trip-overview-day" key={day.id}><header><div><span className="trip-eyebrow">DAY {String(index + 1).padStart(2, '0')}</span><h3>{shortDate(day.date)}</h3><small className="trip-muted">{uiText(transportLabels[day.transport || document.transport])}</small></div><div><button type="button" className="trip-button" onClick={() => onDayRoute(day.id)}>{uiText("하루 동선 보기")}</button><button type="button" className="trip-button primary" onClick={() => onEdit(day.id)}>{uiText(day.blocks.some(block => block.places.length) ? '코스 수정' : '코스 만들기')}</button></div></header>
      {day.blocks.some(block => block.places.length) ? [...day.blocks].sort((a, b) => a.startTime.localeCompare(b.startTime)).flatMap(block => block.places.map((place, placeIndex) => <article className="trip-overview-stop" key={place.id}><span>{uiText(placeIndex === 0 ? `${block.startTime} — ${block.endTime}` : '같은 구간')}</span><b>{[...day.blocks].sort((a, b) => a.startTime.localeCompare(b.startTime)).flatMap(item => item.places).findIndex(item => item.id === place.id) + 1}</b><div className="trip-overview-place"><TripPlacePhoto name={place.name} photo={photos[place.tourism?.contentId || '']} /><div><h4><TourismText place={place} /></h4><p>{uiText(place.type)} · {place.durationMinutes}{uiText("분 · ")}{place.address}</p></div></div><a href={`https://map.naver.com/p/search/${encodeURIComponent(`$<TourismText place={place} /> ${place.address}`)}`} target="_blank" rel="noreferrer">{uiText("지도에서 보기 ↗")}</a></article>)) : <p className="trip-muted">{uiText("아직 비어 있는 하루예요. 노피와 다음 코스를 만들어 보세요.")}</p>}
    </section>)}</div>
  </TripDialog>;
}
