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
    if (!courseList || courseList.length === 0) return;

    const ps = new kakao.maps.services.Places();
    const bounds = new kakao.maps.LatLngBounds();
    
    // 🌸 새로운 코스가 오면 옛날 핀들은 싹 치워주세용!
    setMarkers([]);

    const findPlaces = async () => {
      // 🚀 1. 반경 2km 제한(searchOptions)을 완전히 삭제하고 전국구로 쿨하게 검색!!
      const searchPromises = courseList.map((item) => {
        return new Promise<{title: string, lat: number, lng: number} | null>((resolve) => {
          const keyword = item.searchKeyword || item.title;
          
          ps.keywordSearch(keyword, (places, searchStatus) => {
            if (searchStatus === kakao.maps.services.Status.OK) {
              const place = places[0];
              resolve({ title: place.place_name, lat: Number(place.y), lng: Number(place.x) });
            } else {
              // 🌸 혹시 이름이 너무 길어서 못 찾으면, 그냥 '제목(title)'으로 한 번 더 찾아보는 코아의 센스!
              ps.keywordSearch(item.title, (fbPlaces, fbStatus) => {
                if (fbStatus === kakao.maps.services.Status.OK) {
                   const fbPlace = fbPlaces[0];
                   resolve({ title: fbPlace.place_name, lat: Number(fbPlace.y), lng: Number(fbPlace.x) });
                } else {
                   resolve(null); // 그래도 없으면 쿨하게 패스!
                }
              });
            }
          });
        });
      });

      // 모든 장소 검색이 끝날 때까지 기다려용!
      const results = await Promise.all(searchPromises);
      const validMarkers = results.filter((r): r is {title: string, lat: number, lng: number} => r !== null);

      // 찾은 찐 마커들만 지도에 콕콕 박아줘용!
      setMarkers(validMarkers);

      // 🚀 2. 지도 범위 예쁘게 쫙! 당겨주기
      if (validMarkers.length > 0) {
        validMarkers.forEach(marker => bounds.extend(new kakao.maps.LatLng(marker.lat, marker.lng)));
        if (mapRef.current) {
          mapRef.current.setBounds(bounds);
        }
      } else {
        // 🚨 최후의 보루: 만약 핀을 진짜 하나도 못 찾았다면, 동네 이름(userLocation)으로라도 지도 옮겨주기!
        if (userLocation) {
          ps.keywordSearch(userLocation, (locData, locStatus) => {
            if (locStatus === kakao.maps.services.Status.OK && mapRef.current) {
              const center = new kakao.maps.LatLng(Number(locData[0].y), Number(locData[0].x));
              mapRef.current.setCenter(center);
            }
          });
        }
      }
    };

    findPlaces();
  }, [courseList, userLocation]);

  useEffect(() => {
    // 화면이 그려지고 0.1초 뒤에 리모컨으로 '새로고침' 버튼을 띡! 누르는 거예용!
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.relayout(); // "지도야, 화면 꽉 찼으니까 크기 다시 재!"
        
        // 크기를 다시 재고 나서 중심이 살짝 틀어질 수 있으니, 첫 번째 마커로 앵글을 다시 잡아줘용!
        if (markers.length > 0) {
          mapRef.current.setCenter(new kakao.maps.LatLng(markers[0].lat, markers[0].lng));
        } else {
          mapRef.current.setCenter(new kakao.maps.LatLng(myLocation.lat, myLocation.lng));
        }
      }
    }, 100); // 100ms(0.1초)의 찰나의 시간을 주는 게 핵심이에용!

    return () => clearTimeout(timer); // 정리 정돈!
  }, [markers, myLocation]);

  const linePath = markers.map(m => ({ lat: m.lat, lng: m.lng }));

  return (
    <div style={{ 
      width: '100%', 
      height:'65%' ,
      padding: '0', 
      boxSizing: 'border-box'
       }}>
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