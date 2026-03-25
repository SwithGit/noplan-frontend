import React, { useState, useEffect } from 'react';

declare global {
  interface Window {
    kakao: any;
  }
}

interface DetailProps {
  course: any;
  onClose: () => void;
  userId: string | null;
  onUpdateLikes: (courseId: number, newLikes: number) => void;
}

function ExploreDetailModal({ course, onClose, userId, onUpdateLikes}: DetailProps) {    
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(course.likes);
  const API_BASE_URL = import.meta.env.VITE_APP_API_URL;

  // 🚀 이 부분이 오빠를 괴롭힌 에러(Unexpected token 'o') 잡는 핵심이야!
  const parsedCourseData = (() => {
    if (!course?.course_data) return [];
    
    // 이미 객체(Object)라면 그대로 반환하고, 문자열일 때만 JSON.parse를 해용!
    if (typeof course.course_data === 'object') {
      return Array.isArray(course.course_data) ? course.course_data : [];
    }

    try {
      const data = JSON.parse(course.course_data);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error("데이터 파싱 에러 ㅠㅠ", e);
      return [];
    }
  })();

  // 🚀 2. 지도 로직 (마커 + 이름표 + 빨간 점선)
 useEffect(() => {
  // 🚀 1. course.location (찐 동네 이름)이 없으면 아예 시작도 안 해용!
  if (!window.kakao || !window.kakao.maps || !parsedCourseData.length || !course.location) {
    console.error("❌ 동네 정보(location)가 없어요! DB를 확인해줘!");
    return;
  }

  const ps = new window.kakao.maps.services.Places();
  console.log(course.location);
  const userLocation = course.location; // 👈 오빠가 말한 그 '검색한 위치'!

  const findPlaces = async () => {
    console.log(`📍 [확정] 기준 동네: ${userLocation}`);

    const searchPromises = parsedCourseData.map((item: any) => {
      return new Promise<any>((resolve) => {
        const keyword = item.searchKeyword || item.title;
        // 🌸 오빠의 2단계 방어막 로직 그대로!
        const localKeyword = `${userLocation} ${keyword}`; 

        ps.keywordSearch(localKeyword, (data: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            resolve({ ...item, lat: data[0].y, lng: data[0].x });
          } else {
            // 동네 이름 붙여서 안 나오면 이름으로만 재검색
            ps.keywordSearch(keyword, (fbData: any, fbStatus: any) => {
              if (fbStatus === window.kakao.maps.services.Status.OK) {
                resolve({ ...item, lat: fbData[0].y, lng: fbData[0].x });
              } else {
                resolve(null);
              }
            });
          }
        });
      });
    });

    const results = await Promise.all(searchPromises);
    const validData = results.filter(r => r !== null);

    const container = document.getElementById('courseMap');
    if (!container) return;
    
    // 첫 번째 장소 좌표로 지도 초기화
    const firstLoc = new window.kakao.maps.LatLng(validData[0].lat, validData[0].lng);
    const map = new window.kakao.maps.Map(container, { center: firstLoc, level: 3 });
    const bounds = new window.kakao.maps.LatLngBounds();
    const linePath: any[] = [];

    validData.forEach((item) => {
      const loc = new window.kakao.maps.LatLng(item.lat, item.lng);
      new window.kakao.maps.Marker({ position: loc, map: map });
      
      const content = `<div style="padding:5px 10px; background:white; border:1px solid #007AFF; border-radius:5px; font-size:12px; font-weight:bold; position:relative; bottom:40px; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,0.1);">${item.title}</div>`;
      new window.kakao.maps.CustomOverlay({ position: loc, content: content }).setMap(map);
      
      linePath.push(loc);
      bounds.extend(loc);
    });

    if (linePath.length > 1) {
      new window.kakao.maps.Polyline({
        path: linePath, strokeWeight: 3, strokeColor: '#ff3b30', strokeOpacity: 0.7, strokeStyle: 'dash'
      }).setMap(map);
    }
    
    map.setBounds(bounds);
    map.relayout();
  };

  findPlaces();
}, [parsedCourseData, course.location]); // 🚀 course.location이 바뀔 때만 실행!
  // 🚀 3. 리뷰/좋아요 로직
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/course/explore/course-reviews/${course.id}`)
      .then(res => res.json())
      .then(data => { if (data.success) setReviews(data.reviews); });
  }, [course.id]);

    useEffect(() => {
  const initLikeStatus = async () => {
    if (!userId || !course.id) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/course/explore/check-like?userId=${userId}&courseId=${course.id}`);
      const data = await res.json();
      
      if (data.success) {
        setIsLiked(data.liked);
        // 서버에서 받아온 totalLikes가 있으면 그걸 쓰고, 없으면 원래 데이터(course.likes)라도 써!
        setLikesCount(data.totalLikes !== undefined ? data.totalLikes : (course.likes || 0)); 
      }
    } catch (e) {
      console.error("좋아요 동기화 에러 ㅠㅠ", e);
    }
  };

  initLikeStatus();
}, [course.id, userId]);

  const handleLike = async () => {
    if (!userId) return alert("로그인 부탁해요!");

    const res = await fetch(`${API_BASE_URL}/api/course/explore/toggle-like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, courseId: course.id })
    });
    
    const result = await res.json();
    if (result.success) {
      setIsLiked(result.liked);
      setLikesCount(result.currentLikes);
      
      // 🚀 여기서 부모(Explore)의 목록 데이터를 실시간으로 바꿔줘용!
      onUpdateLikes(course.id, result.currentLikes);
    }
  };

  const handleReviewSubmit = async () => {
    if (!newReview.trim()) return;
    const res = await fetch(`${API_BASE_URL}/api/course/explore/course-reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: course.id, userId, content: newReview, rating: 5 })
    });
    const result = await res.json();
    if (result.success) {
      setNewReview('');
      fetch(`${API_BASE_URL}/api/course/explore/course-reviews/${course.id}`).then(res => res.json()).then(data => setReviews(data.reviews));
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={headerStyle}>
        <button onClick={onClose} style={closeBtnStyle}>✕</button>
        <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 800 }}>{course.title}</h2>
        <div style={{width: '24px'}}></div>
      </div>

      <div style={contentContainerStyle}>
        <div style={courseBodyStyle}>
            <div style={{ padding: '0 20px', marginBottom: '30px' }}>
  
  {/* 1. 메인 인증샷 (이미지가 있을 때만 보여줘용!) */}
  {course.review_image && (
    <img 
      src={course.review_image} 
      alt="메인 인증샷" 
      style={{ 
        width: '100%', 
        height: '350px', 
        objectFit: 'cover', 
        borderRadius: '20px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
      }} 
    />
  )}

  {/* 2. 메인 후기 텍스트 (양꼬치 존맛탱 같은 거!) */}
  {course.review_text && (
    <div style={{ 
      marginTop: '20px', 
      textAlign: 'center', 
      fontSize: '18px', 
      fontWeight: 'bold', 
      color: '#333',
      lineHeight: '1.5'
    }}>
      "{course.review_text}"
    </div>
  )}
