import { useState, useEffect, useRef } from 'react'; // 🚀 useRef 꼭 추가해야 해용!
import { Map, MapMarker, Polyline } from 'react-kakao-maps-sdk';

interface CourseItem {
  time: string;
  title: string;
  description: string;
  searchKeyword?: string;
}

interface MapBoardProps {
  courseList: CourseItem[];
  userLocation: string;
}

function MapBoard({ courseList, userLocation }: MapBoardProps) {
  const [myLocation, setMyLocation] = useState({ lat: 37.5665, lng: 126.9780 });
  const [markers, setMarkers] = useState<{title: string, lat: number, lng: number}[]>([]);
  
  // 🚀 코아가 빼먹었던 마법의 지도 리모컨 등장!!
  const mapRef = useRef<any>(null); 

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setMyLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
      );
    }
  }, []);

  useEffect(() => {
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) return;
    if (!courseList || courseList.length === 0 || !userLocation) return;

    const ps = new kakao.maps.services.Places();
    const bounds = new kakao.maps.LatLngBounds();

    // 🌸 새로운 코스가 오면, 지도에 있던 옛날 핀들을 싹 지워주세용!
    setMarkers([]);

    // 1단계: 오빠가 입력한 찐 동네(userLocation)를 검색해서 기준점 잡기!
    ps.keywordSearch(userLocation, async (locationData, status) => {
      if (status === kakao.maps.services.Status.OK) {
        const centerAnchor = new kakao.maps.LatLng(Number(locationData[0].y), Number(locationData[0].x));
        const searchOptions = { location: centerAnchor, radius: 2000 };

        // 🚀 2단계: 순서대로 줄 세우기 마법 (Promise.all)
        // 모든 장소 검색이 끝날 때까지 기다렸다가 '원래 순서'대로 결과를 모아용!
        const searchPromises = courseList.map((item) => {
          return new Promise<{title: string, lat: number, lng: number} | null>((resolve) => {
            const keyword = item.searchKeyword || item.title;
            ps.keywordSearch(keyword, (places, searchStatus) => {
              if (searchStatus === kakao.maps.services.Status.OK) {
                const place = places[0];
                resolve({
                  title: place.place_name,
                  lat: Number(place.y),
                  lng: Number(place.x)
                });
              } else {
                resolve(null); // 못 찾으면 아쉽지만 패스!
              }
            }, searchOptions);
          });
        });

        // 🚀 모든 장소 검색이 완료될 때까지 "기다려!"
        const results = await Promise.all(searchPromises);
        
        // 못 찾은 장소(null)는 빼고 진짜 마커들만 걸러내기!
        const validMarkers = results.filter((r): r is {title: string, lat: number, lng: number} => r !== null);

        // 🌸 이제 순서가 완벽하게 보장된 마커들을 한꺼번에 세팅해용!
        setMarkers(validMarkers);

        // 지도 범위 맞추기
        validMarkers.forEach(marker => {
          bounds.extend(new kakao.maps.LatLng(marker.lat, marker.lng));
        });

        if (mapRef.current && validMarkers.length > 0) {
          mapRef.current.setBounds(bounds);
        }
      }
    });
  }, [courseList, userLocation]); // 🚀 코스가 바뀌거나 동네가 바뀌면 다시 실행!

  const linePath = markers.map(m => ({ lat: m.lat, lng: m.lng }));

  return (
    <div style={{ width: '100%', padding: '10px 0', boxSizing: 'border-box' }}>
      <Map
        center={markers.length > 0 ? markers[0] : myLocation}
        style={{ width: '100%', height: '100%', minHeight: '250px', borderRadius: '15px' }} // 높이 꽉 차게 수정!
        level={5}
        ref={mapRef} // 🚨🚨 지도 리모컨 연결 완료!! (이거 엄청 중요해용!)
      >
        <MapMarker position={myLocation}>
          <div style={{ padding: '5px', color: 'rgb(0, 122, 255)', fontSize: '12px', fontWeight: 'bold' }}>내 위치</div>
        </MapMarker>

        {markers.map((marker, idx) => (
          <MapMarker key={idx} position={{ lat: marker.lat, lng: marker.lng }}>
            <div style={{ padding: '5px', color: 'rgb(51, 51, 51)', fontSize: '12px' }}>
              {marker.title}
            </div>
          </MapMarker>
        ))}

        {linePath.length > 1 && (
          <Polyline
            path={linePath}
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