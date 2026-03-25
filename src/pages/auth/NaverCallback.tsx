// NaverCallback.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function NaverCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // 주소창에서 네이버가 준 '통과 팔찌(code)'와 '암호(state)'를 쏙 빼냅니다.
    const urlParams = new URL(window.location.href).searchParams;
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      sendCodeToBackend(code, state);
    }
  }, []);

  const sendCodeToBackend = async (code: string, state: string) => {
    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/naver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (result.isNewUser) {
          // 처음 온 유저면 네이버 정보를 담아서 추가 정보 입력 창으로 안내합니다.
          alert(result.message);
          navigate('/naver-signup', { state: { naverInfo: result.naverInfo } });
        } else {
          // 기존 유저면 평소처럼 서랍에 저장하고 메인 화면으로 이동합니다.
          const userToSave = { 
            userId: result.user.id, 
            userNick: result.user.nickname, 
            profileURL: result.user.profileURL || '' 
          };
          localStorage.setItem('loggedInUser', JSON.stringify(userToSave));
          
          window.location.href = '/'; 
        }
      } else {
        alert('네이버 로그인에 실패했습니다: ' + result.message);
        navigate('/login');
      }
    } catch (error) {
      console.error('서버 통신 오류:', error);
      alert('서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      navigate('/login');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
      <h2 style={{ color: '#03C75A', marginBottom: '10px' }}>네이버 로그인 처리 중입니다</h2>
      <p style={{ color: '#555' }}>안전하게 로그인 정보를 확인하고 있습니다. 잠시만 기다려주세요.</p>
    </div>
  );
}

export default NaverCallback;