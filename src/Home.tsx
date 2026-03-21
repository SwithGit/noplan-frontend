// src/Home.tsx
import { useEffect } from 'react';

interface HomeProps {
  onStartPlanner: () => void;
  userNick?: string;
  onOpenPopup:(seq: number, type: string) => void;
}

function Home({ onStartPlanner, userNick}: HomeProps) {
  

  // 🌸 화면이 짠! 하고 켜지자마자 백엔드한테 "랜덤 코스 내놔!" 하고 달려가용!
  useEffect(() => {    
  }, []);

  return (
    <div style={{ paddingBottom: '50px' }}>
      {/* 최상단 히어로 섹션 (오빠가 고친 줄 간격 그대로 유지해용!) */}
      <section style={{ textAlign: 'center', padding: '80px 10px', backgroundColor: '#e6f2ff', borderRadius: '30px', marginBottom: '50px' }}>
        <h1 style={{ fontSize: '32px', color: '#333', marginBottom: '15px', fontWeight: 800, lineHeight: '1.4' }}>
          {userNick ? `${userNick}님,` : ''} 계획 없는 여행,<br />
          AI가 완벽하게 짜드릴게요.
        </h1>
        <p style={{ fontSize: '16px', color: '#666', marginBottom: '30px', lineHeight: '1.6' }}>
          어디로 갈지, 몇 시에 갈지만 정하세요.<br />
          '노플랜' AI 가이드 코아가 취향 맞춤 코스를 대령합니다!
        </p>
        <button onClick={onStartPlanner} style={{ padding: '15px 30px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '30px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 122, 255, 0.3)' }}>
          🚀 AI 플래너 시작하기
        </button>
      </section>
    </div>
  );
}

export default Home;