import { useState } from 'react';
import { groupSizeOf, preferenceKey } from './accuracyModel';
import type { PlannerAccuracy, PlannerCondition } from '../../types/noplan';
import './accuracy-preferences.css';
import { normalizeFillPreferences } from '../../utils/fillPreferences';

export function AccuracyPreferences({ condition, onChange }: { condition: PlannerCondition; onChange: (value: PlannerAccuracy) => void }) {
  const [savedMessage, setSavedMessage] = useState('');
  const value = condition.accuracy || {};
  const fill = normalizeFillPreferences(value);
  const patch = (change: Partial<PlannerAccuracy>) => onChange({ ...value, ...change });
  const hasDrink = /술/.test(condition.mood);
  return <section className="accuracy-preferences screen-section" aria-label="예산과 취향">
    <h2>오늘의 예산과 취향</h2>
    <p>선택한 활동을 중심으로 시간대와 전체 예산에 맞춰 일정을 구성해요.</p>
    <label className="accuracy-checkbox"><input type="checkbox" checked={value.fillSchedule !== false} onChange={e=>patch({fillSchedule:e.target.checked})}/><span>남는 시간과 예산에 맞춰 일정 채우기<small>선택한 활동을 먼저 담고, 여유가 있으면 놀거리·카페를 추가해요. 술집을 선택했다면 2차·3차도 이어갈 수 있어요. 예산이 부족하면 무료 산책을 넣을 수 있어요. 밤 8시 이후 카페는 자동으로 넣지 않아요.</small></span></label>
    {fill.fillSchedule && <label className="accuracy-checkbox"><input type="checkbox" checked={fill.allowBudgetWalk} onChange={e=>patch({allowBudgetWalk:e.target.checked})}/><span>예산이 부족하면 무료 산책도 허용<small>시간이 남고, 남은 예산으로 유료 활동을 추가하기 어려울 때 주변 산책 장소를 찾아요.</small></span></label>}
    <p>예산은 예상 최저·최고 금액의 평균을 기준으로 맞춰요. 실제 주문에 따라 달라질 수 있어요.</p>
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
    <p>카페는 기본 2시간으로 구성해요. 영업시간 미확인 장소도 포함하며, 방문 전 확인 안내를 표시해요. 휴무·영업 종료로 확인된 장소는 제외해요.</p>
    {preferenceKey() && <><button type="button" className="text-link" onClick={() => {
      const key = preferenceKey();
      if (!key) return;
      try { localStorage.setItem(key, JSON.stringify({ budgetPerPerson: value.budgetPerPerson, alcoholPreference: value.alcoholPreference, drinkServings: value.drinkServings, excludedDetails: value.excludedDetails })); setSavedMessage('이 브라우저에 기본 취향을 저장했어요. 인원은 매번 확인해요.'); }
      catch { setSavedMessage('취향을 저장하지 못했어요.'); }
    }}>이 예산·취향을 내 기본값으로 저장</button><small role="status">{savedMessage}</small></>}
  </section>;
}
