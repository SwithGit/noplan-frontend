import React, { useState, useEffect } from 'react';
import ExploreDetailModal from './ExploreDetailModal';

// interface ExploreProps {
  
// }

function Explore() {
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'likes' | 'views'>('likes');
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('loggedInUser');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // 오빠 DB의 users.id는 문자열(varchar)이니까 그대로 담아줘용!
        setUserId(parsed.userId || parsed.id); 
      } catch (e) {
        console.error("로컬스토리지 유저 정보 파싱 에러:", e);
      }
    }
  }, []);

  useEffect(() => {
    const fetchAllCourses = async () => {
      const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
      try {
        // 🚀 URL 뒤에 정렬 옵션을 붙여서 서버한테 말해줘용!
        const response = await fetch(`${API_BASE_URL}/api/course/explore/explore-courses?sort=${sortBy}`);
        const result = await response.json();
        
        if (response.ok && result.success) {
          setAllCourses(result.courses);
        }
      } catch (error) {
        console.error("탐색 코스 가져오기 에러 ㅠㅠ", error);
      }
    };

    fetchAllCourses();
  }, [sortBy]);

  const handleCardClick = async (courseId: number) => {
  // 🚀 1. 전체 목록에서 클릭한 코스 찾기
  const clickedCourse = allCourses.find(c => c.id === courseId);
  setSelectedCourse(clickedCourse);

  // 🚀 2. 백엔드에 조회수 +1 택배 보내기 (기존 로직 유지)
  try {
    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
    await fetch(`${API_BASE_URL}/api/course/explore/increase-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId })
    });
  } catch (e) { console.error(e); }
};

// 🚀 하트 숫자를 실시간으로 목록에 반영하는 함수!
const updateCourseLikes = (courseId: number, newLikes: number) => {
  setAllCourses((prevCourses) =>
    prevCourses.map((course) =>
      course.id === courseId ? { ...course, likes: newLikes } : course
    )
  );
};

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '30px',
    padding: '20px 0'    
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '25px',
    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '1px solid #f0f0f0',
    position: 'relative',
    overflow: 'hidden'
  };

  return (
    <div style={{ paddingBottom: '50px' }}>
      <h2 style={{ fontSize: '28px', color: 'rgb(51, 51, 51)', marginBottom: '10px', fontWeight: 800 }}>
        모두의 여행 탐색기 🗺️
      </h2>
      <p style={{ color: 'rgb(102, 102, 102)', marginBottom: '30px', fontSize: '16px' }}>
        검증된 노플래너들의 찐 후기 코스만 모았어요! 📸
      </p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
        <button 
          onClick={() => setSortBy('likes')}
          style={{ padding: '10px 20px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: sortBy === 'likes' ? '#007AFF' : '#eee', color: sortBy === 'likes' ? 'white' : '#888', transition: '0.2s' }}
        >
          ❤️ 좋아요 순
        </button>
        <button 
          onClick={() => setSortBy('views')}
          style={{ padding: '10px 20px', borderRadius: '20px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: sortBy === 'views' ? '#007AFF' : '#eee', color: sortBy === 'views' ? 'white' : '#888', transition: '0.2s' }}
        >
          👁️ 조회수 순
        </button>
      </div>

      <div style={gridStyle}>
        {allCourses.length > 0 ? (
          allCourses.slice()
          .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0))
          .map(course => (
            <div 
              key={course.id} 
              style={cardStyle} 
              onMouseOver={(e)=> {
                e.currentTarget.style.transform='translateY(-8px)';
                e.currentTarget.style.boxShadow='0 12px 30px rgba(0,122,255,0.15)';
              }} 
              onMouseOut={(e)=> {
                e.currentTarget.style.transform='translateY(0)';
                e.currentTarget.style.boxShadow='0 8px 20px rgba(0,0,0,0.06)';
              }}
              onClick={() => handleCardClick(course.id)}
            >
              {/* 📸 인증샷이 있다면 썸네일로 딱! */}
              {course.review_image && (
                <img src={course.review_image} alt="썸네일" style={{ width: 'calc(100% + 50px)', margin: '-25px -25px 10px -25px', height: '160px', objectFit: 'cover' }} />
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                {course.profileURL ? (
                  <img src={course.profileURL} alt="프사" style={{ width: '25px', height: '25px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #eee' }} />
                ) : (
                  <div style={{ width: '25px', height: '25px', borderRadius: '50%', backgroundColor: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '10px' }}>No</div>
                )}
                
                <span style={{ fontSize: '13px', color: '#555', fontWeight: 'bold' }}>
                  {course.user_nick || '노플래너'} 
                </span>
                <span style={{ fontSize: '12px', color: '#bbb' }}>님의 기록</span>
              </div>
              
              <h3 style={{ fontSize: '18px', color: '#333', margin: '0', wordBreak: 'keep-all', lineHeight: '1.4', fontWeight: 700 }}>
                {course.title}
              </h3>

              <div style={{ display: 'flex', gap: '5px' }}>
                 <span style={{ fontSize: '11px', color: '#007AFF', backgroundColor: '#e6f2ff', padding: '5px 10px', borderRadius: '15px' }}>#노플랜추천</span>
                 <span style={{ fontSize: '11px', color: '#007AFF', backgroundColor: '#e6f2ff', padding: '5px 10px', borderRadius: '15px' }}>#인기코스</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                   <span style={{ fontSize: '12px', color: '#ff4b4b', fontWeight: 'bold' }}>❤️ {course.likes || 0}</span>
                   <span style={{ fontSize: '12px', color: '#888' }}>👁️ {course.views || 0}</span>
                </div>
                <span style={{ fontSize: '11px', color: '#bbb' }}>{new Date(course.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 0' }}>
             <p style={{ fontSize: '50px', margin: 0 }}>🏜️</p>
             <p style={{ color: '#888', marginTop: '10px' }}>아직 다녀온 코스가 없나 봐요! 첫 인증의 주인공이 되어보세요!</p>
          </div>
        )}
      </div>

      {/* 🚀 코아의 팝업 소환술! */}
   {selectedCourse && (
    <ExploreDetailModal 
      course={selectedCourse} 
      onClose={() => setSelectedCourse(null)} 
      userId={userId} 
      onUpdateLikes={updateCourseLikes} // 👈 이 줄 추가!
    />
  )}
    </div>
  );
}

export default Explore;