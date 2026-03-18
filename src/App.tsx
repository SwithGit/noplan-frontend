// App.tsx
import { useState, useEffect } from 'react'
import Gallery from './Gallery'
import Login from './Login'
import Signup from './Signup'
import MyPage from './MyPage' // 🌸 새로 추가할 마이페이지 컴포넌트 예쁘게 불러오기!
import Chatbot from './Chatbot'

function App() {
  const [view, setView] = useState('gallery')
  
  // 오빠가 로그인했는지 기억하는 상태!
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loggedInId, setLoggedInId] = useState('') // 아이디!
  const [loggedInNick, setLoggedInNick] = useState('') // 닉네임
  const [loggedInProfile, setLoggedInProfile] = useState('') // 오빠 프사 주소!
  const [userInfo, setUserInfo] = useState(null);

  const [places, setPlaces] = useState([
    { id: 1, name: '태화강 국가정원🎋', desc: '십리대숲이 진짜 좋아!', image:"" },
    { id: 2, name: '간절곶 ☀️', desc: '해 뜰 때 가보자용!',  image:"" }
  ])

  const deletePlace = (id: number) => {
    setPlaces(places.filter(p => p.id !== id))
  }

  useEffect(() => {
    const savedUser = localStorage.getItem('loggedInUser');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUserInfo(parsedUser);
      setIsLoggedIn(true);
      
      // 🚀 코아의 해결책: 빈칸을 꽉꽉 채워주세용!
      setLoggedInId(parsedUser.userId); // 아까 저장할 때 userId로 넣었어용!
      setLoggedInNick(parsedUser.userNick);
      setLoggedInProfile(parsedUser.profileURL || '');
    }
  }, []);

  // 🚀 로그아웃 기능은 마이페이지로 넘겨주기 위해 따로 함수로 빼뒀어용!
  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    setIsLoggedIn(false);
    setUserInfo(null);
    setView('login') // 로그아웃하면 로그인 화면으로 슝!
  }

  return(        
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '15px 40px', backgroundColor: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <img src="/images/Logo.png"
         alt="📍 NoPlan" 
         onClick={() => setView('gallery')}
         style={{ 
         height: '40px', // 로고 높이를 예쁘게 조절해용!
         cursor: 'pointer' // 마우스 올리면 손가락 모양 나오게!
        }}/>
        
        <nav style={{ display: 'flex', gap: '30px' }}>
          <span 
            onClick={() => setView('gallery')}
            style={{ 
              cursor: 'pointer', fontWeight: 'bold',
              color: view === 'gallery' ? '#007AFF' : '#888' 
            }}
          >
            3D 갤러리
          </span>

          {isLoggedIn && (
            <span 
              onClick={() => setView('chatbot')} // 🚀 누르면 챗봇 화면으로 슝!
              style={{ 
                cursor: 'pointer', fontWeight: 'bold',
                color: view === 'chatbot' ? '#007AFF' : '#333', // 선택되면 파랗게!
                backgroundColor: view === 'chatbot' ? '#e6f2ff' : 'transparent', // 배경도 살짝!
                padding: '8px 15px', borderRadius: '20px', transition: 'all 0.3s'
              }}
            >
              🔍 코스 찾기
            </span>
          )}
          
          {/* 🌸 로그인 상태일 때 '마이페이지' 버튼으로 변신! */}
          {isLoggedIn ? (
            <span 
              onClick={() => setView('mypage')}
              style={{ 
                cursor: 'pointer', fontWeight: 'bold', 
                color: view === 'mypage' ? '#007AFF' : '#888' 
              }}
            >
              마이페이지
            </span>
          ) : (
            <span 
              onClick={() => setView('login')}
              style={{ 
                cursor: 'pointer', fontWeight: 'bold',
                color: view === 'login' ? '#007AFF' : '#888' 
              }}
            >
              로그인
            </span>
          )}
        </nav>
      </header>
      
      <main style={{ padding: '40px' }}>
        {view === 'gallery' && <Gallery places={places} onDelete={deletePlace} />}
        
        {view === 'login' && 
          <Login 
            // 🚀 로그인 성공하면 아이디랑 프사 주소, 닉네임을 가져와용!
            onLoginSuccess={(id, profileUrl, nickname) => { 
              // 🌸 코아의 해결책 1: 금고에 넣을 보따리를 더 빵빵하게 만들어용!
              const userToSave = { 
                userId: id, 
                userNick: nickname,
                // 🚀 사진 주소도 꼭! 같이 금고에 넣어줘야 해용!
                profileURL: profileUrl || '' 
              };
              localStorage.setItem('loggedInUser', JSON.stringify(userToSave));
              
              setIsLoggedIn(true); 
              setLoggedInId(id);
              setLoggedInNick(nickname);
              // 프로필 상태도 세팅! (이건 원래 잘하셨어용!)
              setLoggedInProfile(profileUrl || ''); 
              setView('gallery'); 
            }} 
            onGoToSignup={() => setView('signup')}
          />
        }
        {view === 'signup' && <Signup onGoToLogin={() => setView('login')}/>}

        {/* 🌸 드디어 오빠의 공간, 마이페이지 등장! 로그아웃 리모컨도 같이 넘겨줘용! */}
        {view === 'mypage' && <MyPage onLogout={handleLogout} userId={loggedInId} initialProfile={loggedInProfile} userNick={loggedInNick} />}

        {view === 'chatbot' && <Chatbot userNick={loggedInNick} />}
      </main>
    </div>
   )
}

export default App