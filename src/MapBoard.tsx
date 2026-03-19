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
    ps.keywordSearch(userLocation, (locationData, status) => {
      if (status === kakao.maps.services.Status.OK) {
        const centerAnchor = new kakao.maps.LatLng(Number(locationData[0].y), Number(locationData[0].x));
        
        // 2km 철벽 방어선 옵션!
        const searchOptions = {
          location: centerAnchor,
          radius: 2000
        };

        // 2단계: 철벽 안에서 코스 장소들 검색하기!
        courseList.forEach((item) => {
          const keyword = item.searchKeyword || item.title;
          
          ps.keywordSearch(keyword, (places, searchStatus) => {
            if (searchStatus === kakao.maps.services.Status.OK) {
              // 🚀 코아가 빼먹었던 displayMarker 역할을 여기서 직접 해용!
              const place = places[0];
              const newMarker = {
                title: place.place_name,
                lat: Number(place.y),
                lng: Number(place.x)
              };

              // 찾은 장소를 마커 리스트에 예쁘게 담기!
              setMarkers((prev) => [...prev, newMarker]);

              // 지도가 핀들을 다 품을 수 있게 화면 넓히기!
              bounds.extend(new kakao.maps.LatLng(newMarker.lat, newMarker.lng));
              
              // 리모컨(mapRef)으로 지도 카메라 앵글 싹 맞춰주기!
              if (mapRef.current) {
                mapRef.current.setBounds(bounds);
              }
            }
          }, searchOptions); 
        });
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