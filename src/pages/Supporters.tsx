// src/Supporters.tsx
import { useState } from 'react';

function Supporters() {
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (status: string, congestion: string) => {
    if (!storeName) return alert("매장 이름을 입력해주세요!");
    
    setLoading(true);
    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeName, status, congestion })
      });
      
      if (res.ok) alert(`✅ ${storeName} 업데이트 완료!`);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center' }}>🚩 서포터즈 현장 제보</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>📍 매장명</label>
        <input 
          value={storeName} 
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="성수동 OO식당"
          style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', boxSizing: 'border-box' }}
        />
      </div>

      <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>🔥 현재 혼잡도 제보</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={() => handleUpdate('OPEN', 'FREE')} style={btnStyle('#4CAF50')} disabled={loading}>🟢 여유로워요</button>
        <button onClick={() => handleUpdate('OPEN', 'BUSY')} style={btnStyle('#FF9800')} disabled={loading}>🟡 조금 붐벼요</button>
        <button onClick={() => handleUpdate('OPEN', 'FULL')} style={btnStyle('#F44336')} disabled={loading}>🔴 만석 / 웨이팅</button>
        <button onClick={() => handleUpdate('CLOSED', 'NONE')} style={btnStyle('#9E9E9E')} disabled={loading}>✖ 임시 휴무/재료 소진</button>
      </div>
    </div>
  );
}

const btnStyle = (color: string) => ({
  padding: '15px', backgroundColor: color, color: 'white', border: 'none', 
  borderRadius: '12px', fontWeight: 'bold' as const, cursor: 'pointer', fontSize: '16px'
});

export default Supporters;