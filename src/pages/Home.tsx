// src/Home.tsx
import { useEffect } from 'react';

interface HomeProps {
  onStartPlanner: () => void;
  userNick?: string;
  onOpenPopup:(seq: number, type: string) => void;
}

function Home({ onStartPlanner, userNick}: HomeProps) {
  const privacy = '/privacy' 
    const goto = () => {
    window.location.href = privacy;
  }

  // 🌸 화면이 짠! 하고 켜지자마자 백엔드한테 "랜덤 코스 내놔!" 하고 달려가용!
  useEffect(() => {    
  }, []);

  return (
    <div style={{ paddingBottom: '50px' }}>
      {/* 최상단 히어로 섹션 (오빠가 고친 줄 간격 그대로 유지해용!) */}
      <section style={{ textAlign: 'center', padding: '80px 10px', backgroundColor: '#e6f2ff', borderRadius: '30px', marginBottom: '50px' }}>
        <h1 style={{ fontSize: '32px', color: '#333', marginBottom: '15px', fontWeight: 800, lineHeight: '1.4' }}>
          {userNick ? `${userNick}님,` : ''} 계획 없는 여행,<br />
          AI가 완벽하게 짜드릴게요.
        </h1>
        <p style={{ fontSize: '16px', color: '#666', marginBottom: '30px', lineHeight: '1.6' }}>
          어디로 갈지, 몇 시에 갈지만 정하세요.<br />
          '노플랜' AI 가이드 코아가 취향 맞춤 코스를 대령합니다!
        </p>
        <button onClick={onStartPlanner} style={{ padding: '15px 30px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '30px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 122, 255, 0.3)' }}>
          🚀 AI 플래너 시작하기
        </button>
      </section>

      <footer style={{ borderTop: '1px solid #eee', padding: '60px 20px 40px', backgroundColor: '#fff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', color: '#888', fontSize: '13px' }}>
          
          {/* 로고 및 소셜 아이콘 영역 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              
              {/* <img src="/images/Logo_ttock.png" alt="똑똑!" style={{ height: '22px' }} /> */}
              <img src="/images/Logo_swith.png" alt="NoPlan" style={{ height: '28px' }} />
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              {/* <a href="https://instagram.com" target="_blank" rel="noreferrer">
                <img src="/images/icon_insta.png" alt="Instagram" style={{ width: '24px', opacity: 0.8 }} />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer">
                <img src="/images/icon_youtube.png" alt="YouTube" style={{ width: '24px', opacity: 0.8 }} />
              </a> */}
            </div>
          </div>

          {/* 사업자 상세 정보 영역 */}
          <div style={{ lineHeight: '1.8', marginBottom: '30px' }}>
            <p style={{ margin: 0 }}>
              대표자 <strong>박휘선</strong> <span style={{ color: '#ddd', margin: '0 8px' }}>|</span> 
              주소 <strong>울산광역시</strong> <span style={{ color: '#ddd', margin: '0 8px' }}>|</span> 
              사업자 등록번호 <strong></strong>
            </p>
            <p style={{ margin: 0 }}>
              문의전화 <strong></strong> <span style={{ color: '#ddd', margin: '0 8px' }}>|</span> 
              문의메일 <strong>Shake923@gmail.com</strong>
            </p>
            <p style={{ marginTop: '10px', color: '#bbb' }}>
              We don't have any Copyright ⓒ 
            </p>
          </div>

          {/* 하단 링크 영역 */}
          <div style={{ display: 'flex', gap: '25px', fontWeight: 'bold', borderTop: '1px solid #f5f5f5', paddingTop: '20px' }}>
            <span style={{ cursor: 'pointer', color: '#666' }}>서비스 이용약관</span>
            <span style={{ cursor: 'pointer', color: '#666' }} onClick={goto}>개인정보 취급방침</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;