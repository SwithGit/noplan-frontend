import { useState } from 'react';

interface Place {
  id: number;
  name: string;
  desc: string;
  image: string;
}

// 부모가 보내준 선물들(Props)의 타입을 정해줘요!
interface GalleryProps {
  places: Place[];                // 장소 리스트 배열
  onDelete: (id: number) => void; // 숫자를 받아서 아무것도 반환 안 하는 함수!
}

function Gallery({ places, onDelete }: GalleryProps) {

  // 뒤집힌 카드 ID 상태
  const [flippedCardId, setFlippedCardId] = useState<number | null>(null);

  const handleCardClick = (id: number) => {
    setFlippedCardId(flippedCardId === id ? null : id);
  };

  return (
    <div>
      <h1 style={{ textAlign: 'center', color: '#1a1a1a', marginBottom: '40px' }}>울산 명소 3D 갤러리</h1>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '60px' ,
        marginRight:'60px'
      }}>
        {places.map((place) => (
          <div 
            key={place.id} 
            onClick={() => handleCardClick(place.id)} 
            style={{ height: '250px', perspective: '1000px', cursor: 'pointer' }}
          >
            <div style={{
              position: 'relative', width: '100%', height: '100%', transition: 'transform 0.6s',
              transformStyle: 'preserve-3d', transform: flippedCardId === place.id ? 'rotateY(180deg)' : 'rotateY(0deg)'
            }}>
              {/* 카드 앞면 */}
              <div style={{ 
                position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', 
                backgroundColor: 'white', borderRadius: '20px', display: 'flex', 
                flexDirection: 'column', justifyContent: 'center', alignItems: 'center', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)', padding: '20px' 
              }}>
                <h3>{place.name}</h3>
                <p style={{ textAlign: 'center' }}>{place.desc}</p>
                {/* 4. 삭제 버튼을 누르면 부모가 준 함수를 실행해! */}
                <button 
                  onClick={() => onDelete(place.id)}
                  style={{ position: 'absolute', top: '10px', right: '10px', cursor: 'pointer' }}
                >
                  ❌
                </button>
              </div>
              {/* 카드 뒷면 */}
              <div style={{ 
                position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', 
                transform: 'rotateY(180deg)', borderRadius: '20px', overflow: 'hidden' 
              }}>
                <img src={place.image} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Gallery;