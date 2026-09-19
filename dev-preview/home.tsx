import '../src/styles/index.css';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppFrame } from '../src/components/ui/AppFrame';
import { FavoritesProvider } from '../src/features/mobile/FavoritesProvider';
import { PlannerProvider } from '../src/features/planner/PlannerContext';
import { TripHome } from '../src/features/trips/TripHome';
import { TripCreatePage } from '../src/features/trips/TripCreatePage';
import { TripWorkspace } from '../src/features/trips/TripWorkspace';
import { EventsPage } from '../src/features/events/EventsPage';
import { EventDetail } from '../src/features/events/EventDetail';
import { ExploreEntry } from '../src/features/mobile/MobileEntries';
import { MobileFavorites } from '../src/features/mobile/MobileFavorites';
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/app']}><FavoritesProvider user={null}><PlannerProvider><AppFrame><Routes>
  <Route path="/app" element={<TripHome user={null} />} />
  <Route path="/app/explore" element={<ExploreEntry />} />
  <Route path="/app/favorites" element={<MobileFavorites />} />
  <Route path="/app/trips/new" element={<TripCreatePage user={null} />} />
  <Route path="/app/trips" element={<TripHome user={null} libraryOnly />} />
  <Route path="/app/trips/:id" element={<TripWorkspace user={null} />} />
  <Route path="/app/events" element={<EventsPage />} />
  <Route path="/app/events/:id" element={<EventDetail user={null} />} />
  <Route path="*" element={<p>이 미리보기에서는 홈·여행 만들기·축제·전시 화면을 확인할 수 있어요.</p>} />
</Routes></AppFrame></PlannerProvider></FavoritesProvider></MemoryRouter>);
