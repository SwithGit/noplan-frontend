import { t } from '../../i18n/translate';
import { useState } from 'react';
import { TripDetailSelect } from './TripDetailSelect';
import { normalizeNeeds, facilityLabels, type TravelNeeds, type Facility, type NeedLevel } from './travelNeeds';
import './travelNeeds.css';

export function TravelNeedsForm({ value, onChange, disabled = false }: { value?: TravelNeeds; onChange: (next: TravelNeeds) => void; disabled?: boolean }) {
  const needs = normalizeNeeds(value);
  const change = (next: TravelNeeds) => { if (!disabled) onChange(normalizeNeeds(next)); };
  const [expanded, setExpanded] = useState(needs.pet.enabled || Object.keys(needs.facilities).length > 0);
  const [open, setOpen] = useState('');
  return <details className="travel-needs" open={expanded} onToggle={e => setExpanded(e.currentTarget.open)}>
    <summary><span>{t('함께하기 위한 여행 조건')}</span><small>{t('반려동물 · 필요한 편의시설')}</small></summary>
    <fieldset disabled={disabled}>
      <label className="needs-toggle"><input type="checkbox" checked={needs.pet.enabled} onChange={e => change({ ...needs, pet: { ...needs.pet, enabled: e.target.checked } })} /><strong>{t('반려동물과 함께')}</strong></label>
      {needs.pet.enabled && <div className="needs-pet-fields">
        <TripDetailSelect label={t('동물 종류')} icon="heart" value={needs.pet.species} options={[{ value: 'dog', label: '강아지', icon: 'heart' }, { value: 'cat', label: '고양이', icon: 'heart' }]} open={open === 'pet'} onOpenChange={v => setOpen(v ? 'pet' : '')} onChange={species => change({ ...needs, pet: { ...needs.pet, species } })} />
        <label>{t('몸무게 (kg, 선택)')}<input type="number" min="0.1" max="150" step="0.1" value={needs.pet.weightKg ?? ''} onChange={e => change({ ...needs, pet: { ...needs.pet, weightKg: e.target.value ? Number(e.target.value) : null } })} /></label>
        <label className="needs-toggle"><input type="checkbox" checked={needs.pet.indoor} onChange={e => change({ ...needs, pet: { ...needs.pet, indoor: e.target.checked } })} />{t('실내 동반이 꼭 필요해요')}</label>
      </div>}
      <h4>{t('필요한 편의시설')}</h4><p>{t('꼭 필요한 시설은 확인된 장소만 추천해요. 정보가 없으면 가능하다고 판단하지 않아요.')}</p>
      <div className="needs-facilities">{Object.entries(facilityLabels).map(([key, label]) => <TripDetailSelect key={key} label={t(label)} icon="check" value={needs.facilities[key as Facility] || ''} open={open === key} onOpenChange={v => setOpen(v ? key : '')} options={[{ value: '', label: '선택 안 함', icon: 'close' }, { value: 'prefer', label: '있으면 좋아요', icon: 'heart' }, { value: 'required', label: '꼭 필요해요', icon: 'check' }]} onChange={value => { const facilities = { ...needs.facilities }; if (value) facilities[key as Facility] = value as NeedLevel; else delete facilities[key as Facility]; change({ ...needs, facilities }); }} />)}</div>
      <p className="needs-note">{t('시설 정보는 장소 기준이에요. 장소 사이의 계단·경사와 휠체어 이동 가능 여부는 별도 확인이 필요해요.')}</p>
    </fieldset>
  </details>;
}
