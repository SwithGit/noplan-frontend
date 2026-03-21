// App.tsx
import { useState, useEffect } from 'react'
import Home from './Home'
import Login from './Login'
import Signup from './Signup'
import MyPage from './MyPage' // 🌸 새로 추가할 마이페이지 컴포넌트 예쁘게 불러오기!
import Chatbot from './Chatbot'
import MapBoard from './MapBoard'
import Explore from './Explore'

function App() {
  const [view, setView] = useState('home')
  
  // 오빠가 로그인했는지 기억하는 상태!
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loggedInId, setLoggedInId] = useState('') // 아이디!
  const [loggedInNick, setLoggedInNick] = useState('') // 닉네임
  const [loggedInProfile, setLoggedInProfile] = useState('') // 오빠 프사 주소!
  const [sharedCourse, setSharedCourse] = useState<any | null>(null);


  useEffect(() => {
    const savedUser = localStorage.getItem('loggedInUser');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setIsLoggedIn(true);
      
      // 🚀 코아의 해결책: 빈칸을 꽉꽉 채워주세용!
      setLoggedInId(parsedUser.userId); // 아까 저장할 때 userId로 넣었어용!
      setLoggedInNick(parsedUser.userNick);
      setLoggedInProfile(parsedUser.profileURL || '');      
    }

    const urlParams = new URLSearchParams(window.location.search);
    const sharedSeq = urlParams.get('seq');
    const sharedType = urlParams.get('type') || 'saved';
    
    // 주소창에 번호가 있으면 코아의 리모컨을 띡! 눌러줘용!
    if (sharedSeq) {
      openCoursePopup(Number(sharedSeq), sharedType);
    }
  }, []);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🚀 로그아웃 기능은 마이페이지로 넘겨주기 위해 따로 함수로 빼뒀어용!
  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    setIsLoggedIn(false);
    setView('home') // 로그아웃하면 로그인 화면으로 슝!
  }

  const navItemStyle = (active: boolean): React.CSSProperties => ({
    cursor: 'pointer', fontWeight: 'bold', fontSize: '15px',
    color: active ? '#007AFF' : '#555',
    textDecoration: 'none', transition: 'all 0.2s',
    display: 'flex', alignItems: 'center', gap: '8px'
  });

  const openCoursePopup = async (seq: number, type: string) => {
    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
    try {
      const response = await fetch(`${API_BASE_URL}/api/get-shared-course?seq=${seq}&type=${type}`);
      const result = await response.json();

      if (response.ok && result.success) {
        const parsedData = typeof result.course.course_data === 'string' 
          ? JSON.parse(result.course.course_data) 
          : result.course.course_data;

        setSharedCourse({ title: result.course.title, data: parsedData });
      }
    } catch (error) {
      console.error("팝업 코스 불러오기 실패 ㅠㅠ:", error);
    }
  };

  return(        
    <div style={{ fontFamily: '"Noto Sans KR", sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* 🚀 [Header] 모바일일 때는 위아래로 예쁘게 정렬! */}
      <header style={{
        display: 'flex', 
        // 🌸 폰이면 세로로, PC면 가로로!
        flexDirection: isMobile ? 'column' : 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        // 🌸 폰이면 여백을 팍 줄여용!
        padding: isMobile ? '15px' : '10px 60px', 
        gap: isMobile ? '15px' : '0',
        backgroundColor: 'white', boxShadow: '0 1px 5px rgba(0,0,0,0.03)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        {/* 왼쪽: 로고 (누르면 홈으로!) */}
        <div onClick={() => setView('home')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }}>
          <img src="/images/Logo.png" alt="📍 NoPlan" style={{ height: '32px' }}/>
        </div>

        <nav style={{ display: 'flex', gap: isMobile ? '15px' : '35px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span onClick={() => setView('home')} style={navItemStyle(view === 'home')}>🏠 홈</span>
          <span onClick={() => setView('chatbot')} style={navItemStyle(view === 'chatbot')}>🤖 AI 플래너</span>
          <span onClick={() => setView('explore')} style={navItemStyle(view === 'explore')}>✨ 탐색</span>
          {isLoggedIn && (
            <span onClick={() => setView('mypage')} style={navItemStyle(view === 'mypage')}>💖 서랍장</span>
          )}
        </nav>
          
        {/* 오른쪽: 로그인/회원가입 버튼 or 프로필 영역! */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {isLoggedIn ? (
            // 🌸 로그인 후: 프사 + 드롭다운 아이콘 (UX 전문가 비주얼!)
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setView('mypage')}>
              {loggedInProfile ? (
                <img src={loggedInProfile} alt="프사" style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e6f2ff' }} />
              ) : (
                <div style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '12px' }}>프로필</div>
              )}
              <span style={{ fontSize: '14px', color: '#333', fontWeight: 'bold' }}>{loggedInNick}님 ▼</span>
            </div>
          ) : (
            // 로그인 전: 로그인 버튼 (디자인 포인트!)
            <button 
              onClick={() => setView('login')}
              style={{
                padding: '8px 18px', backgroundColor: 'transparent', color: '#007AFF',
                border: '1.5px solid #007AFF', borderRadius: '20px', fontWeight: 'bold', fontSize: '13px',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseOver={(e)=>e.currentTarget.style.backgroundColor='#e6f2ff'}
              onMouseOut={(e)=>e.currentTarget.style.backgroundColor='transparent'}
            >
              로그인 / 회원가입
            </button>
          )}
        </div>
      </header>
      
      {/* 🚀 [Main] 내용 영역 (패딩 조절!) */}
      <main style={{ padding: isMobile ? '15px' : '30px 60px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* 🌸 메인 홈 (Gallery 대신 등장!) */}
        {view === 'home' && <Home onStartPlanner={() => setView('chatbot')} userNick={loggedInNick} onOpenPopup={openCoursePopup} />}
        
        {view === 'login' && 
          <Login 
            onLoginSuccess={(id, profileUrl, nickname) => { 
              const userToSave = { 
                userId: id, 
                userNick: nickname,
                profileURL: profileUrl || '' 
              };
              localStorage.setItem('loggedInUser', JSON.stringify(userToSave));
              
              setIsLoggedIn(true); 
              setLoggedInId(id);
              setLoggedInNick(nickname);
              setLoggedInProfile(profileUrl || ''); 
              setView('home'); // 🚀 로그인하면 홈 화면으로!
            }} 
            onGoToSignup={() => setView('signup')}
          />
        }
        {view === 'signup' && <Signup onGoToLogin={() => setView('login')}/>}

        {view === 'mypage' && <MyPage onLogout={handleLogout} userId={loggedInId} initialProfile={loggedInProfile} userNick={loggedInNick} onOpenPopup={openCoursePopup}/>}

        {view === 'chatbot' && <Chatbot userNick={loggedInNick} />}

        {view === 'explore' && <Explore onOpenPopup={openCoursePopup}/>}
      </main>

      {/* 🚀 공유 팝업 (기존 코드 그대로 유지!) */}
      {sharedCourse && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '25px', width: '100%', maxWidth: '400px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            
            <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>
                {sharedCourse.title}
              </h3>
              <button onClick={() => setSharedCourse(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>
                ✖
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: '20px' }}>
                <MapBoard courseList={sharedCourse.data} 
                userLocation= {sharedCourse.data[0]?.searchKeyword?.split(' ')[0] || sharedCourse.title?.split(' ')[0] || '서울'} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {sharedCourse.data.map((item: any, idx: number) => (
                  <div key={idx} style={{ backgroundColor: '#f0f2f5', padding: '15px', borderRadius: '15px', borderLeft: '5px solid #007AFF' }}>
                    <p style={{ color: '#888', fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0' }}>⏰ {item.time}</p>
                    <p style={{ color: '#333', fontSize: '16px', fontWeight: 'bold', margin: '0 0 10px 0' }}>📍 {item.searchKeyword}</p>
                    <p style={{ color: '#555', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ padding: '15px', borderTop: '1px solid #eee' }}>
              <button onClick={() => setSharedCourse(null)} style={{ width: '100%', padding: '14px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                확인 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
   )
}

export default App