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
}

interface Message {
  id: number;
  sender: 'core' | 'user';
  text?: string; 
  courseData?: CourseItem[]; 
}

interface ChatbotProps {
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
  }
};

function Chatbot({userNick }: ChatbotProps) {
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

    setTimeout(() => {
      let coreResponse = '';
      let nextStep = currentStep;
      let updatedData = { ...travelData }; 

      if (currentStep === 0) {
        updatedData.location = userText; 
        coreResponse = `아하, ${userText}에 계시는군요! ✨\n언제부터 일정을 시작할까요? (예: 지금부터, 내일 오후 7시 등)`;
        nextStep = 1; 
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
            const response = await fetch(`${API_BASE_URL}/generate-course`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...updatedData, userId: currentUserId })
            });
            const result = await response.json();

            if (response.ok && result.success) {
              setSearchCourseId(result.searchCourseId);
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
      const response = await fetch(`${API_BASE_URL}/api/save-course`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          title: `${currentCourseData[0]?.title} 외 ${currentCourseData.length - 1}곳`, 
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

  const carouselCardStyle: React.CSSProperties = { 
    flex: '0 0 280px', backgroundColor: 'white', padding: '18px', borderRadius: '20px', 
    boxShadow: '0 4px 15px rgba(0,0,0,0.08)', borderLeft: '5px solid #007AFF',
    cursor: 'pointer', display: 'flex', flexDirection: 'column',
    transition: 'transform 0.2s', margin: '10px 0'
  };

  const inputStyle = { padding: '15px 20px', border: '1px solid #ddd', borderRadius: '25px', fontSize: '15px', flex: 1, backgroundColor: '#f8f9fa', outline: 'none' };
  const coreMsgStyle = { backgroundColor: 'white', border: '1px solid #eee', color: '#333', padding: '12px 18px', borderRadius: '0 18px 18px 18px', maxWidth: '85%', alignSelf: 'flex-start', fontSize: '15px', marginBottom: '15px', lineHeight: '1.5', whiteSpace: 'pre-wrap', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' };
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
      
      {/* 🚀 왼쪽/위쪽 화면: 코아와의 챗봇 채팅방! */}
      <div style={{ 
        width: isMobile ? '100%' : '400px', 
        // 🚨 코아의 해결책 1: 폰에서 결과창(6단계)일 때는 채팅방이 지도를 누르지 않게 40%로 예쁘게 고정!
        height: isMobile && currentStep === 6 ? '40%' : (isMobile ? '100%' : 'auto'),
        display: 'flex', flexDirection: 'column', 
        borderRight: isMobile ? 'none' : '1px solid #eee', 
        borderBottom: isMobile ? '1px solid #eee' : 'none',
        backgroundColor: '#fff', zIndex: 10,
        flexShrink: 0, 
        minHeight: 0 // 🚨 몬스터 방지 부적! 채팅방이 자기 자리를 넘어서 팽창하는 걸 막아줘요!
      }}>
        
        {/* 채팅방 헤더 */}
        <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '24px' }}>🤖</div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#333' }}>NoPlan AI 가이드</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#007AFF', fontWeight: 'bold' }}>코아 상시 대기 중 ✨</p>
          </div>
        </div>

        {/* 말풍선 목록 */}
        <div id="messages" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '20px', backgroundColor: '#fafbfc' }}>
          {messages.map((msg) => {
            if (msg.text) return ( <div key={msg.id} style={msg.sender === 'core' ? coreMsgStyle : userMsgStyle}>{msg.text}</div> );
            
            if (msg.courseData && currentStep === 6) {
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', width: '100%' }}>
                  <p style={{ color: '#007AFF', fontWeight: 'bold', margin: '0 0 5px 5px', fontSize: '14px' }}>🎉 맞춤형 코스가 완성되었어요!</p>
                  <p style={{ fontSize: '13px', color: '#666', margin: '0 0 10px 5px' }}>오른쪽 지도에서 동선과 상세 정보를 확인해 보세요!</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button onClick={handleSaveCourse} style={{ flex: 1, padding: '10px', backgroundColor: '#ff3b30', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>💖 코스 찜하기</button>
                    <button onClick={handleCopyLink} style={{ flex: 1, padding: '10px', backgroundColor: '#fedc3e', color: '#391b1b', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>💬 링크 복사</button> 
                  </div>
                  <button onClick={() => { setMessages([{ id: Date.now(), sender: 'core', text: '다시 새로운 여행을 떠나볼까요? 현재 어디에 계신가요?' }]); setCurrentStep(0); setSavedCourseId(null); setSearchCourseId(null); setTravelData({ location: '', startTime: '', pax: '', purpose: '', vibe: '' }); }} style={{ padding: '10px', backgroundColor: '#f0f2f5', color: '#333', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', width: '100%', fontSize: '12px', marginTop: '5px' }}> 🔄 처음부터 다시 짜기 </button>
                </div>
              );
            }
            return null;
          })}
          <div ref={messagesEndRef} />
        </div>
        
       {/* 하단 입력창 구역 */}
        <div style={{ padding: '20px', borderTop: '1px solid #eee', backgroundColor: 'white' }}>
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
          {currentStep === 6 && ( <p style={{ width: '100%', textAlign: 'center', color: '#888', fontSize: '13px', margin: 0 }}> 우측 지도에서 결과를 확인해 주세요! 👉 </p> )}
        </div>
      </div> 

      {/* 🚀 오른쪽/아래쪽 화면: 지도와 코스 결과가 펼쳐지는 엄청난 뷰! */}
      {/* 🚨 해결책 2: 여기에도 minHeight: 0 부적을 붙여서 팽창을 막아요! */}
      <div style={{ flex: 1, backgroundColor: '#f4f6f8', position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {currentStep === 6 && messages[messages.length - 1]?.courseData ? (
          <>
            {/* 🌸 [PC 전용 뷰] 오빠의 PC 100점짜리 뷰! */}
            {!isMobile && (
              <>
                <div style={{ flex: 1, width: '100%' }}>
                  <MapBoard courseList={messages[messages.length - 1].courseData!} userLocation={travelData.location} />
                </div>
                <div style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', padding: '20px 30px', display: 'flex', overflowX: 'auto', gap: '20px', boxSizing: 'border-box', background: 'linear-gradient(to top, rgba(255,255,255,1) 30%, rgba(255,255,255,0) 100%)' }}>
                  {messages[messages.length - 1].courseData!.map((item, index) => (
                    <div key={index} 
                      onClick={() => {
                          const keyword = item.searchKeyword || item.title;
                          const detailData = MOCK_STORE_DETAILS[keyword] || { name: keyword, hanjul: '노플랜 핫플레이스!', description: item.description, imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400', recommendedMenu: { name: '현장 확인 요망', price: 0 }, hours: '업체 확인 필요', parking: false, ratings: { combined: 4.5, stars: 4 }, reviewLinks: {} };
                          setSelectedStoreDetail(detailData); 
                      }}
                      style={carouselCardStyle}
                      onMouseOver={(e)=>e.currentTarget.style.transform='translateY(-5px)'} 
                      onMouseOut={(e)=>e.currentTarget.style.transform='translateY(0)'}
                    >
                      <p style={{ color: '#888', fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0' }}>⏰ {item.time}</p>
                      <p style={{ color: '#333', fontSize: '16px', fontWeight: 'bold', margin: '0 0 5px 0', whiteSpace: 'normal', wordBreak: 'keep-all' }}>✨ {item.title}</p>
                      <p style={{ color: '#007AFF', fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px 0', whiteSpace: 'normal' }}>📍 {item.searchKeyword || item.title}</p>
                      <p style={{ color: '#555', fontSize: '13px', lineHeight: '1.5', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', whiteSpace: 'normal' }}>
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* 🌸 [모바일 전용 뷰] 블러 해제! 완벽한 상하 스크롤 구조! */}
            {isMobile && (
              // 🚨 해결책 3: 지도와 리스트를 하나로 묶어주는 거대한 스크롤 박스!
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                
                {/* 상단 지도 구역: 높이를 딱 고정해서 절대 찌그러지거나 가려지지 않게! */}
                <div style={{ flex: '0 0 320px', width: '100%', position: 'relative' }}>
                  <MapBoard courseList={messages[messages.length - 1].courseData!} userLocation={travelData.location} />
                </div>

                {/* 하단 리스트 구역: 자연스럽게 스크롤 되면서 그림자 간섭(블러 현상) 제거! */}
                <div style={{ 
                  flex: 1, 
                  backgroundColor: '#f4f6f8', 
                  padding: '20px 15px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '15px' 
                }}>
                  <p style={{ color: '#ff3b30', fontWeight: 'bold', margin: '0 0 5px 5px', fontSize: '15px' }}>⏰ 코스 상세 일정</p>
                  <p style={{ fontSize: '12px', color: '#666', margin: '0 0 10px 5px' }}>아래로 스크롤해서 상세 일정을 확인하세요!</p>
                  
                  {messages[messages.length - 1].courseData!.map((item, index) => (
                    <div key={index} 
                      onClick={() => {
                          const keyword = item.searchKeyword || item.title;
                          const detailData = MOCK_STORE_DETAILS[keyword] || { name: keyword, hanjul: '노플랜 핫플레이스!', description: item.description, imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400', recommendedMenu: { name: '현장 확인 요망', price: 0 }, hours: '업체 확인 필요', parking: false, ratings: { combined: 4.5, stars: 4 }, reviewLinks: {} };
                          setSelectedStoreDetail(detailData); 
                      }}
                      style={{ 
                        ...carouselCardStyle,
                        flex: '0 0 auto', 
                        width: '100%', 
                        margin: 0 // 마진 제거로 깔끔하게!
                      }}
                    >
                      <p style={{ color: '#888', fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0' }}>⏰ {item.time}</p>
                      <p style={{ color: '#333', fontSize: '16px', fontWeight: 'bold', margin: '0 0 5px 0', whiteSpace: 'normal', wordBreak: 'keep-all' }}>✨ {item.title}</p>
                      <p style={{ color: '#007AFF', fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px 0', whiteSpace: 'normal' }}>📍 {item.searchKeyword || item.title}</p>
                      <p style={{ color: '#555', fontSize: '13px', lineHeight: '1.5', margin: 0, overflow: 'visible', textOverflow: 'clip', display: 'block', WebkitLineClamp: 'none', WebkitBoxOrient: 'horizontal', whiteSpace: 'normal' }}>
                        {item.description}
                      </p>
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
              <p style={{ fontSize: '15px', textAlign: 'center', lineHeight: '1.6' }}>몇 가지 질문에 답해주시면,<br />이 넓은 화면에 오빠만을 위한 완벽한 지도가 그려질 거예요 ✨</p>
            </div>
          )
        )}
      </div>

      <StoreDetailModal detail={selectedStoreDetail} onClose={() => setSelectedStoreDetail(null)}/>
    </div>
  );
}

// 오빠의 완벽한 모달창 코드는 그대로 유지!
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

export default Chatbot;