import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TripWorkspace } from '../src/features/trips/TripWorkspace';
import { TripJoin } from '../src/features/trips/TripSharing';
const friend = window.location.hostname === 'localhost';
const user = { userId: friend ? 'preview-bob' : 'preview-alice', userNick: friend ? '친구 서연' : '여행 만든 지민' };
const other = `http://${friend ? '127.0.0.1' : 'localhost'}:5201/dev-preview/trip-collaboration.html`;
createRoot(document.getElementById('root')!).render(<>
  <div style={{ padding: '12px 24px', background: '#342548', color: '#fff', fontFamily: 'sans-serif', fontSize: 14 }}>
    공동 편집 미리보기 · {user.userNick} · 샘플 계정/메모리 데이터 (운영 저장 없음)
    <a style={{ color: '#e5ccff', marginLeft: 20 }} href={other} target="_blank" rel="noreferrer">다른 친구 화면 열기 ↗</a>
  </div>
  <MemoryRouter initialEntries={[window.location.hash ? `/app/trips/join${window.location.hash}` : '/app/trips/demo-trip']}><Routes>
    <Route path="/app/trips/join" element={<TripJoin user={user} />} />
    <Route path="/app/trips/:id" element={<TripWorkspace user={user} />} />
  </Routes></MemoryRouter>
</>);
