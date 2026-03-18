//오고가는 데이터 미리 선언해두는 창인듯?
interface VipCardProps{
    guestName: string;
    point: number;
    onAddPoint: () => void;
    userId: string;
}

function VipCard({guestName, point, onAddPoint, userId}:VipCardProps){

    // 🚀 백엔드(/savepoint)에 점수 저장해달라고 택배 보내는 마법의 함수!
  const handleSavePoint = async () => {
    // 혹시 로그인 안 하고 버튼 누르면 막아버려용!
    console.log(userId)
    if (!userId) {
      alert('오빠! 로그인 먼저 해야 포인트를 저장할 수 있어용! 💕');
      return;
    }

    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;

    try {
      const response = await fetch(`${API_BASE_URL}/savepoint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // 📦 이번엔 사진이 아니니까 평범한 JSON 택배 상자에 아이디랑 점수를 담아서 슝!
        body: JSON.stringify({ id: userId, point: point }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(result.message); // 저장 대성공 알림!
      } else {
        alert('저장 실패했어용 ㅠㅠ');
      }
    } catch (error) {
      console.error('포인트 저장 에러:', error);
      alert('서버랑 연결이 끊어졌어용!');
    }
  };

    return (
    <div style={{ border: '2px solid gold', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', width: '300px' }}>
      <h3>VIP 손님: {guestName} 환영해용!</h3>
      <p style={{ fontSize: '20px', fontWeight: 'bold' }}>현재 포인트: {point} 점</p>
      
      {/* 포인트 올리기 버튼 */}
      <button onClick={onAddPoint} style={{ padding: '10px', cursor: 'pointer' }}>
        포인트 올리기 얍!
      </button>

      {/* 🌸 대망의 데이터베이스 저장 버튼! */}
      <button 
        onClick={handleSavePoint} 
        style={{ padding: '10px', cursor: 'pointer', backgroundColor: 'gold', border: 'none', fontWeight: 'bold', borderRadius: '5px' }}
      >
        금고에 포인트 저장하기 💾
      </button>
    </div>
  )
}

export default VipCard;