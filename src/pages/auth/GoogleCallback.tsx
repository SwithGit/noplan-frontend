// GoogleCallback.tsx
import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes';

function GoogleCallback() {
  const navigate = useNavigate();

  const sendCodeToBackend = useCallback(async (code: string) => {
    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (result.isNewUser) {
          alert(result.message);
          navigate(ROUTES.googleSignup, { state: { googleInfo: result.googleInfo } });
        } else {
          const userToSave = { 
            userId: result.user.id, 
            userNick: result.user.nickname, 
            profileURL: result.user.profileURL || '' 
          };
          localStorage.setItem('loggedInUser', JSON.stringify(userToSave));
          
          window.location.href = ROUTES.appHome;
        }
      } else {
        alert('구글 로그인에 실패했습니다: ' + result.message);
        navigate(ROUTES.login);
      }
    } catch (error) {
      console.error('서버 통신 오류:', error);
      alert('서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      navigate(ROUTES.login);
    }
  }, [navigate]);

  useEffect(() => {
    const code = new URL(window.location.href).searchParams.get('code');
    if (code) void sendCodeToBackend(code);
  }, [sendCodeToBackend]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
      <h2 style={{ color: '#555', marginBottom: '10px' }}>구글 로그인 처리 중입니다</h2>
      <p style={{ color: '#777' }}>안전하게 로그인 정보를 확인하고 있습니다. 잠시만 기다려주세요.</p>
    </div>
  );
}

export default GoogleCallback;
