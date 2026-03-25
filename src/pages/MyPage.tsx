// src/MyPage.tsx
import React, { useState, useRef, useEffect } from 'react';

declare global {
  interface Window {
    IMP: any;
  }
}

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

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewImage, setReviewImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);  
  
  const [activeTab, setActiveTab] = useState<'saved' | 'visited' | 'recent'>('saved');

  // 🚀 코아의 마법: 어디서든 다시 부를 수 있게 코스 불러오는 함수를 밖으로 꺼냈어용!
  const fetchCourses = async () => {
    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
    try {
      const savedRes = await fetch(`${API_BASE_URL}/api/mypage/saved-courses?userId=${userId}`);
      const savedData = await savedRes.json();
      if (savedData.success) setSavedCourses(savedData.courses);

      const recentRes = await fetch(`${API_BASE_URL}/api/mypage/recent-courses?userId=${userId}`);
      const recentData = await recentRes.json();
      if (recentData.success) setRecentCourses(recentData.courses);
    } catch (error) { console.error('코스 불러오기 에러 ㅠㅠ', error); }
  };

  const handleSubmitReview = async () => {
    if (!selectedCourseId) return;

    const savedUser = localStorage.getItem('loggedInUser');
    if (!savedUser) return;
    const { userId } = JSON.parse(savedUser);

    const formData = new FormData();
    formData.append('courseId', selectedCourseId.toString());
    formData.append('reviewText', reviewText);
    formData.append('userId', userId);
    if (reviewImage) {
      formData.append('reviewImage', reviewImage);
    }

    try {
      const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
      const response = await fetch(`${API_BASE_URL}/api/mypage/add-record`, {
        method: 'POST',
        body: formData, 
      });
      const result = await response.json();

      if (result.success) {        
        setReviewModalOpen(false);
        setReviewText('');
        setReviewImage(null);
        setImagePreview(null);
        
        // 🌸 코아의 마법: 새로고침 대신 화면의 데이터만 샥! 바꿔치기해용!
        setSavedCourses(prev => prev.map(course => {
          if (course.id === selectedCourseId) {
            return { ...course, is_visited: true, review_text: reviewText, review_image: result.imageUrl };
          }
          return course;
        }));
        
        // 🌸 리뷰 썼으니까 오빠 포인트도 500점 바로 뿅! 올려주기!
        setUserInfo(prev => ({ ...prev, point: prev.point + 500 }));
        
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("리뷰 저장 에러 ㅠㅠ:", error);
    }
  };

  const handleSaveRecent = async (e: any, course: any) => {
    e.stopPropagation();
    
    const savedUser = localStorage.getItem('loggedInUser');
    if (!savedUser) return;
    const { userId } = JSON.parse(savedUser);

    try {
      const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
      const response = await fetch(`${API_BASE_URL}/api/mypage/save-course`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          title: course.title,
          location: course.location,
          courseData: typeof course.course_data === 'string' ? JSON.parse(course.course_data) : (course.course_data || course.courseData)
        })
      });

      const result = await response.json();
      if (result.success) {
        alert("💖 마이페이지 '찜한 코스' 서랍에 쏙! 들어갔어요!");
        // 🚀 코아의 마법: 새로고침 대신 서랍장(DB)을 다시 한번 조용히 열어봐용!
        fetchCourses(); 
      } else {
        alert("앗! 저장에 실패했어요 ㅠㅠ");
      }
    } catch (error) {
      console.error("최근 코스 찜하기 에러 ㅠㅠ:", error);
    }
  };

  useEffect(() => {
    const fetchUserInfo = async () => {
      const API_BASE_URL = import.meta.env.VITE_APP_API_URL; 
      try {
        const response = await fetch(`${API_BASE_URL}/api/mypage/userinfo?id=${userId}`);
        const result = await response.json();
        if (response.ok && result.success) setUserInfo(result.user); 
      } catch (error) { console.error('내 정보 가져오기 실패 ㅠㅠ', error); }
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
      const response = await fetch(`${API_BASE_URL}/api/mypage/upload-profile`, {
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

  const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px', padding: '20px 0' };
  const cardStyle: React.CSSProperties = { backgroundColor: 'white', padding: '20px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '15px', cursor: 'pointer', transition: 'transform 0.2s', borderTop: '5px solid #ff3b30' };
  
  let currentList = activeTab === 'saved' ? savedCourses : recentCourses;
  let currentType = activeTab === 'saved' ? 'saved' : 'search';

  if (activeTab === 'recent') {
    currentList = recentCourses; 
    currentType = 'search';
  } else if (activeTab === 'saved') {
    currentList = savedCourses.filter((course) => !course.is_visited);
    currentType = 'saved';
  } else if (activeTab === 'visited') {
    currentList = savedCourses.filter((course) => course.is_visited);
    currentType = 'saved';
  }

  // const handlePayment = () => {
  //   const IMP = window.IMP;
  //   // 오빠의 식별코드로 결제 모듈을 깨워용!
  //   IMP.init(import.meta.env.VITE_PORTONE_STORE_ID);

  //   const data = {
  //     pg: 'html5_inicis', // 테스트용 PG사 (이니시스)
  //     pay_method: 'card', // 결제수단 (신용카드)
  //     merchant_uid: `mid_${new Date().getTime()}`, // 주문번호 (절대 겹치면 안 돼서 현재 시간으로 만들어용!)
  //     name: '노플랜 5,000 포인트 충전', // 고객님 결제창에 뜰 예쁜 상품명
  //     amount: 5000, // 결제 금액 (숫자로!)
  //     buyer_email: 'customer@noplan.com', 
  //     buyer_name: userNick || '노플랜고객',
  //   };

  //   // 결제창을 짠! 하고 띄워용
  //   IMP.request_pay(data, async (response: any) => {
  //     if (response.success) {
  //       // 결제가 성공하면 포트원이 영수증 번호(imp_uid)를 줘용!
  //       console.log('결제 성공 영수증:', response.imp_uid);
  //       alert('결제가 완료되었습니다. 포인트 충전을 진행합니다.');
        
  //       // 백엔드로 영수증을 보내서 진짜 결제됐는지 검사하고 포인트를 올릴 거예용! (다음 단계에서 짤 코드!)
  //       // verifyPayment(response.imp_uid, 5000); 
  //     } else {
  //       alert(`결제에 실패하였습니다. 사유: ${response.error_msg}`);
  //     }
  //   });
  // };
  
  return (
    <div style={{ paddingBottom: '50px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: '40px', borderRadius: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <div onClick={() => fileInputRef.current?.click()} style={{ width: '100px', height: '100px', backgroundColor: '#f0f2f5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', border: '2px dashed #ccc', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
            {profileUrl ? ( <img src={profileUrl} alt="프로필" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> ) : ( <span style={{ fontSize: '12px' }}>사진 등록</span> )}
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageChange} />

          <div>
            <h2 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '28px', fontWeight: 800 }}>{userNick}</h2>
            <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>{userInfo.email || userId}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, backgroundColor: '#f0f2f5', padding: '15px 10px', borderRadius: '15px', textAlign: 'center', minWidth: '100px' }}>
            <p style={{ fontSize: '13px', color: '#888', margin: 0, fontWeight: 'bold' }}>포인트</p>
            <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '5px 0 0', color: '#333' }}>{userInfo.point} P</p> 
          </div>
          <div style={{ flex: 1, backgroundColor: '#e6f2ff', padding: '15px 10px', borderRadius: '15px', textAlign: 'center', minWidth: '100px' }}>
            <p style={{ fontSize: '13px', color: '#007AFF', margin: 0, fontWeight: 'bold' }}>여행 스타일</p>
            <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '5px 0 0', color: '#007AFF' }}>
              {userInfo.travelStyle === 'J' ? '파워 J형' : userInfo.travelStyle === 'P' ? '자유로운 P형' : '미정'}
            </p> 
          </div>
          <button 
            onClick={onLogout} 
            style={{ 
              padding: '10px 20px', backgroundColor: '#fff', color: '#ff3b30', border: '1px solid #ff3b30', borderRadius: '15px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', wordBreak: 'keep-all'
            }}>
            로그아웃
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={() => setActiveTab('recent')} 
            style={{ flex: 1, padding: '12px', borderRadius: '15px', fontWeight: 'bold', border: 'none', backgroundColor: activeTab === 'recent' ? '#007AFF' : '#f0f2f5', color: activeTab === 'recent' ? 'white' : '#888', cursor: 'pointer', transition: 'all 0.2s' }}>
            👀 최근
          </button>
          <button 
            onClick={() => setActiveTab('saved')} 
            style={{ flex: 1, padding: '12px', borderRadius: '15px', fontWeight: 'bold', border: 'none', backgroundColor: activeTab === 'saved' ? '#007AFF' : '#f0f2f5', color: activeTab === 'saved' ? 'white' : '#888', cursor: 'pointer', transition: 'all 0.2s' }}>
            💖 찜한 곳
          </button>
          <button 
            onClick={() => setActiveTab('visited')} 
            style={{ flex: 1, padding: '12px', borderRadius: '15px', fontWeight: 'bold', border: 'none', backgroundColor: activeTab === 'visited' ? '#007AFF' : '#f0f2f5', color: activeTab === 'visited' ? 'white' : '#888', cursor: 'pointer', transition: 'all 0.2s' }}>
            📸 다녀옴
          </button>
        </div>

      <div style={gridStyle}>
          {currentList.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px 0', color: '#888' }}>
              <p style={{ fontSize: '40px', margin: '0 0 15px 0' }}>📭</p>
              {activeTab === 'recent' && '최근 본 코스가 없어요! AI랑 수다 떨러 갈까요?!'}
              {activeTab === 'saved' && '아직 찜한 코스가 없어요! 맘에 드는 코스를 찜해봐요!'}
              {activeTab === 'visited' && '아직 다녀온 코스가 없어요! 노플랜과 함께 떠나볼까요?! 🏃‍♂️💨'}
            </div>
          ) : (
            currentList.map((course) => (
              <div 
                key={course.id} 
                style={cardStyle} 
                onMouseOver={(e)=>e.currentTarget.style.transform='translateY(-5px)'} 
                onMouseOut={(e)=>e.currentTarget.style.transform='translateY(0)'}
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
                      e.stopPropagation(); 
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

                {course.is_visited ? (
                  <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '15px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#007AFF' }}>✅ 코아가 추천한 곳 다녀오셨군요!</p>
                    {course.review_text && <p style={{ fontSize: '13px', color: '#555', marginTop: '8px', lineHeight: '1.4' }}>"{course.review_text}"</p>}
                    {course.review_image && <img src={course.review_image} alt="인증샷" style={{ width: '100%', height: '120px', borderRadius: '10px', marginTop: '10px', objectFit: 'cover' }} />}
                  </div>
                ) : (
                  activeTab !== 'recent' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCourseId(course.id);
                        setReviewModalOpen(true);
                      }}
                      style={{ width: '100%', marginTop: '15px', padding: '12px', backgroundColor: '#fedc3e', color: '#391b1b', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                    >
                      📸 다녀왔어요! 인증하기
                    </button>
                  )
                )}

                    {activeTab === 'recent' && (
                      <button
                        onClick={(e) => handleSaveRecent(e, course)}
                        style={{ width: '100%', marginTop: '15px', padding: '12px', backgroundColor: '#ff5a5f', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                      >
                        💖 내 서랍으로 찜하기
                      </button>
                    )}
              </div>
            ))
          )}
        </div>

      {reviewModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '25px', width: '320px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: 0, color: '#333' }}>📸 소중한 여행 기록 남기기</h3>
            
            <textarea 
              placeholder= "이번 노플랜 여행은 어땠나요? 감상평을 적어주세요!"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              style={{ width: '100%', height: '90px', padding: '15px', borderRadius: '15px', border: '1px solid #ddd', boxSizing: 'border-box', outline: 'none', resize: 'none', color: '#333' }}
            />

            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setReviewImage(e.target.files[0]);
                  setImagePreview(URL.createObjectURL(e.target.files[0]));
                }
              }}
              style={{ fontSize: '12px' }}
            />
            
            {imagePreview && <img src={imagePreview} alt="미리보기" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '15px' }} />}

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => { setReviewModalOpen(false); setImagePreview(null); setReviewImage(null); setReviewText(''); }} style={{ flex: 1, padding: '12px', backgroundColor: '#f0f2f5', color: '#555', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>취소</button>
              <button onClick={handleSubmitReview} style={{ flex: 1, padding: '12px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>저장하기</button>
            </div>
          </div>
        </div>
      )}

      
    {/* <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#fff', borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>VIP 포인트 충전</h3>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
          노플랜의 프리미엄 기능을 이용하기 위해 포인트를 충전해보세요.
        </p>
        <button 
          onClick={handlePayment} 
          style={{ padding: '12px 25px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          💳 5,000 포인트 충전하기
        </button>
      </div> */}
    </div>
  );
}

export default MyPage;