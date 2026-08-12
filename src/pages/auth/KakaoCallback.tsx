// KakaoCallback.tsx
import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes';

function KakaoCallback() {
    const navigate = useNavigate();

  const sendCodeToBackend = useCallback(async (code: string) => {
    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
    try {
      // 백엔드에 '카카오 로그인 처리해 줘!' 하고 택배를 보내요
      const response = await fetch(`${API_BASE_URL}/api/auth/kakao/kakao`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
       if (result.isNewUser) {
          // 처음 온 유저면, 카카오가 준 정보(kakaoInfo)를 보따리에 담아서 추가 정보 창으로 슝!
          alert(result.message);
          navigate(ROUTES.kakaoSignup, { state: { kakaoInfo: result.kakaoInfo } });
        } else {
          // 원래 있던 유저면 평소처럼 서랍(localStorage)에 저장하고 홈으로!
          const userToSave = { 
            userId: result.user.id, 
            userNick: result.user.nickname, 
            profileURL: result.user.profileURL || '' 
          };
          localStorage.setItem('loggedInUser', JSON.stringify(userToSave));
          
          window.location.href = ROUTES.appHome;
        }
      } else {
        alert('카카오 로그인 실패 ㅠㅠ: ' + result.message);
        navigate(ROUTES.login);
      }
    } catch (error) {
      console.error('백엔드랑 통신 에러 ㅠㅠ', error);
      navigate(ROUTES.login);
    }
  }, [navigate]);

  useEffect(() => {
    const code = new URL(window.location.href).searchParams.get('code');
    if (code) void sendCodeToBackend(code);
  }, [sendCodeToBackend]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
      <h2 style={{ color: '#FEE500', textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>💬 카카오 로그인 중이에요...</h2>
      <p style={{ color: '#555', marginTop: '10px' }}>로그인 확인중이에요 조금만 기다려주세요..! </p>
    </div>
  );
}

export default KakaoCallback;
