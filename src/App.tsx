// App.tsx
import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom' // 🚀 라우팅 도구들 챙기기!
import Home from './pages/Home'
import Login from './pages/auth/Login'
import Privacy from './pages/Privacy'
import KakaoCallback from './pages/auth/KakaoCallback';
import KakaoSignup from './pages/auth/KakaoSignup';
import NaverCallback from './pages/auth/NaverCallback';
import NaverSignup from './pages/auth/NaverSignup';
import GoogleCallback from './pages/auth/GoogleCallback';
import GoogleSignup from './pages/auth/GoogleSignup';

import Signup from './pages/auth/Signup'
import MyPage from './pages/MyPage'
import Chatbot from './components/Chatbot'
import MapBoard from './components/MapBoard'
import Explore from './pages/Explore'
import ExploreFeed from './components/ExploreFeed'
import Supporters from './pages/Supporters'

function App() {
  // 🚀 코아의 라우팅 리모컨 등장!
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loggedInId, setLoggedInId] = useState('') 
  const [loggedInNick, setLoggedInNick] = useState('') 
  const [loggedInProfile, setLoggedInProfile] = useState('') 
  const [sharedCourse, setSharedCourse] = useState<any | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('loggedInUser');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setIsLoggedIn(true);
      setLoggedInId(parsedUser.userId); 
      setLoggedInNick(parsedUser.userNick);
      setLoggedInProfile(parsedUser.profileURL || '');     
    }

    const urlParams = new URLSearchParams(window.location.search);
    const sharedSeq = urlParams.get('seq');
    const sharedType = urlParams.get('type') || 'saved';
    
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

  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    setIsLoggedIn(false);
    navigate('/'); // 🚀 로그아웃하면 홈 화면(/)으로 슝!
  }

  // 🌸 현재 주소창(location.pathname)을 확인해서 활성화된 메뉴 색깔을 칠해줘용!
  const navItemStyle = (path: string): React.CSSProperties => ({
    cursor: 'pointer', fontWeight: 'bold', fontSize: '15px',
    color: location.pathname === path ? '#007AFF' : '#555',
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

        setSharedCourse({ title: result.course.title, location: result.course.location, data: parsedData });
      }
    } catch (error) {
      console.error("팝업 코스 불러오기 실패 ㅠㅠ:", error);
    }
  };

  return(        
    <div style={{ fontFamily: '"Noto Sans KR", sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <header style={{
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: isMobile ? '15px' : '10px 60px', 
        gap: isMobile ? '15px' : '0',
        backgroundColor: 'white', boxShadow: '0 1px 5px rgba(0,0,0,0.03)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }}>
          <img src="/images/Logo.png" alt="📍 NoPlan" style={{ height: '32px' }}/>
        </div>

        <nav style={{ display: 'flex', gap: isMobile ? '15px' : '35px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span onClick={() => navigate('/')} style={navItemStyle('/')}>🏠 홈</span>
          <span onClick={() => navigate('/chatbot')} style={navItemStyle('/chatbot')}>🤖 AI 플래너</span>
          <span onClick={() => navigate('/explore')} style={navItemStyle('/explore')}>✨ 탐색</span>
          {isLoggedIn && (
            <span onClick={() => navigate('/mypage')} style={navItemStyle('/mypage')}>💖 서랍장</span>
          )}
        </nav>
          
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {isLoggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/mypage')}>
              {loggedInProfile ? (
                <img src={loggedInProfile} alt="프사" style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e6f2ff' }} />
              ) : (
                <div style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '12px' }}>프로필</div>
              )}
              <span style={{ fontSize: '14px', color: '#333', fontWeight: 'bold' }}>{loggedInNick}님 ▼</span>
            </div>
          ) : (
            <button 
              onClick={() => navigate('/login')}
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
      
      <main style={{ padding: isMobile ? '15px' : '30px 60px', maxWidth: '1200px', margin: '0 auto' }}>
        {/* 🚀 조건부 렌더링(view === ...) 대신 Routes 보따리를 써용! */}
        <Routes>
          <Route path="/" element={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <ExploreFeed onOpenPopup={openCoursePopup}/> 
              <Home onStartPlanner={() => navigate('/chatbot')} userNick={loggedInNick} onOpenPopup={openCoursePopup} />
            </div>
          } />
          
          <Route path="/login" element={
            <Login 
              onLoginSuccess={(id, profileUrl, nickname) => { 
                const userToSave = { userId: id, userNick: nickname, profileURL: profileUrl || '' };
                localStorage.setItem('loggedInUser', JSON.stringify(userToSave));
                setIsLoggedIn(true); 
                setLoggedInId(id);
                setLoggedInNick(nickname);
                setLoggedInProfile(profileUrl || ''); 
                navigate('/'); // 🚀 로그인하면 홈으로!
              }} 
              onGoToSignup={() => navigate('/signup')}
            />
          } />

          <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
          <Route path="/auth/naver/callback" element={<NaverCallback />} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />

          <Route path="/kakao-signup" element={<KakaoSignup />} />
          <Route path="/naver-signup" element={<NaverSignup />} />
          <Route path="/google-signup" element={<GoogleSignup />} />

          <Route path="/privacy" element={<Privacy />} />
          <Route path="/signup" element={<Signup onGoToLogin={() => navigate('/login')} />} />
          
          <Route path="/mypage" element={
            <MyPage onLogout={handleLogout} userId={loggedInId} initialProfile={loggedInProfile} userNick={loggedInNick} onOpenPopup={openCoursePopup}/>
          } />
          
          <Route path="/chatbot" element={<Chatbot userNick={loggedInNick} />} />
          
          <Route path="/explore" element={<Explore />} />

          <Route path="/supporters" element={<Supporters />} />
        </Routes>
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
                userLocation={sharedCourse.location || '서울'}/>
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