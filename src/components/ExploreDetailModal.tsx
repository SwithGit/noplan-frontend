import { useEffect, useRef } from 'react';
import type { CoursePlace, ExploreCourse } from '../types/noplan';
import { PlaceVisual } from './ui/PlaceVisual';

interface ExploreDetailModalProps {
  course: ExploreCourse;
  places: CoursePlace[];
  onClose: () => void;
  onLike: () => void;
  onUseCourse: () => void;
}

function expectedMinutes(places: CoursePlace[]) {
  const explicit = places.reduce((sum, place) => sum + (place.durationMinutes || 0), 0);
  return explicit || places.length * 90;
}

export default function ExploreDetailModal({ course, places, onClose, onLike, onUseCourse }: ExploreDetailModalProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const controls = [...dialogRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter((element) => !element.hasAttribute('disabled'));
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  const minutes = expectedMinutes(places);

  return (
    <div
      className="explore-preview-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section aria-labelledby="explore-preview-title" aria-modal="true" className="explore-preview-dialog" ref={dialogRef} role="dialog">
        <header>
          <div>
            <span>{course.location || '홍대입구 주변'}</span>
            <h2 id="explore-preview-title">{course.title}</h2>
          </div>
          <button aria-label="코스 미리보기 닫기" ref={closeRef} type="button" onClick={onClose}>×</button>
        </header>

        {course.review_image ? (
          <img alt={`${course.title} 대표 사진`} className="explore-preview-hero" src={course.review_image} />
        ) : (
          <div className="explore-preview-hero visual">
            <PlaceVisual alt={places[0]?.name} color={places[0]?.color} imageUrl={places[0]?.imageUrl} type={places[0]?.type} detailType={places[0]?.detailType} />
          </div>
        )}

        <div className="explore-preview-meta">
          <span>{places.length}곳</span>
          <span>약 {Math.max(1, Math.round(minutes / 60))}시간</span>
          <span>좋아요 {course.likes || 0} · 조회 {course.views || 0}</span>
        </div>

        {course.review_text && <blockquote>{course.review_text}</blockquote>}

        <ol className="explore-preview-route">
          {places.map((place, index) => (
            <li key={`${place.id}-${index}`}>
              <PlaceVisual alt={place.name} color={place.color} imageUrl={place.imageUrl} label={String(index + 1)} type={place.type} detailType={place.detailType} />
              <div><span>{place.category}</span><strong>{place.title}</strong><p>{place.summary}</p></div>
            </li>
          ))}
        </ol>

        <div className="explore-preview-actions">
          <button type="button" onClick={onLike}>좋아요 {course.likes || 0}</button>
          <button className="primary" type="button" onClick={onUseCourse}>이 코스로 출발</button>
        </div>
      </section>
    </div>
  );
}
