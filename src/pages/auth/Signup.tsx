// Signup.tsx
import { useState } from 'react';

// 🌸 App.tsx에서 로그인 화면으로 돌아가는 리모컨을 받기 위해 체크리스트를 만들었어용!
interface SignupProps {
  onGoToLogin?: () => void; 
}

function Signup({ onGoToLogin }: SignupProps) {
  // 🚀 유저가 입력하는 모든 정보를 기억할 마법 상자들을 쭈르륵 만들었어용!
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [travelStyle, setTravelStyle] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // 회원가입 버튼을 눌렀을 때 백엔드로 택배를 슝! 쏘는 함수예용
  const handleSignup = async () => {
    // 필수 약관에 동의 안 했으면 가입을 막아버려용!
    if (!agreeTerms) {
      alert('필수 약관에 꼭 동의해야 노플랜을 쓸 수 있어요! 🥺');
      return;
    }
    
    // 빈칸이 하나라도 있으면 알려줘용!
    if (!name || !id || !pw || !nickname || !phone) {
      alert('빈칸을 모두 예쁘게 채워주세요! 💕');
      return;
    }

    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // 📦 오빠가 말한 모든 정보를 커다란 JSON 택배 상자에 꾹꾹 담았어용!
        body: JSON.stringify({
          name, birthdate, gender, phone, id, pw, nickname, email, travelStyle
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('꺄아! 회원가입 대성공! 환영해요!! 🎉');
        if (onGoToLogin) onGoToLogin(); // 성공하면 로그인 화면으로 스르륵 넘어가용!
      } else {
        alert(result.message || '회원가입에 실패했어용 ㅠㅠ');
      }
    } catch (error) {
      console.error('회원가입 에러:', error);
      alert('서버랑 연결이 끊어졌나 봐요!ㅜㅜ');
    }
  };

  // 🌸 예쁜 입력칸을 만드는 꿀팁: 스타일을 변수로 빼두면 코드가 훨씬 깔끔해져용!
  const inputStyle = {
    padding: '12px', marginBottom: '15px', border: '1px solid #ccc', 
    borderRadius: '8px', fontSize: '14px', width: '100%', boxSizing: 'border-box' as const
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '30px', paddingBottom: '50px' }}>
      <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '400px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ color: '#007AFF', textAlign: 'center', marginBottom: '30px' }}>노플랜에 오신 걸 환영해요! ✈️</h2>

        <input type="text" placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        
        <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} style={inputStyle} />
        
        {/* 성별 선택 드롭다운! */}
        <select value={gender} onChange={(e) => setGender(e.target.value)} style={inputStyle}>
          <option value="">성별을 선택해주세요</option>
          <option value="male">남자</option>
          <option value="female">여자</option>
          <option value="none">선택 안 함</option>
        </select>

        <input type="tel" placeholder="핸드폰 번호 (예: 010-1234-5678)" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
        <input type="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        <input type="text" placeholder="아이디" value={id} onChange={(e) => setId(e.target.value)} style={inputStyle} />
        <input type="password" placeholder="비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} style={inputStyle} />
        <input type="text" placeholder="노플랜에서 쓸 닉네임" value={nickname} onChange={(e) => setNickname(e.target.value)} style={inputStyle} />

        {/* 🎒 코아의 특별 추천! 여행 스타일 고르기 */}
        <p style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '10px', marginTop: '10px' }}>당신의 여행 스타일은?! 🎒</p>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={() => setTravelStyle('J')} 
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: travelStyle === 'J' ? '2px solid #007AFF' : '1px solid #ccc', backgroundColor: travelStyle === 'J' ? '#e6f2ff' : 'white', cursor: 'pointer', fontWeight: 'bold' }}
          >
            철저한 계획파 (J)
          </button>
          <button 
            onClick={() => setTravelStyle('P')} 
            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: travelStyle === 'P' ? '2px solid #007AFF' : '1px solid #ccc', backgroundColor: travelStyle === 'P' ? '#e6f2ff' : 'white', cursor: 'pointer', fontWeight: 'bold' }}
          >
            자유로운 즉흥파 (P)
          </button>
        </div>

        {/* ✅ 필수 약관 동의 체크박스 */}
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', fontSize: '14px', cursor: 'pointer' }}>
          <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} style={{ marginRight: '10px', cursor: 'pointer' }} />
          [필수] 개인정보 수집 및 이용에 동의할게요!
        </label>

        <button onClick={handleSignup} style={{ padding: '15px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginBottom: '15px' }}>
          가입 완료하기 🚀
        </button>

        {/* 로그인 화면으로 돌아가는 센스 있는 버튼! */}
        <p style={{ textAlign: 'center', fontSize: '14px', color: '#888', cursor: 'pointer' }} onClick={onGoToLogin}>
          이미 계정이 있나요? 로그인하러 가기!
        </p>
      </div>
    </div>
  );
}

export default Signup;