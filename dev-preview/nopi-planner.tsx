import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TripWorkspace } from '../src/features/trips/TripWorkspace';
import { createTrip } from '../src/features/trips/tripModel';
import '../src/styles/index.css';
import '../src/styles/app-layout.css';
const sample = createTrip({ title: '울산, 우리들의 이틀', destination: '울산', startDate: '2026-09-20', endDate: '2026-09-21', transport: 'car', outbound: 'local', companion: '친구' });
createRoot(document.getElementById('root')!).render(<div style={{ background: '#fcfaff', minHeight: '100vh' }}>
  <div style={{ padding: '10px 24px', background: '#342548', color: '#fff', fontSize: 12 }}>노피의 코스플래닝 · 울산 2일 테스트 · 20대 여성 샘플 추천 · 운영 계정 저장 없음</div>
  <MemoryRouter initialEntries={[{ pathname: `/app/trips/${sample.id}`, state: { initialTrip: sample } }]}><Routes><Route path="/app/trips/:id" element={<TripWorkspace user={null} />} /></Routes></MemoryRouter>
</div>);
