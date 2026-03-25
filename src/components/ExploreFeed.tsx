import { useState, useEffect } from 'react';

interface ExploreFeedProps {
  onOpenPopup: (seq: number, type: string) => void;
}

function ExploreFeed({ onOpenPopup }: ExploreFeedProps) {
  const [hotCourses, setHotCourses] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('loggedInUser');
    if (savedUser) {
      setUserId(JSON.parse(savedUser).userId);
    }

    const fetchHotCourses = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
        const response = await fetch(`${API_BASE_URL}/api/course/explore/hot-courses`);        
        const result = await response.json();
        if (result.success) {
          setHotCourses(result.courses);
        }
      } catch (error) {
        console.error("핫플 가져오기 에러 ㅠㅠ:", error);
      }
    };
    fetchHotCourses();
  }, []);

  const handleCardClick = async (courseId: number) => {
    onOpenPopup(courseId, 'saved');
    try {
      const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
      await fetch(`${API_BASE_URL}/api/course/explore/increase-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId })
      });

      setHotCourses(prevCourses => prevCourses.map(course => {
        if (course.id === courseId) {
          return { ...course, views: (course.views || 0) + 1 };
        }
        return course;
      }));
    } catch (error) {
      console.error("조회수 올리기 에러 ㅠㅠ:", error);
    }
  };

  const handleToggleLike = async (courseId: number) => {
    if (!userId) {
      alert("앗! 하트를 누르려면 로그인이 필요해용! 💕");
      return;
    }
    try {
      const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
      const response = await fetch(`${API_BASE_URL}/api/course/explore/toggle-like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, courseId })
      });
      const result = await response.json();
      if (result.success) {
        setHotCourses(prevCourses => prevCourses.map(course => {
          if (course.id === courseId) {
            return {
              ...course,
              likes: result.liked ? (course.likes || 0) + 1 : (course.likes || 0) - 1
            };
          }
          return course;
        }));
      }
    } catch (error) {
      console.error("하트 스위치 에러 ㅠㅠ:", error);
    }
  };

  // ✨ 코아가 수정한 카드 스타일 포인트!
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '25px',
    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '1px solid #f0f0f0',
    position: 'relative',
    overflow: 'hidden',
    // 🚀 여기가 핵심! 가로 크기를 고정하고 찌그러짐 방지
    width: '280px', 
    flexShrink: 0,
    scrollSnapAlign: 'start', // 스크롤 멈출 때 자석처럼 딱 붙게!
  };

  if (hotCourses.length === 0) return null;

  return (
    <div style={{ padding: '20px 0 20px 20px', backgroundColor: '#fafbfc', borderRadius: '25px', marginBottom: '25px' }}>
      <h2 style={{ margin: '0 0 15px 0', fontSize: '19px', color: '#333', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
        🔥 이번 주 가장 핫한 노플랜 코스
      </h2>
      
      {/* 🚀 가로 스크롤 컨테이너 */}
      <div style={{ 
        display: 'flex', 
        overflowX: 'auto', 
        gap: '15px', 
        paddingRight: '20px', // 마지막 카드 여백
        paddingBottom: '15px',
        scrollbarWidth: 'none', // 파이어폭스용
        msOverflowStyle: 'none', // IE용
        scrollSnapType: 'x mandatory', // 가로 스크롤 자석 효과
        WebkitOverflowScrolling: 'touch' // 모바일 부드러운 스크롤
      }}>
        {/* 크롬/사파리 스크롤바 숨기기용 스타일 태그 (간단하게 컴포넌트 안에 넣었어!) */}
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>

        {hotCourses.map((course) => (
          <div 
            key={course.id} 
            onClick={() => handleCardClick(course.id)}
            style={cardStyle}
            onMouseOver={(e)=>e.currentTarget.style.transform='translateY(-5px)'} 
            onMouseOut={(e)=>e.currentTarget.style.transform='translateY(0)'}
          >
            {course.review_image && (
              <img 
                src={course.review_image} 
                alt="썸네일" 
                style={{ width: 'calc(100% + 40px)', margin: '-20px -20px 10px -20px', height: '150px', objectFit: 'cover' }} 
              />
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {course.profileURL ? (
                <img src={course.profileURL} alt="프사" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#eee', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
              )}
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#444' }}>{course.user_nick || '노플래너'}</span>
            </div>
            
            <h3 style={{ fontSize: '17px', color: '#222', margin: '0', height: '48px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.4' }}>
              {course.title}
            </h3>
            
            <div style={{ display: 'flex', gap: '5px' }}>
              <span style={{ fontSize: '10px', color: '#007AFF', backgroundColor: '#eef7ff', padding: '4px 8px', borderRadius: '10px', fontWeight: 'bold' }}>#노플랜추천</span>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f8f8f8' }}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleLike(course.id);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#ff4b4b', fontWeight: 'bold', padding: 0 }}
              >
                ❤️ {course.likes || 0}
              </button>
              <span style={{ fontSize: '12px', color: '#aaa' }}>👁️ {course.views || 0}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ExploreFeed;