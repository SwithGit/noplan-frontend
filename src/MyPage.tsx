// src/MyPage.tsx
import React, { useState, useRef, useEffect } from 'react';

// 🚀 코아의 마법: App.tsx에서 만든 팝업 리모컨을 여기서도 쓸 수 있게 추가했어용!
interface MyPageProps {
  onLogout: () => void;
  userId: string; 
  initialProfile: string; 
  userNick: string;
  onOpenPopup: (seq: number, type: string) => void; 
}

function MyPage({ onLogout, userId, initialProfile, userNick, onOpenPopup }: MyPageProps) {
  const [profileUrl, setProfileUrl] = useState(initialProfile);   
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userInfo, setUserInfo] = useState({
    name: '', email: '', phone: '', travelStyle: '', point: 0
  });

  const [savedCourses, setSavedCourses] = useState<any[]>([]);
  const [recentCourses, setRecentCourses] = useState<any[]>([]);  
  
  // 🌸 코아의 트렌디 마법: '찜한 코스'랑 '검색 기록'을 왔다 갔다 할 수 있는 탭 상태!
  const [activeTab, setActiveTab] = useState<'saved' | 'recent'>('saved');

  useEffect(() => {
    const fetchUserInfo = async () => {
      const API_BASE_URL = import.meta.env.VITE_APP_API_URL; 
      try {
        const response = await fetch(`${API_BASE_URL}/userinfo?id=${userId}`);
        const result = await response.json();
        if (response.ok && result.success) setUserInfo(result.user); 
      } catch (error) { console.error('내 정보 가져오기 실패 ㅠㅠ', error); }
    };

    const fetchCourses = async () => {
      const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
      try {
        const savedRes = await fetch(`${API_BASE_URL}/api/saved-courses?userId=${userId}`);
        const savedData = await savedRes.json();
        if (savedData.success) setSavedCourses(savedData.courses);

        const recentRes = await fetch(`${API_BASE_URL}/api/recent-courses?userId=${userId}`);
        const recentData = await recentRes.json();
        if (recentData.success) setRecentCourses(recentData.courses);
      } catch (error) { console.error('코스 불러오기 에러 ㅠㅠ', error); }
    };

    if (userId) { 
      fetchUserInfo();
      fetchCourses();
    }
  }, [userId]); 

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setProfileUrl(preview);

    const formData = new FormData();
    formData.append('profileImage', file);
    formData.append('id', userId);

    const API_BASE_URL = import.meta.env.VITE_APP_API_URL; 

    try {
      const response = await fetch(`${API_BASE_URL}/upload-profile`, {
        method: 'POST', body: formData,
      });
      const result = await response.json();
      
      if (response.ok) {
        alert('프로필 사진이 성공적으로 등록되었습니다.'); 
        setProfileUrl(result.profileURL);

        const savedUser = localStorage.getItem('loggedInUser');
        if (savedUser) {
          const userObj = JSON.parse(savedUser);
          userObj.profileURL = result.profileURL; 
          localStorage.setItem('loggedInUser', JSON.stringify(userObj)); 
        }
      } else { alert(result.message); }
    } catch (error) {
      console.error('사진 업로드 실패 ㅠㅠ', error);
      alert('서버와의 연결이 원활하지 않습니다.'); 
    }
  };

  // 🚀 코아의 디자인 세팅!
  const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px', padding: '20px 0' };
  const cardStyle: React.CSSProperties = { backgroundColor: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '15px', cursor: 'pointer', transition: 'transform 0.2s', borderTop: '5px solid #ff3b30' };
  
  // 지금 선택된 탭에 따라 보여줄 리스트를 결정해용!
  const currentList = activeTab === 'saved' ? savedCourses : recentCourses;
  const currentType = activeTab === 'saved' ? 'saved' : 'search';

  return (
    <div style={{ paddingBottom: '50px' }}>
      
      {/* 🌸 상단 프로필 배너 구역 (넓고 시원하게!) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: '40px', borderRadius: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          {/* 📸 동그란 사진 자리 */}
          <div onClick={() => fileInputRef.current?.click()} style={{ width: '100px', height: '100px', backgroundColor: '#f0f2f5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', border: '2px dashed #ccc', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
            {profileUrl ? ( <img src={profileUrl} alt="프로필" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> ) : ( <span style={{ fontSize: '12px' }}>사진 등록</span> )}
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageChange} />

          {/* 명함 구역 */}
          <div>
            <h2 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '28px', fontWeight: 800 }}>{userNick}</h2>
            <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>{userInfo.email || userId}</p>
          </div>
        </div>

        {/* 🚀 노플랜 특별 정보 칸 */}
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ backgroundColor: '#f0f2f5', padding: '15px 25px', borderRadius: '15px', textAlign: 'center', minWidth: '100px' }}>
            <p style={{ fontSize: '13px', color: '#888', margin: 0, fontWeight: 'bold' }}>포인트</p>
            <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '5px 0 0', color: '#333' }}>{userInfo.point} P</p> 
          </div>
          <div style={{ backgroundColor: '#e6f2ff', padding: '15px 25px', borderRadius: '15px', textAlign: 'center', minWidth: '100px' }}>
            <p style={{ fontSize: '13px', color: '#007AFF', margin: 0, fontWeight: 'bold' }}>여행 스타일</p>
            <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '5px 0 0', color: '#007AFF' }}>
              {userInfo.travelStyle === 'J' ? '파워 J형' : userInfo.travelStyle === 'P' ? '자유로운 P형' : '미정'}
            </p> 
          </div>
          <button onClick={onLogout} style={{ padding: '0 20px', backgroundColor: '#fff', color: '#ff3b30', border: '1px solid #ff3b30', borderRadius: '15px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}>
            로그아웃
          </button>
        </div>
      </div>

      {/* 🌸 트렌디한 탭(Tab) 메뉴 구역! */}
      <div style={{ display: 'flex', gap: '30px', borderBottom: '2px solid #eee', marginBottom: '20px' }}>
        <span onClick={() => setActiveTab('saved')} style={{ paddingBottom: '15px', cursor: 'pointer', fontSize: '18px', fontWeight: activeTab === 'saved' ? 'bold' : 'normal', color: activeTab === 'saved' ? '#333' : '#aaa', borderBottom: activeTab === 'saved' ? '4px solid #333' : '4px solid transparent', transition: 'all 0.2s' }}>
          💖 찜한 코스 ({savedCourses.length})
        </span>
        <span onClick={() => setActiveTab('recent')} style={{ paddingBottom: '15px', cursor: 'pointer', fontSize: '18px', fontWeight: activeTab === 'recent' ? 'bold' : 'normal', color: activeTab === 'recent' ? '#333' : '#aaa', borderBottom: activeTab === 'recent' ? '4px solid #333' : '4px solid transparent', transition: 'all 0.2s' }}>
          🕒 최근 검색 기록 ({recentCourses.length})
        </span>
      </div>

      {/* 🚀 바둑판 카드 리스트 구역! */}
      <div style={gridStyle}>
        {currentList.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px 0', color: '#888' }}>
            <p style={{ fontSize: '40px', margin: '0 0 15px 0' }}>📭</p>
            아직 서랍이 텅 비어있어요! 얼른 코스를 짜러 가볼까요?! 🏃‍♂️💨
          </div>
        ) : (
          currentList.map((course) => (
            <div 
              key={course.id} 
              style={cardStyle} 
              onMouseOver={(e)=>e.currentTarget.style.transform='translateY(-5px)'} 
              onMouseOut={(e)=>e.currentTarget.style.transform='translateY(0)'}
              // 🚀 팝업 리모컨 띡!
              onClick={() => onOpenPopup(course.id, currentType)}
            >
              <h3 style={{ fontSize: '16px', color: '#333', margin: '0', wordBreak: 'keep-all', lineHeight: '1.4' }}>
                {course.title}
              </h3>
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                저장일: {new Date(course.created_at).toLocaleDateString('ko-KR')}
              </p>

              <div style={{ marginTop: 'auto', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // 🚨 팝업 안 뜨게 방어!
                    const linkToCopy = `${window.location.origin}/?seq=${course.id}&type=${currentType}`;
                    navigator.clipboard.writeText(linkToCopy).then(() => {
                      alert("💖 링크가 예쁘게 복사되었어요!");
                    });
                  }}
                  style={{ width: '100%', padding: '10px', fontSize: '13px', backgroundColor: '#f0f2f5', border: 'none', borderRadius: '10px', cursor: 'pointer', color: '#555', fontWeight: 'bold', transition: 'all 0.2s' }}
                  onMouseOver={(e)=>e.currentTarget.style.backgroundColor='#e4e6e9'}
                  onMouseOut={(e)=>e.currentTarget.style.backgroundColor='#f0f2f5'}
                >
                  🔗 친구에게 공유하기
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

export default MyPage;