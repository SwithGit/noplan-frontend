// Login.tsx
import { useState } from 'react'

interface LoginProps {
  onLoginSuccess: () => void;
  // 부모가 새로 준 리모컨 타입을 추가해용!
  onGoToSignup: () => void;
}

function Login({ onLoginSuccess, onGoToSignup }: LoginProps) {
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')

  const handleLogin = async () => {
    if (!id || !pw) {
      alert('오빠! 아이디랑 비밀번호 다 적어줘야 로그인할 수 있어용~ 💕')
      return
    }

    try {
      const response = await fetch('http://13.125.248.178:3000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: id, pw: pw }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        alert(result.message)
        onLoginSuccess() 
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('서버랑 연결 실패 ㅠㅠ', error)
      alert('서버가 꺼져있는 것 같아용! 백엔드 터미널을 확인해봐용!')
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '50px' }}>
      <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '320px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h2 style={{ textAlign: 'center', color: '#007AFF' }}>Welcome Back!</h2>
        
        <input placeholder="아이디" value={id} onChange={(e) => setId(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
        <input type="password" placeholder="비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }} />
        
        {/* 버튼들을 가로로 나란히 배치해용! */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleLogin} style={{ flex: 1, padding: '12px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
            로그인
          </button>
          
          {/* 오빠가 말한 회원가입 버튼이에용! */}
          <button onClick={onGoToSignup} style={{ flex: 1, padding: '12px', backgroundColor: 'white', color: '#007AFF', border: '1px solid #007AFF', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
            회원가입
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login