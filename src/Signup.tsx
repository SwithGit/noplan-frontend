// Signup.tsx
import { useState } from 'react'

function Signup() {
  // 1. 입력값을 저장할 상태들 (아이디, 비밀번호, 비밀번호 확인)
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')

  // 2. 회원가입 버튼을 눌렀을 때 실행할 함수
  const handleSignup = async () => {
  if (!id || !pw || !pwConfirm) {
    alert('오빠! 빈칸 없이 다 채워줘용~ 💕');
    return;
  }
  if (pw !== pwConfirm) {
    alert('비밀번호가 서로 달라요! 다시 확인해봐용 😢');
    return;
  }

  try {
    // 🚀 백엔드 주방으로 주문서(POST) 넣기!
    const response = await fetch('http://13.125.248.178:3000/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // 오빠가 입력한 아이디, 비번을 JSON 포맷으로 예쁘게 포장해요!
      body: JSON.stringify({ id: id, pw: pw }),
    });

    const result = await response.json();

    if (response.ok) {
      // 서버에서 "완벽하게 저장됐어용!" 메시지가 오면 알림창 띄우기!
      alert(result.message); 
      // 성공하면 다음 가입을 위해 입력창 깔끔하게 비우기!
      setId(''); setPw(''); setPwConfirm(''); 
    } else {
      alert('회원가입 실패: ' + result.message);
    }
  } catch (error) {
    console.error('서버랑 연결이 끊어졌나 봐용!', error);
    alert('서버가 꺼져있는 것 같아용! 백엔드 터미널을 확인해봐용 ㅠㅠ');
  }
};

  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '50px' }}>
      <div style={{ 
        padding: '40px', backgroundColor: 'white', borderRadius: '20px', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '350px', 
        display: 'flex', flexDirection: 'column', gap: '15px' 
      }}>
        <h2 style={{ textAlign: 'center', color: '#007AFF' }}>NoPlan 회원가입</h2>
        
        <input 
          placeholder="사용할 아이디 (5자 이상)" 
          value={id} 
          onChange={(e) => setId(e.target.value)}
          style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
        />

        <input 
          type="password" 
          placeholder="비밀번호" 
          value={pw} 
          onChange={(e) => setPw(e.target.value)}
          style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
        />

        <input 
          type="password" 
          placeholder="비밀번호 확인" 
          value={pwConfirm} 
          onChange={(e) => setPwConfirm(e.target.value)}
          style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
        />

        <button 
          onClick={handleSignup}
          style={{ 
            padding: '12px', backgroundColor: '#007AFF', color: 'white', 
            border: 'none', borderRadius: '10px', fontWeight: 'bold', 
            cursor: 'pointer', marginTop: '10px'
          }}
        >
          가입하기 가즈아!
        </button>
      </div>
    </div>
  )
}

export default Signup