</div>

          {/* 🗺️ 상단 지도 구역 */}
          <div id="courseMap" style={mapContainerStyle}></div>

<div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
  {parsedCourseData.map((item: any, index: number) => (
    <div key={index} style={{ 
      backgroundColor: 'white', 
      padding: '25px', 
      borderRadius: '20px', 
      borderLeft: '6px solid #007AFF', // 🚀 오빠가 원하던 파란 바!
      boxShadow: '0 4px 15px rgba(0,0,0,0.05)', 
      marginBottom: '10px' 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{fontSize: '14px', color: '#888'}}>⏰ {item.time}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{fontSize: '20px'}}>📍</span>
        <span style={{fontSize: '20px', fontWeight: 'bold'}}>{item.title}</span>
      </div>
      {item.description && (
        <p style={{ fontSize: '15px', color: '#666', marginTop: '12px', lineHeight: '1.6' }}>
          {item.description}
        </p>
      )}
    </div>
  ))}
</div>
        </div>

        <hr style={{ border: '0.5px solid #eee', margin: '40px 0' }} />

        {/* 💬 리뷰 섹션 */}
        <div style={reviewSectionStyle}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, textAlign: 'center' }}>노플래너들의 한마디 ({reviews.length})</h3>
          
          <div style={reviewInputArea}>
            <input value={newReview} onChange={(e) => setNewReview(e.target.value)} placeholder="후기를 남겨줘요!" style={inputStyle} />
            
            {/* 🚀 하트 버튼: 드디어 오빠가 원하는 등록 버튼 옆으로! */}
            <button onClick={handleLike} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: '5px',
      color: isLiked ? '#ff4b4b' : '#ccc', // 꽉 찬 하트면 빨간색!
      fontWeight: 'bold', fontSize: '18px', transition: 'transform 0.2s'
    }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              {isLiked ? '❤️' : '🤍'} {likesCount}              
            </button>
            
            <button onClick={handleReviewSubmit} style={sendBtnStyle}>등록</button>
          </div>

          <div style={{ marginTop: '20px' }}>
            {reviews.map(rev => (
              <div key={rev.id} style={reviewCardStyle}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <img src={rev.profileURL || '/default-pfp.png'} style={{ width: '30px', height: '30px', borderRadius: '50%' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{rev.user_nick}</div>
                    <div style={{ fontSize: '14px', marginTop: '4px' }}>{rev.content}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 🎨 스타일 정의 ---
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'white', zIndex: 1000, overflowY: 'auto' };
const headerStyle: React.CSSProperties = { position: 'sticky', top: 0, backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #eee', zIndex: 10 };
const contentContainerStyle: React.CSSProperties = { maxWidth: '600px', margin: '0 auto', width: '100%', padding: '20px 0 80px 0' };
const courseBodyStyle: React.CSSProperties = { padding: '0 20px' };
const mapContainerStyle: React.CSSProperties = { width: '100%', height: '350px', backgroundColor: '#f0f0f0', borderRadius: '20px', marginBottom: '30px', border: '1px solid #eee' };


const reviewSectionStyle: React.CSSProperties = { padding: '0 20px' };
const reviewInputArea: React.CSSProperties = { display: 'flex', gap: '10px', marginTop: '15px', alignItems: 'center' };
const inputStyle: React.CSSProperties = { flex: 1, padding: '12px 15px', borderRadius: '20px', border: '1px solid #ddd', outline: 'none' };
const sendBtnStyle: React.CSSProperties = { padding: '10px 25px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' };
const reviewCardStyle: React.CSSProperties = { padding: '15px 0', borderBottom: '1px solid #f9f9f9' };
const closeBtnStyle: React.CSSProperties = { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' };

export default ExploreDetailModal;