import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TourismPicker } from '../src/features/trips/TourismPicker';
import type { TourismAttraction } from '../src/api/tourismApi';
import '../src/features/trips/trips.css';

export function UlsanTourismPreview() {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState<TourismAttraction>();
  const [duration, setDuration] = useState(90);
  return <main style={{ fontFamily: 'Pretendard, sans-serif', padding: 50, background: '#f6f2fa', minHeight: '100vh', color: '#342545' }}>
    <p>울산 관광지 추천 테스트</p><h1>여행의 중심을 골라보세요</h1>
    <p>실제 관광공사 데이터 · 샘플 회원: 20대 여성 · 운영 계정에 저장하지 않는 미리보기입니다.</p>
    <p>추천 연령대·성별을 바꿔 비교하거나 인기순·이름순으로 전환해 보세요.</p>
    {selected && <p role="status">선택한 관광지: {selected.name} · 관람 {duration}분</p>}
    <button className="trip-button primary" onClick={() => setOpen(true)}>중심 관광지 담기</button>
    {open && <TourismPicker destination="울산" initial={selected} initialDuration={duration} context="울산 시범 · 샘플 회원정보로 테스트" onClose={() => setOpen(false)} onSelect={(place, minutes) => { setSelected(place); setDuration(minutes); setOpen(false); }} />}
  </main>;
}
createRoot(document.getElementById('root')!).render(<UlsanTourismPreview />);
