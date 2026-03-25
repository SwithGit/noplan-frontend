// src/Chatbot.tsx
import React, { useState, useRef, useEffect } from 'react';
import MapBoard from './MapBoard';

declare global {
  interface Window {
    Kakao: any;
  }
}

interface StoreDetail {
  name: string;
  hanjul: string; 
  description: string; 
  imageUrl: string;
  recommendedMenu: { name: string; price: number }; 
  hours: string; 
  parking: boolean; 
  ratings: { combined: number; stars: number }; 
  reviewLinks: { naver?: string; google?: string; kakao?: string }; 
}

interface CourseItem {
  time: string;
  title: string;
  description: string;
  searchKeyword?: string;  
  type:string;
  lat?:number | string;
  lng?:number | string;
}

interface Message {
  id: number;
  sender: 'core' | 'user';
  text?: string; 
  courseData?: CourseItem[]; 
}

interface ChatbotProps {
  isDark:boolean;
  userNick: string;
}

const MOCK_STORE_DETAILS: { [key: string]: StoreDetail } = {
  '미미면가 본점': {
    name: '미미면가 본점',
    hanjul: '차분한 마무리, 따뜻한 한 끼 식사',
    description: '조용하고 아늑한 분위기에서 혼밥하기 좋은 소바 맛집입니다. 미미면가만의 특별한 소바로 하루의 여유를 완벽하게 마무리해보세요.',
    imageUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c71f2cd1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400', 
    recommendedMenu: { name: '새우튀김 냉소바', price: 13000 },
    hours: '11:30 ~ 21:00 (Break: 15:00 ~ 17:30)',
    parking: false,
    ratings: { combined: 4.8, stars: 5 },
    reviewLinks: { naver: 'https://m.place.naver.com/restaurant/37397775/home', kakao: 'https://place.map.kakao.com/27494553' }
  },
  '아우어베이커리': { 
    name: '아우어베이커리', 
    hanjul: '더티초코로 당 충전 완벽!', 
    description: '감각적인 인테리어와 다양한 빵이 가득한 힙한 베이커리입니다.', 
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400', 
    recommendedMenu: { name: '더티초코', price: 4800 }, 
    hours: '09:00 ~ 22:00', 
    parking: false, 
    ratings: { combined: 4.5, stars: 4 }, 
    reviewLinks: { naver: 'https://m.place.naver.com/restaurant/100000/home' } 
  },
  '동화고옥': { 
    name: '동화고옥', 
    hanjul: '고급스러운 궁중 요리로 힐링!', 
    description: '프라이빗한 룸에서 즐기는 깔끔하고 정갈한 한식 코스 요리입니다.', 
    imageUrl: 'https://images.unsplash.com/photo-1512132411229-c30391241dd8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400', 
    recommendedMenu: { name: '궁중 갈비찜', price: 45000 }, 
    hours: '11:00 ~ 22:00', 
    parking: true, 
    ratings: { combined: 4.7, stars: 5 }, 
    reviewLinks: { naver: 'https://m.place.naver.com/restaurant/200000/home' } 
  }
};


