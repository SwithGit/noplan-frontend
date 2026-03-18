import { useState, useRef, useEffect } from 'react';

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

    if (userId) { // 오빠 아이디가 있을 때만 실행하게 안전장치 딱!
      fetchUserInfo();
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
        alert('프로필 사진이 성공적으로 등록되었습니다.'); // 🚨 코아 말투 압수! 깔끔하게!
        setProfileUrl(result.profileURL);
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

        <button 
          onClick={onLogout} 
          style={{ padding: '14px', backgroundColor: '#f0f2f5', color: '#ff3b30', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', width: '100%' }}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}

export default MyPage;