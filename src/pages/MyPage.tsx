import { MyPageView } from '../features/my/MyPageView';
import type { UserSession } from '../types/noplan';

interface MyPageProps {
  onLogout?: () => void;
  user?: UserSession | null;
}

export default function MyPage({ onLogout = () => undefined, user = null }: MyPageProps) {
  return <MyPageView onLogout={onLogout} user={user} />;
}