function Chatbot({isDark, userNick }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'core', text: `안녕하세요, ${userNick ? userNick : 'Guest'}님! 여행 계획을 함께 세워드릴 AI 가이드 코아입니다. 😊\n\n먼저, 현재 어디에 계신가요? (예: 상봉역, 홍대입구 등)` }
  ]);

  const [currentStep, setCurrentStep] = useState(0); 
  const [inputValue, setInputValue] = useState(''); 
  const [savedCourseId, setSavedCourseId] = useState<number | null>(null);
  const [searchCourseId, setSearchCourseId] = useState<number | null>(null);
  const [selectedStoreDetail, setSelectedStoreDetail] = useState<StoreDetail | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [travelData, setTravelData] = useState({
    location: '', startTime: '', pax: '', purpose: '', vibe: ''
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [flippedCardIndex, setFlippedCardIndex] = useState<number | null>(null);
  const [backupPlaces, setBackupPlaces] = useState<any[]>([]);
  const [showCourseMap, setShowCourseMap] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  },[messages]);

  const handleSendMessage = (userText: string) => {
    if (!userText.trim()) return; 

    setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text: userText }]);
    setInputValue(''); 

    setTimeout(async () => {
      let coreResponse = '';
      let nextStep = currentStep;
      let updatedData = { ...travelData }; 

      if (currentStep === 0) {
       setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'core', text: `${userNick}님의 목적지를 찰떡같이 파악하고 있어요... 🧐✨` }]);

        try {          
          const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
          
          const response = await fetch(`${API_BASE_URL}/api/course/generate/extract-location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: userText })
          });
          
          const result = await response.json();
          const finalLocation = result.location; // AI가 예쁘게 뽑아준 '건대'

          updatedData.location = finalLocation; 
          coreResponse = `아하, ${finalLocation} 쪽으로 가시는군요! ✨\n언제부터 일정을 시작할까요? (예: 지금부터, 내일 오후 7시 등)`;
          nextStep = 1; 

        } catch (error) {
          // 혹시 통신에러가 나면 쿨하게 유저가 친 글자 그대로 사용!
          updatedData.location = userText; 
          coreResponse = `아하, ${userText} 쪽으로 가시는군요! ✨\n언제부터 일정을 시작할까요?`;
          nextStep = 1; 
        }
      }
      else if (currentStep === 1) {
        updatedData.startTime = userText; 
        coreResponse = `네, ${userText} 시작으로 맞출게요! ⏰\n오늘 같이 여행할 인원은 몇 명인가요?`;
        nextStep = 2; 
      }
      else if (currentStep === 2) {
        updatedData.pax = userText; 
        coreResponse = `${userText}이서 가시는군요! 🥰\n오늘 여행의 목적은 무엇인가요? (예: 친구와 힐링, 데이트, 핫플 탐방 등)`;
        nextStep = 3;
      }
      else if (currentStep === 3) {
        updatedData.purpose = userText; 
        coreResponse = `목적 접수 완료! 🎯\n마지막으로 원하시는 분위기나 특별히 가고 싶은 곳(노래방, 카페 등)을 자유롭게 적어주세요!`;
        nextStep = 4;
      }
      else if (currentStep === 4) {
        updatedData.vibe = userText; 
        coreResponse = `완벽해요! ${userNick}님의 취향을 듬뿍 담아 코스 데이터를 분석 중입니다. 잠시만 기다려주세요... ⏳✨`;
        nextStep = 5; 
        
        const fetchAICourse = async () => {
          const savedUser = localStorage.getItem('loggedInUser');
          const currentUserId = savedUser ? JSON.parse(savedUser).userId : null;
          const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
          
          try {
            const response = await fetch(`${API_BASE_URL}/api/course/generate/generate-course`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...updatedData, userId: currentUserId })
            });
            const result = await response.json();

            if (response.ok && result.success) {
              setSearchCourseId(result.searchCourseId);
              setBackupPlaces(result.backupPlaces || []);
              setMessages((prev) => [
                ...prev, 
                { id: Date.now() + 2, sender: 'core', courseData: result.course }
              ]);
              setCurrentStep(6); 
            } else {
              setMessages((prev) => [...prev, { id: Date.now() + 2, sender: 'core', text: '죄송합니다. 코스를 생성하는 중에 문제가 발생했습니다. 다시 시도해 주세요. 😢' }]);
              setCurrentStep(4); 
            }
          } catch (error) {
            console.error('AI 호출 에러 ㅠㅠ:', error);
            setMessages((prev) => [...prev, { id: Date.now() + 2, sender: 'core', text: '서버와의 연결이 원활하지 않습니다.' }]);
            setCurrentStep(4); 
          }
        };

        fetchAICourse();
      }

      setTravelData(updatedData); 
      
      if (coreResponse) {
        setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'core', text: coreResponse }]);
        setCurrentStep(nextStep);
      }
    }, 800); 
  };

  const handleSaveCourse = async () => {
    if (savedCourseId) { alert("이미 마이페이지 서랍에 소중하게 보관해 뒀어요!"); return; }
    const currentCourseData = messages[messages.length - 1]?.courseData;
    if (!currentCourseData || currentCourseData.length === 0) { alert("저장할 코스가 없어요 ㅠㅠ"); return; }

    const savedUser = localStorage.getItem('loggedInUser');
    if (!savedUser) { alert("로그인 먼저 해주세요!"); return; }
    
    const { userId } = JSON.parse(savedUser);
    const API_BASE_URL = import.meta.env.VITE_APP_API_URL;

    try {
      const response = await fetch(`${API_BASE_URL}/api/course/explore/save-course`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          title: `${currentCourseData[0]?.title} 외 ${currentCourseData.length - 1}곳`, 
          location: travelData.location,
          courseData: currentCourseData 
        })
      });
      const result = await response.json();
      if (result.success) {
        alert("💖 마이페이지 '나만의 여행 서랍'에 쏙! 저장되었어요!");
        setSavedCourseId(result.courseId);
      }
    } catch (error) { console.error("저장 에러:", error); }
  };

  const handleCopyLink = () => {
    let linkToCopy = '';
    if (savedCourseId) linkToCopy = `${window.location.origin}/?seq=${savedCourseId}&type=saved`;
    else if (searchCourseId) linkToCopy = `${window.location.origin}/?seq=${searchCourseId}&type=search`;
    else { alert("공유할 코스가 없어요 ㅠㅠ"); return; }

    navigator.clipboard.writeText(linkToCopy).then(() => {
      alert("💖 링크가 복사되었어요! 친구에게 붙여넣기 해보세요!");
    });
  };

  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      alert("앗! 이 브라우저에서는 위치 확인을 지원하지 않아요 ㅠㅠ");
      return;
    }

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'core', text: "위치를 위성으로 찾고 있어요! 조금만 기다려주세요... 🛰️✨" }
    ]);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
          const geocoder = new kakao.maps.services.Geocoder();
          geocoder.coord2RegionCode(lng, lat, (result: any, status: any) => {
            if (status === kakao.maps.services.Status.OK) {
              const regionName = result.find((r: any) => r.region_type === 'H')?.address_name || result[0].address_name;
              handleSendMessage(regionName); 
            }
          });
        }
      },
      (error) => {
        console.error("위치 에러 ㅠㅠ:", error);
        alert("위치를 가져올 수 없어요! 폰이나 브라우저에 GPS(위치) 켜져 있는지 확인해봐요!");
      }
    );
  };

  const handleSwapPlace = (msgId: number, cardIndex: number, newPlace: CourseItem) => {
    // 오빠 아이디어대로 이미 AI가 예쁘게 써준 데이터를 0.1초 만에 그대로 덮어씌워용!
    setMessages((prev) => prev.map(msg => {
      if (msg.id === msgId && msg.courseData) {
        const newCourseData = [...msg.courseData];
        newCourseData[cardIndex] = { ...newPlace, time: newCourseData[cardIndex].time };
        return { ...msg, courseData: newCourseData };
      }
      return msg;
    }));
    setFlippedCardIndex(null); // 뒤집힌 카드 닫기!
  };

  const carouselCardStyle: React.CSSProperties = { 
    flex: '0 0 280px', height: '180px', cursor: 'pointer', position: 'relative', perspective: '1000px', margin: '10px 0' 
  };
  const cardSideStyle: React.CSSProperties = { 
    position: 'absolute', width: '100%', height: '100%', padding: '18px', borderRadius: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', backfaceVisibility: 'hidden', transition: 'transform 0.6s', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' 
  };
  const cardFrontStyle: React.CSSProperties = { ...cardSideStyle, backgroundColor: 'white', borderLeft: '5px solid #007AFF' };
  const cardBackStyle: React.CSSProperties = { ...cardSideStyle, backgroundColor: '#f0f2f5', color: '#333', border: '2px dashed #007AFF' };

  const titleBGColor= isDark ? '#000' : '#fff';
  const subBGColor= isDark ? '#333' : '#fff';
  const mainTitleColor = isDark ? '#fff' : '#333';
  const subTitleColor = isDark ? '#fff' : '#666';
  const cardBGColor = isDark ? '#000' : '#fff';   

const inputStyle = { 
  padding: '15px 20px', 
  border: '1px solid #ddd', 
  borderRadius: '25px', 
  fontSize: '15px', 
  flex: 1, 
  backgroundColor: '#f8f9fa', 
  outline: 'none',
  // 🚀 코아의 마법: 폰에서도 글자가 선명하게 보이도록 색상을 딱! 정해줘용!
  color: '#333' 
};
  const coreMsgStyle = { backgroundColor: cardBGColor, border: '1px solid #eee', color: mainTitleColor, padding: '12px 18px', borderRadius: '0 18px 18px 18px', maxWidth: '85%', alignSelf: 'flex-start', fontSize: '15px', marginBottom: '15px', lineHeight: '1.5', whiteSpace: 'pre-wrap', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' };
  const userMsgStyle = { backgroundColor: '#007AFF', color: 'white', padding: '12px 18px', borderRadius: '18px 0 18px 18px', maxWidth: '85%', alignSelf: 'flex-end', fontSize: '15px', marginBottom: '15px', lineHeight: '1.5', boxShadow: '0 2px 5px rgba(0,122,255,0.2)' };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: isMobile ? 'column' : 'row', 
      width: '100%', 
      height: isMobile ? 'calc(100vh - 150px)' : 'calc(100vh - 120px)', 
      backgroundColor: 'white', borderRadius: isMobile ? '15px' : '30px', 
      overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' 
    }}>
      
      <div style={{ 
        width: isMobile ? '100%' : '400px', 
        height: isMobile && currentStep === 6 ? '40%' : (isMobile ? '100%' : 'auto'),
        display: 'flex', flexDirection: 'column', 
        borderRight: isMobile ? 'none' : '1px solid #eee', 
        borderBottom: isMobile ? '1px solid #eee' : 'none',
        backgroundColor: '#fff', zIndex: 10,
        flexShrink: 0, 
        minHeight: 0 
      }}>
        
        <div style={{ padding: '20px', background:titleBGColor, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '24px' }}>🤖</div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: mainTitleColor}}>NoPlan AI 가이드</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#007AFF', fontWeight: 'bold' }}>코아 상시 대기 중 ✨</p>
          </div>
        </div>

        <div id="messages" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '20px', backgroundColor: subBGColor}}>
          {messages.map((msg) => {
            if (msg.text) return ( <div key={msg.id} style={msg.sender === 'core' ? coreMsgStyle : userMsgStyle}>{msg.text}</div> );
            
            if (msg.courseData && currentStep === 6) {
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', width: '100%' }}>
                  <p style={{ color: '#007AFF', fontWeight: 'bold', margin: '0 0 5px 5px', fontSize: '14px' }}>🎉 맞춤형 코스가 완성되었어요!</p>
                  <p style={{ fontSize: '13px', color: subTitleColor, margin: '0 0 10px 5px' }}>오른쪽 지도에서 동선과 상세 정보를 확인해 보세요!</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={handleSaveCourse} style={{ flex: 1, padding: '10px', backgroundColor: '#ff3b30', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>💖 코스 찜하기</button>
                    <button onClick={handleCopyLink} style={{ flex: 1, padding: '10px', backgroundColor: '#fedc3e', color: '#391b1b', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>💬 링크 복사</button> 
                  </div>
                  <button onClick={() => { 
                      setMessages((prev) => [
                        ...prev, 
                        { id: Date.now(), sender: 'core', text: '어떤 부분을 살짝 바꿔볼까요? (예: 노래방 빼고 카페로 등) 자유롭게 적어주세요! ✍️' }
                      ]); 
                      setCurrentStep(4); 
                      setSavedCourseId(null); 
                      setSearchCourseId(null); 
                    }} style={{ padding: '10px', backgroundColor: '#e6f2ff', color: '#007AFF', border: '1px solid #007AFF', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '12px', marginTop: '10px' }}> 
                    ⏪ 마지막 조건만 살짝 수정하기 
                  </button>
                  <button onClick={() => { setFlippedCardIndex(null); setMessages([{ id: Date.now(), sender: 'core', text: '다시 새로운 여행을 떠나볼까요? 현재 어디에 계신가요?' }]); setCurrentStep(0); setSavedCourseId(null); setSearchCourseId(null); setTravelData({ location: '', startTime: '', pax: '', purpose: '', vibe: '' }); }} style={{ padding: '10px', backgroundColor: '#f0f2f5', color: '#333', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '12px', marginTop: '5px' }}> 
                    🔄 아예 처음부터 다시 짜기 
                  </button>
                  <button 
                    onClick={() => {
                      // 🌸 코스 데이터를 "이름,위도,경도" 덩어리로 만들고 슬래시(/)로 이어붙여용!
                      const pathString = msg.courseData!.map(p => `${encodeURIComponent(p.searchKeyword || p.title)},${p.lat},${p.lng}`).join('/');
                      const fullRouteUrl = `https://map.kakao.com/link/by/walk/${pathString}`;
                      window.open(fullRouteUrl, '_blank');
                    }} 
                    style={{ padding: '12px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '14px', marginBottom: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(0,122,255,0.3)' }}
                  > 
                    🗺️ 카카오맵에서 전체 코스 동선 보기 
                  </button>
                </div>
              );
            }
            return null;
          })}
          <div ref={messagesEndRef} />
        </div>
        
        <div style={{ padding: '20px', borderTop: '1px solid #eee', backgroundColor: titleBGColor }}>
          {currentStep === 0 && ( 
            <button onClick={handleMyLocation} style={{ width: '100%', marginBottom: '10px', padding: '12px', backgroundColor: '#e8f0fe', color: '#007AFF', border: '1px solid #007AFF', borderRadius: '15px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}> 
              📍 내 현재 위치로 핫플 찾기 
            </button> 
          )}
          {currentStep === 1 && ( 
            <button onClick={() => handleSendMessage('지금부터')} style={{ width: '100%', marginBottom: '10px', padding: '12px', backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', borderRadius: '15px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}> 
              ⏰ 지금부터 당장 시작할래요! 
            </button> 
          )}

          {(currentStep === 0 || currentStep === 1 || currentStep === 3 || currentStep === 4) && ( 
            <div style={{ display: 'flex', width: '100%', gap: '10px' }}>
              <input type="text" placeholder={currentStep === 4 ? "자유롭게 적어주세요!" : "입력해 주세요."} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)} style={inputStyle} /> 
              <button onClick={() => handleSendMessage(inputValue)} style={{ padding: '0 20px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '25px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}>전송</button> 
            </div>
          )}
          {currentStep === 2 && ( 
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}> 
              {[1, 2, 3, 4, 5].map((num) => ( <button key={num} onClick={() => handleSendMessage(`${num}명`)} style={{ flex: 1, padding: '12px 0', backgroundColor: 'white', border: '1px solid #007AFF', color: '#007AFF', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}> {num}명 </button> ))} 
            </div> 
          )}
          {currentStep === 5 && ( <p style={{ width: '100%', textAlign: 'center', color: '#007AFF', fontSize: '14px', margin: 0, fontWeight: 'bold' }}> 코아가 열심히 코스를 짜고 있어요... 🚀 </p> )}
          {currentStep === 6 && ( <p style={{ width: '100%', textAlign: 'center', color: subTitleColor, fontSize: '13px', margin: 0 }}> 우측 지도에서 결과를 확인해 주세요! 👉 </p> )}
        </div>
      </div> 

      <div style={{ flex: 1, backgroundColor: '#f4f6f8', position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {currentStep === 6 && messages[messages.length - 1]?.courseData ? (
          <>
            {!isMobile && (
              <>
                <div style={{ flex: 1, width: '100%' }}>
                  <MapBoard courseList={messages[messages.length - 1].courseData!} userLocation={travelData.location} />
                </div>
                <div style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', padding: '20px 30px', display: 'flex', overflowX: 'auto', gap: '20px', boxSizing: 'border-box', background: 'linear-gradient(to top, rgba(255,255,255,1) 30%, rgba(255,255,255,0) 100%)' }}>
                  {messages[messages.length - 1].courseData!.map((item, index) => (
                    <div key={index} style={carouselCardStyle}>
                      <div 
                        onClick={() => {
                            const keyword = item.searchKeyword || item.title;
                            const detailData = MOCK_STORE_DETAILS[keyword] || { name: keyword, hanjul: '노플랜 핫플레이스!', description: item.description, imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400', recommendedMenu: { name: '현장 확인 요망', price: 0 }, hours: '업체 확인 필요', parking: false, ratings: { combined: 4.5, stars: 4 }, reviewLinks: {} };
                            setSelectedStoreDetail(detailData); 
                        }}
                        style={{ ...cardFrontStyle, transform: flippedCardIndex === index ? 'rotateY(-180deg)' : 'rotateY(0deg)' }}
                      >
                        <p style={{ color: '#888', fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0' }}>⏰ {item.time}</p>
                        <p style={{ color: '#333', fontSize: '16px', fontWeight: 'bold', margin: '0 0 5px 0', whiteSpace: 'normal', wordBreak: 'keep-all' }}>✨ {item.title}</p>
                        <p style={{ color: '#007AFF', fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px 0', whiteSpace: 'normal' }}>📍 {item.searchKeyword || item.title}</p>
                        <p style={{ color: '#555', fontSize: '13px', lineHeight: '1.5', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', whiteSpace: 'normal' }}>
                          {item.description}
                        </p>
                        <button onClick={(e) => { e.stopPropagation(); setFlippedCardIndex(index); }} style={{ position: 'absolute', bottom: '15px', right: '15px', padding: '5px 10px', fontSize: '11px', backgroundColor: '#e6f2ff', color: '#007AFF', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}> 🔄 다른 곳 추천 </button>
                        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            // 🌸 목적지만 정확히(위도/경도 포함) 던져주면 출발지는 내 위치로 자동 세팅돼용!
            const routeUrl = `https://map.kakao.com/link/to/${encodeURIComponent(item.searchKeyword || item.title)},${item.lat},${item.lng}`;
            window.open(routeUrl, '_blank');
          }} 
          style={{ position: 'absolute', bottom: '15px', left: '15px', padding: '5px 12px', fontSize: '11px', backgroundColor: '#fff', color: '#007AFF', border: '1px solid #007AFF', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
        > 
          📍 목적지로 길찾기 
        </button>
                      </div>
                      <div style={{ ...cardBackStyle, transform: flippedCardIndex === index ? 'rotateY(0deg)' : 'rotateY(180deg)' }}>
                        <p style={{ color: '#007AFF', fontSize: '13px', fontWeight: 'bold', margin: '0 0 10px 0', textAlign: 'center' }}>🔄 근처의 다른 핫플이에요!</p>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '5px' }}>
                          {backupPlaces
      .filter(bp => bp.type === item.type) // 🌸 마법의 한 줄! "타입이 같니?"
      .slice(0, 10) // 너무 많으면 복잡하니까 그중 10개만!
      .map((backupPlace, bIdx) => {
        const realPlace = {
          time: '언제든',
          title: backupPlace.title,
          description: backupPlace.description,
          searchKeyword: backupPlace.searchKeyword,
          type: backupPlace.type // 타입도 챙겨가용!
        };

        return (
          <div key={bIdx} 
            onClick={() => handleSwapPlace(messages[messages.length - 1].id, index, realPlace)}
            style={{ padding: '10px', backgroundColor: 'white', borderRadius: '10px', border: '1px solid #ddd', fontSize: '12px', color: '#333', cursor: 'pointer' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>📍 {realPlace.searchKeyword}</p>
            <p style={{ margin: '3px 0 0 0', color: '#666', fontSize: '11px' }}>{realPlace.title}</p>
          </div>
        );
    })}

    {/* 🌸 만약 해당 타입의 백업이 하나도 없다면? (방어 코드!) */}
    {backupPlaces.filter(bp => bp.type === item.type).length === 0 && (
      <p style={{ fontSize: '11px', color: '#888', textAlign: 'center', marginTop: '20px' }}>
        앗! 이 주변엔 다른 비슷한 장소가 없나 봐요 ㅠㅠ 
      </p>
    )}
                        </div>
                        <button onClick={() => setFlippedCardIndex(null)} style={{ marginTop: '10px', padding: '5px 10px', fontSize: '11px', backgroundColor: '#fff', color: '#888', border: '1px solid #ddd', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}> ✖ 취소 </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {isMobile && (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ flex: '0 0 320px', width: '100%', position: 'relative' }}>
                  <MapBoard courseList={messages[messages.length - 1].courseData!} userLocation={travelData.location} />
                </div>
                <div style={{ flex: 1, backgroundColor: '#f4f6f8', padding: '20px 15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <p style={{ color: '#ff3b30', fontWeight: 'bold', margin: '0 0 5px 5px', fontSize: '15px' }}>⏰ 코스 상세 일정</p>
                  <p style={{ fontSize: '12px', color: '#666', margin: '0 0 10px 5px' }}>아래로 스크롤해서 상세 일정을 확인하세요!</p>
                  
                  {messages[messages.length - 1].courseData!.map((item, index) => (
                    <div key={index} style={{ ...carouselCardStyle, flex: '0 0 auto', width: '100%', margin: 0 }}>
                      <div 
                        onClick={() => {
                            const keyword = item.searchKeyword || item.title;
                            const detailData = MOCK_STORE_DETAILS[keyword] || { name: keyword, hanjul: '노플랜 핫플레이스!', description: item.description, imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400', recommendedMenu: { name: '현장 확인 요망', price: 0 }, hours: '업체 확인 필요', parking: false, ratings: { combined: 4.5, stars: 4 }, reviewLinks: {} };
                            setSelectedStoreDetail(detailData); 
                        }}
                        style={{ ...cardFrontStyle, transform: flippedCardIndex === index ? 'rotateY(-180deg)' : 'rotateY(0deg)' }}
                      >
                        <p style={{ color: '#888', fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0' }}>⏰ {item.time}</p>
                        <p style={{ color: '#333', fontSize: '16px', fontWeight: 'bold', margin: '0 0 5px 0', whiteSpace: 'normal', wordBreak: 'keep-all' }}>✨ {item.title}</p>
                        <p style={{ color: '#007AFF', fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px 0', whiteSpace: 'normal' }}>📍 {item.searchKeyword || item.title}</p>
                        <p style={{ color: '#555', fontSize: '13px', lineHeight: '1.5', margin: 0, overflow: 'visible', textOverflow: 'clip', display: 'block', WebkitLineClamp: 'none', WebkitBoxOrient: 'horizontal', whiteSpace: 'normal' }}>
                          {item.description}
                        </p>
                        <button onClick={(e) => { e.stopPropagation(); setFlippedCardIndex(index); }} style={{ position: 'absolute', bottom: '15px', right: '15px', padding: '5px 10px', fontSize: '11px', backgroundColor: '#e6f2ff', color: '#007AFF', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}> 🔄 다른 곳 추천 </button>
                      </div>
                      <div style={{ ...cardBackStyle, transform: flippedCardIndex === index ? 'rotateY(0deg)' : 'rotateY(180deg)' }}>
                        <p style={{ color: '#007AFF', fontSize: '13px', fontWeight: 'bold', margin: '0 0 10px 0', textAlign: 'center' }}>🔄 근처의 다른 핫플이에요!</p>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '5px' }}>
                          {backupPlaces
      .filter(bp => bp.type === item.type) // 🌸 마법의 한 줄! "타입이 같니?"
      .slice(0, 10) // 너무 많으면 복잡하니까 그중 10개만!
      .map((backupPlace, bIdx) => {
        const realPlace = {
          time: '언제든',
          title: backupPlace.title,
          description: backupPlace.description,
          searchKeyword: backupPlace.searchKeyword,
          type: backupPlace.type // 타입도 챙겨가용!
        };

        return (
          <div key={bIdx} 
            onClick={() => handleSwapPlace(messages[messages.length - 1].id, index, realPlace)}
            style={{ padding: '10px', backgroundColor: 'white', borderRadius: '10px', border: '1px solid #ddd', fontSize: '12px', color: '#333', cursor: 'pointer' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>📍 {realPlace.searchKeyword}</p>
            <p style={{ margin: '3px 0 0 0', color: '#666', fontSize: '11px' }}>{realPlace.title}</p>
          </div>
        );
    })}

    {/* 🌸 만약 해당 타입의 백업이 하나도 없다면? (방어 코드!) */}
    {backupPlaces.filter(bp => bp.type === item.type).length === 0 && (
      <p style={{ fontSize: '11px', color: '#888', textAlign: 'center', marginTop: '20px' }}>
        앗! 이 주변엔 다른 비슷한 장소가 없나 봐요 ㅠㅠ 
      </p>
    )}
                        </div>
                        <button onClick={() => setFlippedCardIndex(null)} style={{ marginTop: '10px', padding: '5px 10px', fontSize: '11px', backgroundColor: '#fff', color: '#888', border: '1px solid #ddd', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}> ✖ 취소 </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          !isMobile && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
              <div style={{ fontSize: '50px', marginBottom: '20px' }}>🗺️</div>
              <h2 style={{ fontSize: '20px', color: '#333', margin: '0 0 10px 0' }}>코아와 대화를 시작해 보세요!</h2>
              <p style={{ fontSize: '15px', textAlign: 'center', lineHeight: '1.6' }}>몇 가지 질문에 답해주시면,<br />이 넓은 화면에 {userNick}님만을 위한 완벽한 지도가 그려질 거예요 ✨</p>
            </div>
          )
        )}
      </div>

        {showCourseMap && messages[messages.length - 1]?.courseData && (
        <CourseMap 
          courseList={messages[messages.length - 1].courseData!} 
          userLocation={travelData.location} 
          onClose={() => setShowCourseMap(false)} 
        />
      )}

      <StoreDetailModal detail={selectedStoreDetail} onClose={() => setSelectedStoreDetail(null)}/>
    </div>
  );
}

const StoreDetailModal = ({ detail, onClose }: { detail: StoreDetail | null; onClose: () => void }) => {
  if (!detail) return null; 
  const reviewBtnStyle = (color: string) => ({ width: '50px', height: '50px', borderRadius: '50%', border: `3px solid ${color}`, backgroundColor: 'white', color: color, fontWeight: 'bold', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', textAlign: 'center' as const, flexShrink: 0 });

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '25px', width: '100%', maxWidth: '360px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', position: 'relative' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#333', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail.name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', position: 'absolute', right: '45px', top: '15px' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #007AFF', color: '#007AFF', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>N</div>
            <p style={{ margin: 0, marginLeft: '5px', fontSize: '11px', color: '#007AFF', fontWeight: 'bold' }}>인증마크</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✖</button>
        </div>
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <img src={detail.imageUrl} alt={detail.name} style={{ width: '120px', height: '120px', borderRadius: '15px', objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#333' }}>한줄평</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#555', lineHeight: '1.6', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' as const }}>{detail.hanjul}</p>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.6', marginBottom: '20px', marginTop: 0 }}>{detail.description}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#333', borderTop: '1px solid #eee', paddingTop: '15px', marginBottom: '20px' }}>
            <p style={{ margin: 0 }}><strong>추천 메뉴:</strong> {detail.recommendedMenu.name} ({detail.recommendedMenu.price}원)</p>
            <p style={{ margin: 0 }}><strong>영업 시간:</strong> {detail.hours}</p>
            <p style={{ margin: 0 }}><strong>주차 여부:</strong> {detail.parking ? '가능 🚗' : '불가능 ✖'}</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '15px', marginTop: 'auto' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#666', marginRight: '5px' }}>리뷰:</p>
                <button onClick={() => detail.reviewLinks.naver && window.open(detail.reviewLinks.naver)} style={reviewBtnStyle('#2DB400')}>네이버</button>
                <button onClick={() => detail.reviewLinks.google && window.open(detail.reviewLinks.google)} style={reviewBtnStyle('#ea4335')}>구글</button>
                <button onClick={() => detail.reviewLinks.kakao && window.open(detail.reviewLinks.kakao)} style={reviewBtnStyle('#FEE500')}>카카오</button>
            </div>
            <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>3사 종합평점</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <p style={{ margin: 0, fontSize: '18px', color: '#f39c12' }}>{'⭐'.repeat(detail.ratings.stars)}</p>
                    <p style={{ margin: 0, fontSize: '18px', color: '#333', fontWeight: 'bold' }}>{detail.ratings.combined}</p>
                </div>
            </div>
          </div>
        </div>
        <div style={{ padding: '15px', borderTop: '1px solid #eee', marginTop: 'auto' }}>
          <button onClick={onClose} style={{ width: '100%', padding: '14px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>확인</button>
        </div>
      </div>
    </div>
  );
};

const CourseMap = ({ courseList, userLocation, onClose }: { courseList: CourseItem[]; userLocation: string; onClose: () => void }) => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services || !mapRef.current) return;
    
    const ps = new kakao.maps.services.Places();
    const bounds = new kakao.maps.LatLngBounds();
    
    // 🌸 1. 일단 기본 위치(서울)로 지도를 먼저 예쁘게 띄워놔용!
    const map = new kakao.maps.Map(mapRef.current, { center: new kakao.maps.LatLng(37.566826, 126.9786567), level: 3 });

    const findPlaces = async () => {
      const searchPromises = courseList.map((item) => {
        return new Promise<{title: string, lat: number, lng: number} | null>((resolve) => {
          const keyword = item.searchKeyword || item.title;
          const localKeyword = `${userLocation} ${keyword}`;
          
          ps.keywordSearch(localKeyword, (places, searchStatus) => {
            if (searchStatus === kakao.maps.services.Status.OK) {
              const place = places[0];
              resolve({ title: place.place_name, lat: Number(place.y), lng: Number(place.x) });
            } else { 
              ps.keywordSearch(keyword, (fbPlaces, fbStatus) => { 
                if (fbStatus === kakao.maps.services.Status.OK) { 
                  const fbPlace = fbPlaces[0]; 
                  resolve({ title: fbPlace.place_name, lat: Number(fbPlace.y), lng: Number(fbPlace.x) }); 
                } else {
                  resolve(null); 
                }
              }); 
            }
          });
        });
      });

      const results = await Promise.all(searchPromises);
      const validMarkers = results.filter((r): r is {title: string, lat: number, lng: number} => r !== null);
      
      // 🚀 2. 코아의 철벽 방어: 찾은 마커가 하나도 없을 때!
      if (validMarkers.length === 0) {
        ps.keywordSearch(userLocation, (locData, locStatus) => {
          if (locStatus === kakao.maps.services.Status.OK) {
            const centerLoc = new kakao.maps.LatLng(Number(locData[0].y), Number(locData[0].x));
            // 앗! 마커는 없지만 동네 위치로 지도를 슝~ 이동시켜줘용!
            map.setCenter(centerLoc);
            map.setLevel(4); 
          }
        });
        return; // 더 이상 에러 안 나게 여기서 쿨하게 함수 종료!
      }

      // 🌸 3. 마커가 무사히 찾아졌다면 지도에 콕콕 찍기!
      validMarkers.forEach(marker => {
        new kakao.maps.Marker({ map: map, position: new kakao.maps.LatLng(marker.lat, marker.lng), title: marker.title });
        bounds.extend(new kakao.maps.LatLng(marker.lat, marker.lng));
      });
      
      // 4. 마커들이 다 보이게 지도 화면 쫙! 맞춰주기
      if (validMarkers.length > 0) {
        map.setBounds(bounds);
      }
    };
    
    findPlaces();
  }, [courseList, userLocation]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'white', zIndex: 10000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>🗺️ 노플랜 전체 동선 맵</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#888' }}>✖</button>
      </div>
      <div ref={mapRef} style={{ flex: 1, width: '100%' }} />
    </div>
  );
};

export default Chatbot;