// Login.tsx
import { useState } from 'react'

interface LoginProps {
  // 🚀 리모컨 모양을 살짝 바꿨어용! 아이디랑 프사 주소를 같이 넘겨주도록!
  onLoginSuccess: (id: string, profileUrl: string | null, nickname: string) => void;
  onGoToSignup: () => void;
}

function Login({ onLoginSuccess, onGoToSignup }: LoginProps) {
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  
  const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
  const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${import.meta.env.VITE_KAKAO_REST_API_KEY}&redirect_uri=${import.meta.env.VITE_KAKAO_REDIRECT_URI}&response_type=code`;
  //const NAVER_AUTH_URL = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${import.meta.env.VITE_NAVER_CLIENT_ID}&redirect_uri=${import.meta.env.VITE_NAVER_REDIRECT_URI}&state=${import.meta.env.VITE_NAVER_STATE}`;
  const GOOGLE_AUTH_URL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${import.meta.env.VITE_GOOGLE_CLIENT_ID}&redirect_uri=${import.meta.env.VITE_GOOGLE_REDIRECT_URI}&response_type=code&scope=email profile`;
 
  const handleLogin = async () => {
    if (!id || !pw) {
      alert('아이디랑 비밀번호 다 적어줘야 로그인할 수 있어요')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: id, pw: pw }),
      })

      const result = await response.json()
      console.log('백엔드에서 온 로그인 택배:', result);
      if (response.ok && result.success) {
        alert(result.message)
        console.log(`${result.user.id}`)
        // 🚀 백엔드에서 온 택배(user) 안에서 아이디랑 프사 주소를 꺼내서 부모한테 전달!
        onLoginSuccess(result.user.id, result.user.profileURL, result.user.nickname)
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('서버랑 연결 실패 ㅠㅠ', error)
      alert('서버가 꺼져있는 것 같아요 백엔드 터미널을 확인해봐요!')
    }
  }

  const handleKakaoLogin = () => {
    window.location.href = KAKAO_AUTH_URL; 
  }

  // const handleNaverLogin = () => {
  //   window.location.href = NAVER_AUTH_URL;
  // }

  const handleGoogleLogin = () => {
    window.location.href = GOOGLE_AUTH_URL;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '50px' }}>
      <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '320px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h2 style={{ textAlign: 'center', color: '#007AFF' }}>Welcome Back!</h2>
        
        <input placeholder="아이디" value={id} onChange={(e) => setId(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
        <input type="password" placeholder="비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
                
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleLogin} style={{ flex: 1, padding: '12px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
            로그인
          </button>
          
          {/* 오빠가 말한 회원가입 버튼이에용! */}
          <button onClick={onGoToSignup} style={{ flex: 1, padding: '12px', backgroundColor: 'white', color: '#007AFF', border: '1px solid #007AFF', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
            회원가입
          </button>
        </div>

        <button 
          onClick={handleKakaoLogin} 
          style={{ width: '100%', padding: '12px', backgroundColor: '#FEE500', color: '#000000', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
        >
          💬 카카오로 3초 만에 시작하기
        </button>

        {/* <button 
          onClick={handleNaverLogin} 
          style={{ width: '100%', padding: '12px', backgroundColor: '#03C75A', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
        >
          N 네이버로 3초 만에 시작하기
        </button> */}

        <button 
          onClick={handleGoogleLogin} 
          style={{ width: '100%', padding: '12px', backgroundColor: 'white', color: '#555', border: '1px solid #ddd', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
        >
          🅖 구글로 3초 만에 시작하기
        </button>
      </div>
    </div>
  )
}

export default Login