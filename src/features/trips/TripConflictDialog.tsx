import { useState } from 'react';
import { t } from '../../i18n/translate';
import { TripDialog } from './TripDialog';
import { resolveTripMerge, type TripMergeConflict } from './mergeTrip';
import { shortDate, type TripDocument } from './tripModel';
import { facilityLabels } from './travelNeeds';
import './tripSharing.css';

const fields: Record<string,string> = { ...facilityLabels, pet:'반려동물과 함께', facilities:'필요한 편의시설', enabled:'반려동물과 함께', species:'동물 종류', weightKg:'몸무게 (kg, 선택)', indoor:'실내 동반이 꼭 필요해요', date:'날짜', destination:'여행지', outbound:'여행지까지', title:'제목', name:'장소 이름', address:'주소', transport:'이동 방식', startTime:'출발 시간', endTime:'마치는 시간', durationMinutes:'머무는 시간', notes:'메모', '@order':'방문 순서', days:'날짜별 일정', blocks:'일정 구간', places:'장소', needs:'함께하기 위한 여행 조건', companion:'함께하는 사람', startDate:'가는 날', endDate:'오는 날', fixed:'고정' };
function label(conflict: TripMergeConflict, local: TripDocument, remote: TripDocument) {
  const dayId = conflict.path[1], day = local.days.find(d=>d.id===dayId) || remote.days.find(d=>d.id===dayId);
  const names = [...local.days, ...remote.days].flatMap(d=>d.blocks.flatMap(b=>b.places)).filter(p=>conflict.path.includes(p.id));
  return [day ? shortDate(day.date) : '', names[0]?.name, t(fields[conflict.path.at(-1)!] || '일정 변경')].filter(Boolean).join(' · ');
}
function display(value: unknown, documents: TripDocument[]): string {
  if (value === undefined) return t('삭제');
  if (value === null || value === '') return t('없음');
  if (typeof value === 'boolean') return t(value ? '예' : '아니요');
  if (Array.isArray(value)) return value.map(item => display(item, documents)).join(' → ');
  if (typeof value === 'object') { const item = value as Record<string, unknown>; return item.name ? `${item.name} · ${t('머무는 시간')} ${item.durationMinutes ?? ''}` : item.title ? `${item.title}\n${display(item.places || item.blocks || [], documents)}` : Object.entries(item).filter(([key])=>key!=='id').map(([key,val])=>`${t(fields[key] || '일정 변경')}: ${display(val, documents)}`).join('\n'); }
  const named = documents.flatMap(d=>d.days.flatMap(day=>[day, ...day.blocks, ...day.blocks.flatMap(b=>b.places)])).find(item=>item.id===value);
  return named ? ('name' in named ? named.name : 'title' in named ? named.title : shortDate(named.date)) : t(({dog:'강아지',cat:'고양이',prefer:'있으면 좋아요',required:'꼭 필요해요',walk:'도보',car:'자가용·렌터카',transit:'대중교통',local:'여행지에서 시작',train:'기차',bus:'버스',flight:'비행기'} as Record<string,string>)[String(value)] || String(value));
}
export function TripConflictDialog({ base, local, remote, onClose, onResolve }: { base: TripDocument; local: TripDocument; remote: TripDocument; onClose: () => void; onResolve: (document: TripDocument) => void }) {
  const [choices, setChoices] = useState<Record<string,'local'|'remote'>>({});
  const [error,setError] = useState('');
  const initial = resolveTripMerge(base,local,remote), result = resolveTripMerge(base,local,remote,choices);
  return <TripDialog title={t('충돌 해결')} className="trip-conflict-dialog" onClose={onClose}>
    <p>{t('다른 항목의 수정은 함께 유지돼요. 서로 다르게 바꾼 항목만 선택해 주세요.')}</p>
    <p className="trip-muted">{t('확인 중 새 변경사항이 오면 최신 내용으로 선택을 다시 받아요.')}</p>
    {initial.conflicts.map(conflict=><fieldset key={conflict.key}><legend>{label(conflict,local,remote)}</legend>{(['local','remote'] as const).map(side=><label key={side}><input type="radio" name={conflict.key} checked={choices[conflict.key]===side} onChange={()=>setChoices({...choices,[conflict.key]:side})}/><span><b>{t(side==='local'?'내 수정':'친구 수정')}</b><pre>{display(conflict[side],[local,remote])}</pre></span></label>)}</fieldset>)}
    {error && <p role="alert" className="trip-alert">{t(error)}</p>}
    <button className="trip-button primary" type="button" disabled={result.conflicts.length>0} onClick={()=>{try {onResolve(result.document);} catch(cause){setError(cause instanceof Error?cause.message:'처리하지 못했어요.');}}}>{t('선택한 내용 반영')}</button>
  </TripDialog>;
}
