import React, { useState, useEffect } from 'react';

interface ExploreProps {
  onOpenPopup: (seq: number, type: string) => void;
}

function Explore({onOpenPopup}:ExploreProps) {
  const [allCourses, setAllCourses] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllCourses = async () => {
      const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
      try {
        const response = await fetch(`${API_BASE_URL}/api/explore-courses`);
        const result = await response.json();
        
        if (response.ok && result.success) {
          setAllCourses(result.courses);
        }
      } catch (error) {
        console.error("탐색 코스 가져오기 에러 ㅠㅠ", error);
      }
    };

    fetchAllCourses();
  }, []);

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '50px',
    padding: '20px 0'    
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '20px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    borderTop: '5px solid rgb(0, 122, 255)'
  };

  return (
    <div style={{ paddingBottom: '50px' }}>
      <h2 style={{ fontSize: '28px', color: 'rgb(51, 51, 51)', marginBottom: '10px', fontWeight: 800 }}>
        모두의 여행 탐색기 🗺️
      </h2>
      <p style={{ color: 'rgb(102, 102, 102)', marginBottom: '30px', fontSize: '16px' }}>
        다른 노플래너들은 어디로 떠났을까요? 마음에 드는 코스를 쏙쏙 골라보세요!
      </p>

      <div style={gridStyle}>
        {allCourses.length > 0 ? (
          allCourses.map(course => (
            <div 
              key={course.id} 
              style={cardStyle} 
              onMouseOver={(e)=>e.currentTarget.style.transform='translateY(-5px)'} 
              onMouseOut={(e)=>e.currentTarget.style.transform='translateY(0)'}
              onClick={() => {
                onOpenPopup(course.id, 'search');
              }}
            >
              <h3 style={{ fontSize: '18px', color: 'rgb(51, 51, 51)', margin: '0', wordBreak: 'keep-all', lineHeight: '1.4' }}>
                {course.title}
              </h3>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: 'rgb(0, 122, 255)', backgroundColor: 'rgb(230, 242, 255)', padding: '6px 12px', borderRadius: '15px', fontWeight: 'bold' }}>
                  인기 코스
                </span>
                <span style={{ fontSize: '12px', color: 'rgb(0, 122, 255)', backgroundColor: 'rgb(230, 242, 255)', padding: '6px 12px', borderRadius: '15px', fontWeight: 'bold' }}>
                  노플랜 추천
                </span>
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: 'rgb(136, 136, 136)' }}>아직 탐색할 코스가 없어요! 첫 코스의 주인공이 되어보세요!</p>
        )}
      </div>
    </div>
  );
}

export default Explore;