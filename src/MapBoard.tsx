import { useState, useEffect } from 'react';
import { Map, MapMarker, Polyline } from 'react-kakao-maps-sdk';

// 챗봇에서 넘겨받을 코스 데이터 모양이에용!
interface CourseItem {
  time: string;
  title: string;
  description: string;
  searchKeyword?: string; // 🚀 코아가 추가한 마법의 비밀 열쇠!
}

interface MapBoardProps {
  courseList: CourseItem[];
}

function MapBoard({ courseList }: MapBoardProps) {
  const [myLocation, setMyLocation] = useState({ lat: 37.5665, lng: 126.9780 });
  const [markers, setMarkers] = useState<{title: string, lat: number, lng: number}[]>([]);

  useEffect(() => {
    // 내 위치 가져오기!
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setMyLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
      );
    }
  }, []);

useEffect(() => {
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      console.log("🚨 카카오 요원이 아직 도착 안 했어용!");
      return;
    }
    
    const ps = new kakao.maps.services.Places();

    const searchPlaces = async () => {
      const newMarkers: {title: string, lat: number, lng: number}[] = [];

      for (const item of courseList) {
        // 🚀 만약 비밀 키워드가 있으면 그걸로 찾고, 없으면 그냥 제목으로 찾아라!
        const keywordToSearch = item.searchKeyword ? item.searchKeyword : item.title;
        console.log("🔍 카카오한테 검색 물어보는 중:", keywordToSearch); 

        await new Promise<void>((resolve) => {
          ps.keywordSearch(keywordToSearch, (data, status) => {
            if (status === kakao.maps.services.Status.OK && data.length > 0) {
              console.log("✅ 카카오가 장소 찾음!! :", keywordToSearch); 
              newMarkers.push({                
                title: data[0].place_name, // 핀에 뜨는 이름은 다시 예쁜 제목으로!
                lat: parseFloat(data[0].y),
                lng: parseFloat(data[0].x),
              });
            } else {
              console.log("❌ 카카오가 장소 못 찾음 ㅠㅠ :", keywordToSearch); 
            }
            resolve();
          });
        });
      }
      
      console.log("최종적으로 꽂을 마커 개수:", newMarkers.length);
      setMarkers(newMarkers);
    };

    if (courseList && courseList.length > 0) {
      searchPlaces();
    }
  }, [courseList]);

  // 마커들을 이어줄 선의 길!
  const linePath = markers.map(m => ({ lat: m.lat, lng: m.lng }));

  return (
    <div style={{ width: '100%', padding: '10px 0', boxSizing: 'border-box' }}>
      <Map
        center={markers.length > 0 ? markers[0] : myLocation}
        style={{ width: '100%', height: '300px', borderRadius: '15px' }}
        level={5}
      >
        {/* 내 위치 마커 */}
        <MapMarker position={myLocation}>
          <div style={{ padding: '5px', color: 'rgb(0, 122, 255)', fontSize: '12px', fontWeight: 'bold' }}>내 위치</div>
        </MapMarker>

        {/* AI 코스 마커들 */}
        {markers.map((marker, idx) => (
          <MapMarker key={idx} position={{ lat: marker.lat, lng: marker.lng }}>
            <div style={{ padding: '5px', color: 'rgb(51, 51, 51)', fontSize: '12px' }}>
              {marker.title}
            </div>
          </MapMarker>
        ))}

       {/* Polyline 부분도 요렇게 살짝 바꿔줘용! */}
        {linePath.length > 1 && (
          <Polyline
            path={linePath} // 🚀 괄호 하나 벗겼어용!
            strokeWeight={4}
            strokeColor={"rgb(255, 59, 48)"}
            strokeOpacity={0.8}
            strokeStyle={"shortdash"}
          />
        )}
      </Map>
    </div>
  );
}

export default MapBoard;