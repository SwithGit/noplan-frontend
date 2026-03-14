// App.tsx
import { useState } from 'react'
import Gallery from './Gallery'
import Login from './Login'
import Signup from './Signup'
import PropsTest from './PropsTest'

function App() {
  const userName = "지혁 오빠";
  const [view, setView] = useState('gallery')
  
  // 오빠가 로그인했는지 기억하는 새로운 상태예용!
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const [places, setPlaces] = useState([
    { id: 1, name: '태화강 국가정원🎋', desc: '십리대숲이 진짜 좋아!', image:"" },
    { id: 2, name: '간절곶 ☀️', desc: '해 뜰 때 가보자용!',  image:"" }
  ])

  const deletePlace = (id: number) => {
    setPlaces(places.filter(p => p.id !== id))
  }

  return(        
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '15px 40px', backgroundColor: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <h2 style={{ color: '#007AFF', margin: 0, cursor: 'pointer' }} onClick={() => setView('gallery')}>📍 NoPlan</h2>
        
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
          
          {/* 로그인 상태에 따라 버튼이 마법처럼 바뀌어용! */}
          {isLoggedIn ? (
            <span 
              onClick={() => {
                setIsLoggedIn(false) // 로그아웃 처리!
                setView('login') // 로그인 화면으로 이동!
              }}
              style={{ cursor: 'pointer', fontWeight: 'bold', color: '#888' }}
            >
              로그아웃
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
      <PropsTest name={userName}/>
      
      <main style={{ padding: '40px' }}>
        {view === 'gallery' && <Gallery places={places} onDelete={deletePlace} />}
        
        {/* 로그인 성공하면 로그인 상태를 true로 바꾸고 갤러리로 가용! */}
        {/* 그리고 회원가입 창으로 가는 리모컨도 선물로 줬어용! */}
        {view === 'login' && 
          <Login 
            onLoginSuccess={() => { setIsLoggedIn(true); setView('gallery'); }} 
            onGoToSignup={() => setView('signup')}
          />
        }
        {view === 'signup' && <Signup />}
      </main>
    </div>
   )
}

export default App