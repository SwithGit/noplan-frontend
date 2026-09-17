import { useState } from 'react';
import { groupSizeOf, preferenceKey } from './accuracyModel';
import type { PlannerAccuracy, PlannerCondition } from '../../types/noplan';
import './accuracy-preferences.css';

export function AccuracyPreferences({ condition, onChange }: { condition: PlannerCondition; onChange: (value: PlannerAccuracy) => void }) {
  const [savedMessage, setSavedMessage] = useState('');
  const value = condition.accuracy || {};
  const patch = (change: Partial<PlannerAccuracy>) => onChange({ ...value, ...change });
  const hasDrink = /술/.test(condition.mood);
  return <section className="accuracy-preferences screen-section" aria-label="예산과 취향">
    <h2>오늘의 예산과 취향</h2>
    <p>선택한 활동을 중심으로 시간대와 전체 예산에 맞춰 일정을 구성해요.</p>
    <label className="accuracy-checkbox"><input type="checkbox" checked={value.fillSchedule !== false} onChange={e=>patch({fillSchedule:e.target.checked})}/><span>남는 시간과 예산에 맞춰 일정 채우기<small>선택한 활동을 먼저 담고, 여유가 있으면 놀거리·카페를 추가해요. 예산이 부족하면 무료 산책을 넣을 수 있어요. 밤 8시 이후 카페는 자동으로 넣지 않아요.</small></span></label>
    {value.fillSchedule !== false && <fieldset><legend>중간에 함께 넣어도 좋은 활동</legend><div className="accuracy-exclusions">
      {(['activity','cafe','hotplace'] as const).map(type=><button key={type} type="button" className={(value.additionalActivities||['activity','cafe','hotplace']).includes(type)?'selected':''} aria-pressed={(value.additionalActivities||['activity','cafe','hotplace']).includes(type)} onClick={()=>{const selected=value.additionalActivities||['activity','cafe','hotplace'];patch({additionalActivities:selected.includes(type)?selected.filter(item=>item!==type):[...selected,type]});}}>{{activity:'놀거리',cafe:'카페·디저트',hotplace:'산책·구경'}[type]}</button>)}
    </div><small>추가 활동은 위 버튼으로 조정할 수 있어요. 장소별 방문 시간과 예상 비용은 결과에서 확인해 주세요.</small></fieldset>}
    <div className="accuracy-fields">
      <label>전체 일정의 1인 예산<select value={value.budgetPerPerson ?? ''} onChange={e => patch({ budgetPerPerson: e.target.value === '' ? undefined : Number(e.target.value) })}>
        <option value="">예산 선택</option><option value="20000">2만 원 이하</option><option value="30000">3만 원 이하</option><option value="50000">5만 원 이하</option><option value="70000">7만 원 이하</option><option value="100000">10만 원 이하</option><option value="150000">15만 원 이하</option><option value="0">금액 제한 없음</option>
      </select></label>
      <label>정확한 인원<input type="number" min="1" max="30" inputMode="numeric" placeholder="인원" value={groupSizeOf(condition) ?? ''} onChange={e => patch({ groupSize: e.target.value ? Number(e.target.value) : undefined })} /></label>
    </div>
    <small>식사·주류·활동비를 합친 예상 금액이에요. 예산을 정하면 가격을 계산할 수 없는 장소는 제외해요.</small>
    <label>한 구간 최대 도보 거리<select value={value.maxWalkingDistanceMeters ?? ''} onChange={e=>patch({maxWalkingDistanceMeters:e.target.value?Number(e.target.value):undefined})}>
      <option value="">제한 없음 · 이동 시간 보고 선택</option><option value="500">최대 500m</option><option value="800">최대 800m</option><option value="1000">최대 1km</option><option value="1500">최대 1.5km</option>
    </select></label>
    <small>‘도보 짧게’는 가까운 곳을 우선해요. 최대 거리를 지정하면 실제 경로로 확인한 구간만 추천해요.</small>
    {hasDrink && <div className="accuracy-fields">
      <label>원하는 술<select value={value.alcoholPreference || 'any'} onChange={e => patch({ alcoholPreference: e.target.value as PlannerAccuracy['alcoholPreference'] })}>
        <option value="any">상관없음</option><option value="soju">소주</option><option value="beer">맥주</option><option value="wine">와인</option><option value="cocktail">칵테일·하이볼</option>
      </select></label>
      <label>1인 주류 주문량<select value={value.drinkServings ?? 2} onChange={e => patch({ drinkServings: Number(e.target.value) })}>
        <option value="0">주류 없이 안주만</option><option value="1">1주문단위 (잔/병)</option><option value="2">2주문단위 (잔/병)</option><option value="3">3주문단위 (잔/병)</option>
      </select></label>
    </div>}
    <fieldset><legend>피하고 싶은 음식 업종</legend><div className="chip-row">
      {['고기', '해산물', '일식', '중식', '양식', '분식'].map(detail => <button type="button" key={detail} className={`chip-button ${value.excludedDetails?.includes(detail) ? 'selected' : ''}`} aria-pressed={Boolean(value.excludedDetails?.includes(detail))} onClick={() => patch({ excludedDetails: value.excludedDetails?.includes(detail) ? value.excludedDetails.filter(x => x !== detail) : [...(value.excludedDetails || []), detail] })}>{detail}</button>)}
    </div><small>해산물은 다른 식사·안주 메뉴가 있으면 장소를 유지하고 그 메뉴로 예산을 계산해요. 다른 선택은 업종 기준이에요.</small></fieldset>
    <label className="accuracy-checkbox"><input type="checkbox" checked={Boolean(value.allowUnverifiedHours)} onChange={e => patch({ allowUnverifiedHours: e.target.checked })} /><span>영업시간을 확인하지 못한 장소도 포함하기<small>저장 정보와 Google 지도에서 확인해요. 그래도 확인되지 않은 장소를 포함하며, 결과에 ‘영업시간 확인 필요’로 표시해요.</small></span></label>
    {preferenceKey() && <><button type="button" className="text-link" onClick={() => {
      const key = preferenceKey();
      if (!key) return;
      try { localStorage.setItem(key, JSON.stringify({ budgetPerPerson: value.budgetPerPerson, alcoholPreference: value.alcoholPreference, drinkServings: value.drinkServings, excludedDetails: value.excludedDetails })); setSavedMessage('이 브라우저에 기본 취향을 저장했어요. 인원은 매번 확인해요.'); }
      catch { setSavedMessage('취향을 저장하지 못했어요.'); }
    }}>이 예산·취향을 내 기본값으로 저장</button><small role="status">{savedMessage}</small></>}
  </section>;
}
