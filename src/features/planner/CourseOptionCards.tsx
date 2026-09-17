import { useRef } from 'react';
import type { CoursePlan } from '../../types/noplan';
import { PlaceVisual } from '../../components/ui/PlaceVisual';

type Option = NonNullable<CoursePlan['courseOptions']>[number];
const activity: Record<string, string> = { food: '맛집', cafe: '카페', hotplace: '산책', activity: '놀거리', drink: '한잔' };

export function CourseOptionCards({ options, selectedId, disabled, onSelect }: {
  options: Option[]; selectedId?: string; disabled: boolean; onSelect: (id: string) => void;
}) {
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = Math.max(0, options.findIndex(option => option.id === selectedId));
  const choose = (index: number) => {
    onSelect(options[index].id);
    cards.current[index]?.scrollIntoView({ block: 'nearest', inline: 'center',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  return <>
    <div className="course-story-track" aria-label="코스를 좌우로 넘겨 비교하기">
      {options.map((option, index) => {
        const cover = option.courseData.find(place => place.imageUrl) || option.courseData[0];
        const active = index === selected;
        return <button ref={node => { cards.current[index] = node; }} type="button" key={option.id}
          className={`course-story ${active ? 'is-selected' : ''}`} aria-pressed={active}
          aria-label={`코스 ${index + 1}: ${option.courseData.map(p => p.name).join(', ')}`}
          disabled={disabled} onClick={() => choose(index)}>
          <span className={`story-cover ${cover?.imageUrl ? '' : 'is-illustrated'}`}>
            {cover && <PlaceVisual imageUrl={cover.imageUrl} type={cover.type} detailType={cover.detailType} color={cover.color} alt="" />}
            <span className="story-cover-top"><span className="story-number">COURSE {String(index + 1).padStart(2, '0')}</span>
              <span className={`story-choice ${active ? 'is-active' : ''}`}>{active ? '✓ 선택한 코스' : '선택하기'}</span></span>
            <span className="story-cover-caption">{cover?.imageUrl ? cover.name : '가까운 곳에서 발견하는 하루'}</span>
          </span>
          <span className="story-body">
            <span className="story-kicker">{index === 0 ? '노플랜 추천' : '또 다른 하루'} · {option.courseData.length}곳</span>
            <strong className="story-title">{option.courseData.map(p => activity[p.type] || '발견').join(' · ')}</strong>
            <span className="story-route">{option.courseData.map(p => p.name).join(' → ')}</span>
            <span className="story-bottom"><span><small>1인 예상</small><strong>{option.summary.costKnown
              ? `${option.summary.estimatedMin?.toLocaleString()}~${option.summary.estimatedMax?.toLocaleString()}원` : '가격 확인 필요'}</strong></span>
              <span className="story-walk">도보 약 {Math.round(option.ranking.walkingMinutes)}분</span></span>
            <span className="story-note">{option.courseData.some(p => p.estimatedCost?.assumptions?.length) ? '일부 가격 가정 포함 · ' : ''}{option.courseData.every(p => ['google_routes', 'tmap_pedestrian'].includes(p.walkingRouteSource || '')) ? '실제 도보 경로 기준' : '추정 이동 시간 포함'}</span>
          </span>
        </button>;
      })}
    </div>
    {options.length > 1 && <nav className="story-pagination" aria-label="코스 선택">
      <button type="button" aria-label="이전 코스" disabled={disabled || selected === 0} onClick={() => choose(selected - 1)}>←</button>
      <div>{options.map((option, index) => <button type="button" key={option.id} aria-label={`코스 ${index + 1} 선택`}
        aria-pressed={index === selected} className={index === selected ? 'active' : ''} disabled={disabled} onClick={() => choose(index)}>{index + 1}</button>)}</div>
      <button type="button" aria-label="다음 코스" disabled={disabled || selected === options.length - 1} onClick={() => choose(selected + 1)}>→</button>
    </nav>}
  </>;
}
