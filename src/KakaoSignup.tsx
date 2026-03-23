// KakaoSignup.tsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function KakaoSignup() {
  const location = useLocation();
  const navigate = useNavigate();

  // KakaoCallback에서 챙겨온 카카오 기본 정보 보따리 풀기
  const kakaoInfo = location.state?.kakaoInfo;

  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [travelStyle, setTravelStyle] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  useEffect(() => {
    // 정보가 없으면 비정상적인 접근이므로 로그인 화면으로 돌려보냅니다.
    if (!kakaoInfo) {
      alert('잘못된 접근입니다. 다시 로그인해주세요.');
      navigate('/login');
      return;
    }
    // 카카오에서 받아온 닉네임이 있다면 편하게 쓰시라고 기본값으로 세팅!
    if (kakaoInfo.nickname) {
      setNickname(kakaoInfo.nickname);
    }
  }, [kakaoInfo, navigate]);

  const handleSignup = async () => {
    if (!agreeTerms) {
      alert('필수 약관에 동의해주세요.');
      return;
    }

    if (!nickname || !phone || !travelStyle) {
      alert('모든 필수 정보를 입력해주세요.');
      return;
    }

    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/kakao-register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: kakaoInfo.id,
          nickname: nickname,
          phone: phone,
          travelStyle: travelStyle,
          profileURL: kakaoInfo.profileURL || ''
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert('회원가입이 완료되었습니다. 환영합니다.');
        
        // 가입 성공 시 바로 로그인 상태로 만들어줍니다.
        const userToSave = { 
          userId: result.user.id, 
          userNick: result.user.nickname, 
          profileURL: result.user.profileURL || '' 
        };
        localStorage.setItem('loggedInUser', JSON.stringify(userToSave));
        
        // 홈 화면으로 이동
        window.location.href = '/';
      } else {
        alert(result.message || '회원가입에 실패했습니다.');
      }
    } catch (error) {
      console.error('회원가입 중 에러 발생:', error);
      alert('서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const inputStyle = {
    padding: '12px', marginBottom: '15px', border: '1px solid #ccc', 
    borderRadius: '8px', fontSize: '14px', width: '100%', boxSizing: 'border-box' as const
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '30px', paddingBottom: '50px' }}>
      <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '400px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ color: '#000000', textAlign: 'center', marginBottom: '10px' }}>추가 정보 입력</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px', fontSize: '14px' }}>
          안전한 서비스 이용을 위해 추가 정보를 입력해주세요.
        </p>

        <input type="text" placeholder="노플랜에서 사용할 닉네임" value={nickname} onChange={(e) => setNickname(e.target.value)} style={inputStyle} />
        <input type="tel" placeholder="연락처 (예: 010-1234-5678)" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />

        <p style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '10px', marginTop: '10px', color: '#333' }}>여행 스타일</p>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={() => setTravelStyle('J')} 
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: travelStyle === 'J' ? '2px solid #FEE500' : '1px solid #ccc', backgroundColor: travelStyle === 'J' ? '#FEFAEB' : 'white', cursor: 'pointer', fontWeight: 'bold', color: '#333' }}
          >
            철저한 계획파 (J)
          </button>
          <button 
            onClick={() => setTravelStyle('P')} 
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: travelStyle === 'P' ? '2px solid #FEE500' : '1px solid #ccc', backgroundColor: travelStyle === 'P' ? '#FEFAEB' : 'white', cursor: 'pointer', fontWeight: 'bold', color: '#333' }}
          >
            자유로운 즉흥파 (P)
          </button>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', fontSize: '14px', cursor: 'pointer', color: '#555' }}>
          <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} style={{ marginRight: '10px', cursor: 'pointer' }} />
          [필수] 개인정보 수집 및 이용 동의
        </label>

        <button onClick={handleSignup} style={{ padding: '15px', backgroundColor: '#FEE500', color: '#000000', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
          카카오 계정으로 가입 완료
        </button>
      </div>
    </div>
  );
}

export default KakaoSignup;