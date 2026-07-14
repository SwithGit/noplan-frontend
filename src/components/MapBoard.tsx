import { useEffect, useRef, useState } from 'react';

interface CourseItem {
  time?: string;
  title: string;
  description?: string;
  searchKeyword?: string;
  lat?: number | string;
  lng?: number | string;
}

interface MapBoardProps {
  courseList: CourseItem[];
  userLocation: string;
  className?: string;
}

type MarkerPoint = {
  title: string;
  lat: number;
  lng: number;
};

function getKakaoMaps() {
  if (typeof window === 'undefined') return undefined;
  return (window as any).kakao?.maps;
}

function toNumber(value: number | string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function coordinateMarkersFrom(courseList: CourseItem[]) {
  return courseList
    .map((item) => {
      const lat = toNumber(item.lat);
      const lng = toNumber(item.lng);
      if (lat === null || lng === null) return null;
      return { title: item.searchKeyword || item.title, lat, lng };
    })
    .filter((item): item is MarkerPoint => item !== null);
}

function MapBoard({ className, courseList, userLocation }: MapBoardProps) {
  const [myLocation, setMyLocation] = useState({ lat: 37.5665, lng: 126.9780 });
  const [markers, setMarkers] = useState<MarkerPoint[]>([]);
  const [sdkReady, setSdkReady] = useState(() => Boolean(getKakaoMaps()));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const kakaoMapRef = useRef<any>(null);
  const renderedRef = useRef<{ markers: any[]; overlays: any[]; polyline?: any }>({
    markers: [],
    overlays: [],
  });

  useEffect(() => {
    if (sdkReady) return;

    const timer = window.setInterval(() => {
      if (getKakaoMaps()) {
        setSdkReady(true);
        window.clearInterval(timer);
      }
    }, 300);

    const stopTimer = window.setTimeout(() => window.clearInterval(timer), 5000);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(stopTimer);
    };
  }, [sdkReady]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => setMyLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }, []);

  useEffect(() => {
    if (!courseList || courseList.length === 0) {
      setMarkers([]);
      return;
    }

    const kakaoMaps = getKakaoMaps();

    if (!kakaoMaps?.services) {
      setMarkers(coordinateMarkersFrom(courseList));
      return;
    }

    const ps = new kakaoMaps.services.Places();

    const searchPromises = courseList.map((item) => {
      return new Promise<MarkerPoint | null>((resolve) => {
        const lat = toNumber(item.lat);
        const lng = toNumber(item.lng);
        if (lat !== null && lng !== null) {
          resolve({ title: item.searchKeyword || item.title, lat, lng });
          return;
        }

        const keyword = item.searchKeyword || item.title;
        const localKeyword = `${userLocation} ${keyword}`.trim();

        ps.keywordSearch(localKeyword, (places: any[], searchStatus: string) => {
          if (searchStatus === kakaoMaps.services.Status.OK && places[0]) {
            const place = places[0];
            resolve({ title: place.place_name, lat: Number(place.y), lng: Number(place.x) });
            return;
          }

          ps.keywordSearch(keyword, (fbPlaces: any[], fbStatus: string) => {
            if (fbStatus === kakaoMaps.services.Status.OK && fbPlaces[0]) {
              const fbPlace = fbPlaces[0];
              resolve({ title: fbPlace.place_name, lat: Number(fbPlace.y), lng: Number(fbPlace.x) });
              return;
            }

            resolve(null);
          });
        });
      });
    });

    Promise.all(searchPromises).then((results) => {
      setMarkers(results.filter((result): result is MarkerPoint => result !== null));
    });
  }, [courseList, sdkReady, userLocation]);

  useEffect(() => {
    const kakaoMaps = getKakaoMaps();
    if (!sdkReady || !kakaoMaps || !containerRef.current) return;

    const center = markers[0] || myLocation;
    const centerLatLng = new kakaoMaps.LatLng(center.lat, center.lng);

    if (!kakaoMapRef.current) {
      kakaoMapRef.current = new kakaoMaps.Map(containerRef.current, {
        center: centerLatLng,
        level: 5,
      });
    }

    const map = kakaoMapRef.current;
    map.relayout();

    renderedRef.current.markers.forEach((marker) => marker.setMap(null));
    renderedRef.current.overlays.forEach((overlay) => overlay.setMap(null));
    renderedRef.current.polyline?.setMap(null);
    renderedRef.current = { markers: [], overlays: [] };

    const currentPosition = new kakaoMaps.LatLng(myLocation.lat, myLocation.lng);
    const currentMarker = new kakaoMaps.Marker({
      map,
      position: currentPosition,
      title: '내 위치',
    });
    renderedRef.current.markers.push(currentMarker);

    const bounds = new kakaoMaps.LatLngBounds();
    const path: any[] = [];

    markers.forEach((marker, index) => {
      const position = new kakaoMaps.LatLng(marker.lat, marker.lng);
      const kakaoMarker = new kakaoMaps.Marker({
        map,
        position,
        title: marker.title,
      });
      const overlay = new kakaoMaps.CustomOverlay({
        map,
        position,
        yAnchor: 1.8,
        content: `<div class="kakao-route-label">${index + 1}</div>`,
      });

      renderedRef.current.markers.push(kakaoMarker);
      renderedRef.current.overlays.push(overlay);
      bounds.extend(position);
      path.push(position);
    });

    if (path.length > 1) {
      renderedRef.current.polyline = new kakaoMaps.Polyline({
        map,
        path,
        strokeWeight: 4,
        strokeColor: '#315BFF',
        strokeOpacity: 0.8,
        strokeStyle: 'shortdash',
      });
    }

    if (markers.length > 1) {
      map.setBounds(bounds);
    } else if (markers.length === 1) {
      map.setCenter(path[0]);
    } else {
      map.setCenter(centerLatLng);
    }
  }, [markers, myLocation, sdkReady]);

  const fallbackMarkers = markers.length > 0 ? markers : coordinateMarkersFrom(courseList);

  if (!sdkReady) {
    return (
      <div className={`map-fallback ${className || ''}`}>
        <span className="fallback-road fallback-road-a" />
        <span className="fallback-road fallback-road-b" />
        {fallbackMarkers.length === 0 ? (
          <div className="map-fallback-empty">
            <strong>카카오맵 로딩 중</strong>
            <p>SDK가 준비되면 지도가 표시돼요.</p>
          </div>
        ) : (
          fallbackMarkers.map((marker, index) => (
            <span className={`fallback-pin fallback-pin-${index + 1}`} key={`${marker.title}-${index}`}>
              <b>{index + 1}</b>
              <small>{marker.title}</small>
            </span>
          ))
        )}
      </div>
    );
  }

  return (
    <div
      className={className}
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 250, borderRadius: 8 }}
    />
  );
}

export default MapBoard;
