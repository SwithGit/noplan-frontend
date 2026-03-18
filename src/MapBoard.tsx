import { useState, useEffect } from 'react';
import { Map, MapMarker, Polyline } from 'react-kakao-maps-sdk';

// 챗봇에서 넘겨받을 코스 데이터의 모양이에용!
interface CourseItem {
  time: string;
  title: string;
  description: string;
}

interface MapBoardProps {
  courseList: CourseItem[];
}

function MapBoard({ courseList }: MapBoardProps) {
  const [myLocation, setMyLocation] = useState({ lat: 37.5665, lng: 126.9780 });
  const [markers, setMarkers] = useState<{title: string, lat: number, lng: number}[]>([]);

  useEffect(() => {
    // 🌸 1. 내 위치 가져오기!
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMyLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        }
      );
    }
  }, []);

  useEffect(() => {
    // 🌸 2. 카카오 장소 검색 요원 소환!
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) return;
    const ps = new kakao.maps.services.Places();

    const searchPlaces = async () => {
      const newMarkers: {title: string, lat: number, lng: number}[] = [];

      // AI가 준 코스의 제목(title)으로 카카오 지도에 검색을 돌려용!
      for (const item of courseList) {
        await new Promise<void>((resolve) => {
          ps.keywordSearch(item.title, (data, status) => {
            if (status === kakao.maps.services.Status.OK && data.length > 0) {
              // 검색 성공! 첫 번째 장소의 좌표를 마커 상자에 담아용!
              newMarkers.push({
                title: item.title,
                lat: parseFloat(data[0].y),
                lng: parseFloat(data[0].x),
              });
            }
            resolve();
          });
        });
      }
      setMarkers(newMarkers);
    };

    if (courseList && courseList.length > 0) {
      searchPlaces();
    }
  }, [courseList]);

  // 🌸 3. 마커들을 이어줄 예쁜 선의 길(좌표)을 뽑아내용!
  const linePath = markers.map(m => ({ lat: m.lat, lng: m.lng }));

  return (
    <div style={{ width: '100%', padding: '10px 0', boxSizing: 'border-box' }}>
      
      <Map
        center={markers.length > 0 ? markers[0] : myLocation} // 첫 번째 목적지를 지도의 중심으로!
        style={{ width: '100%', height: '250px', borderRadius: '15px' }}
        level={4}
      >
        {/* 내 위치 마커 (파란색 기본 마커) */}
        <MapMarker position={myLocation}>
          <div style={{ padding: '5px', color: 'rgb(0, 122, 255)', fontSize: '12px', fontWeight: 'bold' }}>내 위치</div>
        </MapMarker>

        {/* AI가 추천해준 코스 마커들! */}
        {markers.map((marker, idx) => (
          <MapMarker key={idx} position={{ lat: marker.lat, lng: marker.lng }}>
            <div style={{ padding: '5px', color: 'rgb(51, 51, 51)', fontSize: '12px' }}>
              {idx + 1}번째 코스
            </div>
          </MapMarker>
        ))}

        {/* 🚀 마커들을 이어주는 로맨틱한 선 긋기! */}
        {linePath.length > 1 && (
          <Polyline
            path={[linePath]}
            strokeWeight={4} 
            strokeColor={"rgb(255, 59, 48)"} // 예쁜 빨간색 선!
            strokeOpacity={0.8} 
            strokeStyle={"shortdash"} 
          />
        )}
      </Map>
    </div>
  );
}

export default MapBoard;