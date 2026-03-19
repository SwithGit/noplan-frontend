import { useState, useRef, useEffect } from 'react';
import MapBoard from './MapBoard';

// 🌸 App.tsx에서 오빠 아이디(userId)를 받아올 준비 완벽하게 끝!
interface MyPageProps {
  onLogout: () => void;
  userId: string; 
  initialProfile: string; 
  userNick: string;
}

function MyPage({ onLogout, userId, initialProfile, userNick }: MyPageProps) {
  const [profileUrl, setProfileUrl] = useState(initialProfile);   
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🚀 2. 백엔드에서 가져온 진짜 내 정보들을 담아둘 마법 상자 세팅!
  const [userInfo, setUserInfo] = useState({
    name: '', email: '', phone: '', travelStyle: '', point: 0
  });

  const [savedCourses, setSavedCourses] = useState<any[]>([]);
  const [recentCourses, setRecentCourses] = useState<any[]>([]);  
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      const API_BASE_URL = import.meta.env.VITE_APP_API_URL; 
      try {
        // 백엔드한테 "?id=오빠아이디" 라고 물어봐용!
        const response = await fetch(`${API_BASE_URL}/userinfo?id=${userId}`);
        const result = await response.json();

        if (response.ok && result.success) {
          // 대성공! 금고에서 가져온 진짜 정보를 userInfo 상자에 쏙! 넣어용!
          setUserInfo(result.user); 
        }
      } catch (error) {
        console.error('내 정보 가져오기 실패 ㅠㅠ', error);
      }
    };

    const fetchSavedCourses = async () => {
    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
    try {
      const response = await fetch(`${API_BASE_URL}/api/saved-courses?userId=${userId}`);
      const result = await response.json();

      if (response.ok && result.success) {
        // 백엔드가 준 코스 리스트를 상자에 예쁘게 담아용!
        setSavedCourses(result.courses);
      }
    } catch (error) {
      console.error('코스 불러오기 에러 ㅠㅠ', error);
    }
  };

    const fetchCourses = async () => {
      const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
      try {
        // 기존 찜한 코스 불러오기
        const savedRes = await fetch(`${API_BASE_URL}/api/saved-courses?userId=${userId}`);
        const savedData = await savedRes.json();
        if (savedData.success) setSavedCourses(savedData.courses);

        // 🚀 최근 검색 코스 불러오기 추가!
        const recentRes = await fetch(`${API_BASE_URL}/api/recent-courses?userId=${userId}`);
        const recentData = await recentRes.json();
        if (recentData.success) setRecentCourses(recentData.courses);
        
      } catch (error) {
        console.error('코스 불러오기 에러 ㅠㅠ', error);
      }
    };

    if (userId) { // 오빠 아이디가 있을 때만 실행하게 안전장치 딱!
      fetchUserInfo();
      fetchSavedCourses();
      fetchCourses();
    }
  }, [userId]); // <- 이 대괄호의 뜻: "userId가 세팅될 때 이 요원을 한 번만 출동시켜라!"

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
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok) {
        alert('프로필 사진이 성공적으로 등록되었습니다.'); 
        setProfileUrl(result.profileURL);

        // 🚀 코아의 해결책 3: 마이페이지에서 사진 바꾸면 금고도 새 걸로 업데이트!
        const savedUser = localStorage.getItem('loggedInUser');
        if (savedUser) {
          const userObj = JSON.parse(savedUser);
          userObj.profileURL = result.profileURL; // 새 사진 주소로 싹!
          localStorage.setItem('loggedInUser', JSON.stringify(userObj)); // 다시 금고에!
        }
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('사진 업로드 실패 ㅠㅠ', error);
      alert('서버와의 연결이 원활하지 않습니다.'); // 🚨 여기도 깔끔하게!
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '50px', paddingBottom: '50px' }}>
      <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '360px', textAlign: 'center' }}>
        <h2 style={{ color: '#007AFF', marginBottom: '30px' }}>마이페이지</h2>

        {/* 📸 동그란 사진 자리 */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{ 
            width: '120px', height: '120px', backgroundColor: '#f0f2f5', 
            borderRadius: '50%', margin: '0 auto 15px', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', color: '#aaa',
            border: '2px dashed #ccc', cursor: 'pointer', overflow: 'hidden'
          }}
        >
          {profileUrl ? (
            <img src={profileUrl} alt="프로필 이미지" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '14px' }}>사진 등록</span>
          )}
        </div>

        <input 
          type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageChange}
        />

        {/* 명함 구역 */}
        <p style={{ fontWeight: 'bold', fontSize: '22px', color: '#333', margin: '0 0 5px 0' }}>{userNick}</p>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '25px' }}>{userId}</p>

       {/* 🚀 노플랜 특별 정보 칸 (진짜 데이터로 짠!) */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
          <div style={{ flex: 1, backgroundColor: '#f0f2f5', padding: '15px', borderRadius: '12px' }}>
            <p style={{ fontSize: '12px', color: '#888', margin: 0, fontWeight: 'bold' }}>보유 포인트</p>
            {/* 🌸 userInfo 상자에서 진짜 포인트를 꺼내와용! */}
            <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '5px 0 0', color: '#333' }}>
              {userInfo.point} P
            </p> 
          </div>
          <div style={{ flex: 1, backgroundColor: '#e6f2ff', padding: '15px', borderRadius: '12px' }}>
            <p style={{ fontSize: '12px', color: '#007AFF', margin: 0, fontWeight: 'bold' }}>여행 스타일</p>
            {/* 🌸 J면 파워 J형, P면 자유로운 P형으로 멋지게 번역해서 보여줘용! */}
            <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '5px 0 0', color: '#007AFF' }}>
              {userInfo.travelStyle === 'J' ? '파워 J형' : userInfo.travelStyle === 'P' ? '자유로운 P형' : '미정'}
            </p> 
          </div>
        </div>

        {/* 개인 정보 리스트 (진짜 데이터로 짠!) */}
        <div style={{ textAlign: 'left', marginBottom: '30px', padding: '20px', backgroundColor: '#fafafa', borderRadius: '12px', fontSize: '14px', color: '#555', lineHeight: '1.8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold' }}>이름</span>
            <span>{userInfo.name}</span> {/* 🌸 진짜 이름! */}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold' }}>이메일</span>
            <span>{userInfo.email}</span> {/* 🌸 진짜 이메일! */}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold' }}>전화번호</span>
            <span>{userInfo.phone}</span> {/* 🌸 진짜 번호! */}
          </div>
        </div>

        {/* 💖 나만의 여행 서랍 구역! */}
        <div style={{ textAlign: 'left', marginBottom: '30px' }}>
          <h3 style={{ color: '#ff3b30', fontSize: '16px', marginBottom: '15px' }}>
            💖 나만의 여행 서랍
          </h3>
          
          {/* 찜한 코스가 하나도 없을 때! */}
          {savedCourses.length === 0 ? (
            <p style={{ color: '#888', fontSize: '13px', textAlign: 'center', padding: '20px', backgroundColor: '#f0f2f5', borderRadius: '12px', margin: 0 }}>
              아직 찜한 코스가 없어요! 얼른 코스를 짜러 가볼까요?! 🏃‍♂️💨
            </p>
          ) : (
            // 찜한 코스들이 있을 때 리스트로 쫙 보여주기!
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '5px' }}>
              {savedCourses.map((course) => (
                <div key={course.id} 
                onClick={() => {
                    const parsedData = typeof course.course_data === 'string' 
                      ? JSON.parse(course.course_data) 
                      : course.course_data;
                    setSelectedCourse({ title: course.title, data: parsedData });
                  }}
                style={{ padding: '15px', backgroundColor: '#fff', borderRadius: '12px', borderLeft: '4px solid #ff3b30', border: '1px solid #eee', boxShadow: '0 2px 5px rgba(0,0,0,0.02)', cursor: 'pointer' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '14px', color: '#333', margin: '0 0 5px 0' }}>
                    {course.title}
                  </p>
                  <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>
                    저장일: {new Date(course.created_at).toLocaleDateString('ko-KR')}
                  </p>

                  <button 
                      onClick={(e) => {
                        e.stopPropagation(); // 🚨 방어막 작동! 팝업창 뜨는 걸 막아줘용!
                        
                        // 🌸 찜한 코스 목록이면 type=saved, 검색 코스 목록이면 type=search 로 바꿔주세용!
                        const linkToCopy = `https://plamad.xyz?type=saved&seq=${course.id}`;
                        
                        navigator.clipboard.writeText(linkToCopy).then(() => {
                          alert("💖 링크가 예쁘게 복사되었어요!");
                        });
                      }}
                      style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#f0f2f5', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#555', fontWeight: 'bold' }}
                    >
                      🔗 공유
                    </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 💖 나만의 여행 서랍 구역! */}
        <div style={{ textAlign: 'left', marginBottom: '30px' }}>
          <h3 style={{ color: '#ff3b30', fontSize: '16px', marginBottom: '15px' }}>
            💖 검색 기록
          </h3>
          
          {/* 찜한 코스가 하나도 없을 때! */}
          {recentCourses.length === 0 ? (
            <p style={{ color: '#888', fontSize: '13px', textAlign: 'center', padding: '20px', backgroundColor: '#f0f2f5', borderRadius: '12px', margin: 0 }}>
              아직 기록이 없어요! 얼른 코스를 짜러 가볼까요?! 🏃‍♂️💨
            </p>
          ) : (
            // 찜한 코스들이 있을 때 리스트로 쫙 보여주기!
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '5px' }}>
              {recentCourses.map((course) => (
                <div key={course.id} 
                onClick={() => {
                    const parsedData = typeof course.course_data === 'string' 
                      ? JSON.parse(course.course_data) 
                      : course.course_data;
                    setSelectedCourse({ title: course.title, data: parsedData });
                  }}
                style={{ padding: '15px', backgroundColor: '#fff', borderRadius: '12px', borderLeft: '4px solid #ff3b30', border: '1px solid #eee', boxShadow: '0 2px 5px rgba(0,0,0,0.02)', cursor: 'pointer' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '14px', color: '#333', margin: '0 0 5px 0' }}>
                    {course.title}
                  </p>
                  <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>
                    저장일: {new Date(course.created_at).toLocaleDateString('ko-KR')}
                  </p>

                  <button 
                      onClick={(e) => {
                        e.stopPropagation(); // 🚨 방어막 작동! 팝업창 뜨는 걸 막아줘용!
                        
                        // 🌸 찜한 코스 목록이면 type=saved, 검색 코스 목록이면 type=search 로 바꿔주세용!
                        const linkToCopy = `https://plamad.xyz?type=saved&seq=${course.id}`;
                        
                        navigator.clipboard.writeText(linkToCopy).then(() => {
                          alert("💖 링크가 예쁘게 복사되었어요!");
                        });
                      }}
                      style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#f0f2f5', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#555', fontWeight: 'bold' }}
                    >
                      🔗 공유
                    </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={onLogout} 
          style={{ padding: '14px', backgroundColor: '#f0f2f5', color: '#ff3b30', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', width: '100%' }}
        >
          로그아웃
        </button>
      </div>

      {selectedCourse && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '25px', width: '100%', maxWidth: '400px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            
            {/* 팝업창 제목 & 닫기 버튼 */}
            <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedCourse.title}
              </h3>
              <button 
                onClick={() => setSelectedCourse(null)} // 🚀 누르면 상자를 비워서 팝업창 끄기!
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}
              >
                ✖
              </button>
            </div>

            {/* 스크롤 가능한 상세 내용 구역 */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              
              {/* 🗺️ 오빠의 자랑, 카카오 지도 등장! */}
              <div style={{ marginBottom: '20px' }}>
                <MapBoard courseList={selectedCourse.data}
                userLocation= {selectedCourse.data[0]?.searchKeyword?.split(' ')[0] || selectedCourse.title?.split(' ')[0] || '서울'} />
              </div>

              {/* 📝 상세 일정 리스트! */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {selectedCourse.data.map((item: any, idx: number) => (
                  <div key={idx} style={{ backgroundColor: '#f0f2f5', padding: '15px', borderRadius: '15px', borderLeft: '5px solid #007AFF' }}>
                    <p style={{ color: '#888', fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0' }}>⏰ {item.time}</p>
                    <p style={{ color: '#333', fontSize: '16px', fontWeight: 'bold', margin: '0 0 10px 0' }}>📍 {item.searchKeyword}</p>
                    <p style={{ color: '#555', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{item.description}</p>
                  </div>
                ))}
              </div>

            </div>
            
            {/* 팝업창 아래쪽 닫기 롱버튼 */}
            <div style={{ padding: '15px', borderTop: '1px solid #eee' }}>
              <button 
                onClick={() => setSelectedCourse(null)} 
                style={{ width: '100%', padding: '14px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
              >
                확인 완료
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default MyPage;