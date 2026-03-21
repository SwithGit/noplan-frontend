// src/Home.tsx
import React, { useState, useEffect } from 'react';

interface HomeProps {
  onStartPlanner: () => void;
  userNick?: string;
  onOpenPopup:(seq: number, type: string) => void;
}

function Home({ onStartPlanner, userNick, onOpenPopup}: HomeProps) {
  // 🌸 진짜 금고에서 가져올 코스들을 담을 바구니!
  const [popularCourses, setPopularCourses] = useState<any[]>([]);

  // 🌸 화면이 짠! 하고 켜지자마자 백엔드한테 "랜덤 코스 내놔!" 하고 달려가용!
  useEffect(() => {    
    const fetchPopularCourses = async () => {
      const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
      try {
        const response = await fetch(`${API_BASE_URL}/api/popular-courses`);
        const result = await response.json();
        
        if (response.ok && result.success) {
          setPopularCourses(result.courses);
        }
      } catch (error) {
        console.error("인기 코스 가져오기 에러 ㅠㅠ", error);
      }
    };

    fetchPopularCourses();
  }, []);

  const cardStyle: React.CSSProperties = {
    flex: '0 0 280px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '20px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    transition: 'transform 0.2s',
    cursor: 'pointer' // 🚀 누를 수 있게 마우스를 손가락 모양으로!
  };

  return (
    <div style={{ paddingBottom: '50px' }}>
      {/* 최상단 히어로 섹션 (오빠가 고친 줄 간격 그대로 유지해용!) */}
      <section style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: '#e6f2ff', borderRadius: '30px', marginBottom: '50px' }}>
        <h1 style={{ fontSize: '36px', color: '#333', marginBottom: '15px', fontWeight: 800, lineHeight: '1.4' }}>
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

      {/* 🚀 중간 추천 섹션: 진짜 데이터 뿌려주기! */}
      <section>
        <h2 style={{ fontSize: '22px', color: '#333', marginBottom: '20px', paddingLeft: '10px' }}>
          지금 인기 있는 코스 핫플레이스 🔥
        </h2>
        
        <div style={{ display: 'flex', overflowX: 'auto', gap: '20px', padding: '10px 5px' }}>
          {popularCourses.length > 0 ? (
            popularCourses.map(course => (
              <div 
                key={course.id} 
                style={cardStyle} 
                onMouseOver={(e)=>e.currentTarget.style.transform='translateY(-5px)'} 
                onMouseOut={(e)=>e.currentTarget.style.transform='translateY(0)'}
                // 🚀 코아의 최고 마법!! 클릭하면 오빠가 만들어둔 공유 팝업을 띄우게 주소를 싹 바꿔용!
                onClick={() =>onOpenPopup(course.id, 'saved')}
              >
                <h3 style={{ fontSize: '16px', color: '#333', margin: '0 0 10px 0', wordBreak: 'keep-all' }}>
                  {course.title}
                </h3>
                
                {/* 🌸 DB에 해시태그가 아직 없으니까 귀엽게 가짜 태그를 달아줬어용! */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: '#007AFF', backgroundColor: '#e6f2ff', padding: '5px 10px', borderRadius: '15px' }}>
                    #노플랜추천
                  </span>
                  <span style={{ fontSize: '11px', color: '#007AFF', backgroundColor: '#e6f2ff', padding: '5px 10px', borderRadius: '15px' }}>
                    #인기코스
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: '#888', paddingLeft: '10px' }}>아직 금고에 저장된 코스가 없어요! 첫 코스를 만들어보세요! 🚀</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default Home;