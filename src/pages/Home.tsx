// src/Home.tsx
import AvatarScene from '../components/AvatarScene';

interface HomeProps {
  isDark: boolean;
  onStartPlanner: () => void;
  userNick?: string;
  onOpenPopup:(seq: number, type: string) => void;
}

function Home({isDark, onStartPlanner, userNick}: HomeProps) {
  const privacy = '/privacy' 
    const goto = () => {
    window.location.href = privacy;
  }

  const heroBgColor = isDark ? '#16213e' : '#e6f2ff'; // 히어로 박스 배경
  const titleColor = isDark ? '#ffffff' : '#333333';  // 제목 글씨
  const textColor = isDark ? '#b8b8b8' : '#666666';   // 본문 글씨
  const footTextColor = isDark ? '#fff' : '#666';   // 본문 글씨

  return (
    <div style={{ paddingBottom: '50px' }}>
      {/* 최상단 히어로 섹션 (오빠가 고친 줄 간격 그대로 유지해용!) */}
      <section style={{ textAlign: 'center', padding: '80px 10px', backgroundColor: heroBgColor, borderRadius: '30px', marginBottom: '50px' }}>
        <h1 style={{ fontSize: '32px', color: titleColor, marginBottom: '15px', fontWeight: 800, lineHeight: '1.4' }}>
          {userNick ? `${userNick}님,` : ''} 계획 없는 여행,<br />
          AI가 완벽하게 짜드릴게요.
        </h1>
        <p style={{ fontSize: '16px', color: textColor, marginBottom: '30px', lineHeight: '1.6' }}>
          어디로 갈지, 몇 시에 갈지만 정하세요.<br />
          '노플랜' AI 가이드 코아가 취향 맞춤 코스를 대령합니다!
        </p>
        <button onClick={onStartPlanner} style={{ padding: '15px 30px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '30px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 122, 255, 0.3)' }}>
          🚀 AI 플래너 시작하기
        </button>
      </section>

      <footer style={{ borderTop: '1px solid #eee', padding: '60px 20px 40px', backgroundColor: heroBgColor }}>
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
            <p style={{ margin: 0, color:footTextColor}}>
              대표자 <strong>박휘선</strong> <span style={{ color: footTextColor, margin: '0 8px' }}>|</span> 
              주소 <strong>울산광역시</strong> <span style={{ color: footTextColor, margin: '0 8px' }}>|</span> 
              사업자 등록번호 <strong></strong>
            </p>
            <p style={{ margin: 0, color:footTextColor }}>
              문의전화 <strong></strong> <span style={{ color: footTextColor, margin: '0 8px' }}>|</span> 
              문의메일 <strong>Shake923@gmail.com</strong>
            </p>
            <p style={{ marginTop: '10px', color: '#bbb' }}>
              We don't have any Copyright ⓒ 
            </p>
          </div>

          {/* 하단 링크 영역 */}
          <div style={{ display: 'flex', gap: '25px', fontWeight: 'bold', borderTop: '1px solid #f5f5f5', paddingTop: '20px' }}>
            <span style={{ cursor: 'pointer', color: footTextColor }}>서비스 이용약관</span>
            <span style={{ cursor: 'pointer', color: footTextColor }} onClick={goto}>개인정보 취급방침</span>
          </div>
        </div>
      <p style={{ marginTop: '5px', color: '#ddd', fontSize: '11px' }}>
  * 3D Model "gato mau" by Marco on Sketchfab
</p>
      </footer>

      <div style={{ 
        position: 'fixed', // 👈 요기! 전체 화면 기준 고정!
        bottom: '30px',    // 🌸 바닥에서 30px 띄우기!
        right: '30px',     // 🌸 오른쪽에서 30px 띄우기!
        width: '300px',    // 🌸 아바타가 들어갈 예쁜 초상화 크기! 오빠 마음대로 조절해봐요!
        height: '400px',   // good portrait aspect
        zIndex: 1000,      // 👈 온 동네 최고 높은 자리에 앉히기!
        borderRadius: '20px', 
        overflow: 'hidden', 
        pointerEvents: 'none' // 🌸 전체 박스는 클릭 안 되게 해서, 뒤에 있는 버튼 클릭 안 가리게!
      }}>
        {/* 아바타 scene은 그대로! */}
        <AvatarScene />
      </div>
    </div>
  );
}

export default Home;