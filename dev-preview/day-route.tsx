import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TripWorkspace } from '../src/features/trips/TripWorkspace';
import { createTrip } from '../src/features/trips/tripModel';
import { setTourismAnchor } from '../src/features/trips/tourismModel';
import type { TourismAttraction } from '../src/api/tourismApi';
import places from './day-route-places.json';
import '../src/styles/index.css';

const sample = createTrip({ title: '울산, 하루의 발견', destination: '울산', startDate: '2026-09-20', endDate: '2026-09-20', transport: 'car', outbound: 'local', companion: '친구' });
for (const [index, name] of ['송정 박상진호수공원', '간절곶', '롯데백화점 울산점'].entries()) {
  sample.document = setTourismAnchor(sample.document, sample.document.days[0].id, sample.document.days[0].blocks[index].id, places.find(place => place.name === name) as TourismAttraction, 90);
}
createRoot(document.getElementById('root')!).render(<>
  <div style={{ padding: '10px 24px', background: '#342548', color: '#fff', fontSize: 12 }}>울산 하루 동선 미리보기 · 샘플 여행 · 운영 계정 저장 없음</div>
  <MemoryRouter initialEntries={[{ pathname: `/app/trips/${sample.id}`, state: { initialTrip: sample } }]}><Routes><Route path="/app/trips/:id" element={<TripWorkspace user={null} />} /></Routes></MemoryRouter>
</>);
