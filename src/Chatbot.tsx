// Chatbot.tsx
import { useState, useRef, useEffect } from 'react';
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
    imageUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c71f2cd1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTkyMXwwfDF8c2VhcmNofDh8fGphcGFuZXNlJTIwbm9vZGxlfGVufDB8fHx8MTY3ODkzNzYzNQ&ixlib=rb-4.0.3&q=80&w=400', 
    recommendedMenu: { name: '새우튀김 냉소바', price: 13000 },
    hours: '11:30 ~ 21:00 (Break: 15:00 ~ 17:30)',
    parking: false,
    ratings: { combined: 4.8, stars: 5 },
    reviewLinks: { naver: 'https://m.place.naver.com/restaurant/37397775/home', kakao: 'https://place.map.kakao.com/27494553' }
  },
  '양반댁': {
    name: '인사동 양반댁',
    hanjul: '고즈넉한 한옥에서 즐기는 정갈한 한식',
    description: '부모님 모시고 가기 좋은, 상견례 장소로도 유명한 깊은 맛의 한정식집입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1620703130931-bdc115ff68f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTkyMXwwfDF8c2VhcmNofDF8fGtvcmVhbiUyMGZvb2QlMjB0YWJsZXxlbnwwfHx8fDE2Nzg5Mzc2NzQ&ixlib=rb-4.0.3&q=80&w=400',
    recommendedMenu: { name: '보리굴비 정식', price: 28000 },
    hours: '12:00 ~ 22:00',
    parking: true,
    ratings: { combined: 4.7, stars: 5 },
    reviewLinks: { naver: 'https://m.place.naver.com/restaurant/11698773/home' }
  }, 
  '쌈지길': {
    name: '인사동 쌈지길',
    hanjul: '고즈넉한 한옥에서 즐기는 정갈한 한식',
    description: '부모님 모시고 가기 좋은, 상견례 장소로도 유명한 깊은 맛의 한정식집입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1620703130931-bdc115ff68f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwxMTkyMXwwfDF8c2VhcmNofDF8fGtvcmVhbiUyMGZvb2QlMjB0YWJsZXxlbnwwfHx8fDE2Nzg5Mzc2NzQ&ixlib=rb-4.0.3&q=80&w=400',
    recommendedMenu: { name: '보리굴비 정식', price: 28000 },
    hours: '12:00 ~ 22:00',
    parking: true,
    ratings: { combined: 4.7, stars: 5 },
    reviewLinks: { naver: 'https://m.place.naver.com/restaurant/11698773/home' }
  }
};

function Chatbot({userNick }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'core', text: `안녕하세요, ${userNick}님! 여행 계획을 함께 세워드릴 AI 가이드 코아입니다. 😊` },
    { id: 2, sender: 'core', text: '먼저, 현재 어디에 계신가요? (예: 인사동 쌈지길, 해운대 등)' },
  ]);

  const [currentStep, setCurrentStep] = useState(0); 
  const [inputValue, setInputValue] = useState(''); 
  const [savedCourseId, setSavedCourseId] = useState<number | null>(null);
  const [searchCourseId, setSearchCourseId] = useState<number | null>(null);
  const [selectedStoreDetail, setSelectedStoreDetail] = useState<StoreDetail | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 🚀 코아의 핵심 마법 상자! 5가지 대답을 여기에 꽉꽉 모을 거예용!
  const [travelData, setTravelData] = useState({
    location: '',
    startTime: '', // 🌸 언제부터 놀 건지 담아둘 빈칸 추가!
    pax: '',
    purpose: '',
    vibe: ''
  });

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

      // 🌸 오빠의 새로운 기획대로 5스텝!
      if (currentStep === 0) {
        updatedData.location = userText; 
        coreResponse = `아하, ${userText}에 계시는군요! 멋진 곳이죠! ✨ 언제부터 일정을 시작할까요? (예: 지금부터, 내일 오후 7시 등)`;
        nextStep = 1; // 🚀 시간 물어보는 스텝으로!
      } 
      else if (currentStep === 1) {
        updatedData.startTime = userText; 
        coreResponse = `네, ${userText} 시작으로 맞출게요! ⏰ 오늘 같이 여행할 인원은 몇 명인가요?`;
        nextStep = 2; // 🚀 인원 물어보는 스텝으로!
      }
      else if (currentStep === 2) {
        updatedData.pax = userText; 
        coreResponse = `${userText}이서 가시는군요! 오붓하고 좋겠어요 🥰 오늘 여행의 목적은 무엇인가요? (예: 친구와 힐링, 로맨틱한 데이트, 핫플 탐방 등)`;
        nextStep = 3;
      }
      else if (currentStep === 3) {
        updatedData.purpose = userText; 
        coreResponse = `네, 목적 접수 완료! 🎯 마지막으로 원하시는 구체적인 방향이나 분위기가 있다면 길~게 자유롭게 적어주세요! (예: 조용한 카페가 있었으면 좋겠어, 무조건 사진이 잘 나오는 곳!)`;
        nextStep = 4;
      }
      else if (currentStep === 4) {
        updatedData.vibe = userText; 
        coreResponse = `완벽해요! ${userNick}님의 취향을 듬뿍 담아 코스 데이터를 분석 중입니다. 잠시만 기다려주세요... ⏳✨`;
        nextStep = 5; // 로딩 중 화면으로 전환!
        
        const fetchAICourse = async () => {
          const savedUser = localStorage.getItem('loggedInUser');
          const currentUserId = savedUser ? JSON.parse(savedUser).userId : null;

          const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
          try {
            const response = await fetch(`${API_BASE_URL}/generate-course`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...updatedData, userId: currentUserId }),
            });
            const result = await response.json();

            if (response.ok && result.success) {
              setSearchCourseId(result.searchCourseId);
              setMessages((prev) => [
                ...prev, 
                { id: Date.now() + 2, sender: 'core', courseData: result.course }
              ]);
            } else {
              setMessages((prev) => [
                ...prev, 
                { id: Date.now() + 2, sender: 'core', text: '죄송합니다. 코스를 생성하는 중에 문제가 발생했습니다. 다시 시도해 주세요. 😢' }
              ]);
            }
          } catch (error) {
            console.error('AI 호출 에러 ㅠㅠ:', error);
            setMessages((prev) => [
              ...prev, 
              { id: Date.now() + 2, sender: 'core', text: '서버와의 연결이 원활하지 않습니다.' }
            ]);
          } finally {
            // 🚀 결과창 스텝 번호가 5에서 6으로 밀려났어용!
            setCurrentStep(6); 
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
    if (savedCourseId) {
      alert("이미 마이페이지 서랍에 소중하게 보관해 뒀어요!");
      return; 
    }
    const currentCourseData = messages[messages.length - 1]?.courseData;
    if (!currentCourseData || currentCourseData.length === 0) {
      alert("저장할 코스가 없어요 ㅠㅠ");
      return;
    }

    const savedUser = localStorage.getItem('loggedInUser');
    if (!savedUser) {
      alert("로그인 먼저 해주세요!");
      return;
    }
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
    } catch (error) {
      console.error("저장 에러:", error);
    }
  };

  const handleCopyLink = () => {
    let linkToCopy = '';
    if (savedCourseId) {
      linkToCopy = `https://plamad.xyz?type=saved&seq=${savedCourseId}`;
    } 
    else if (searchCourseId) {
      linkToCopy = `https://plamad.xyz?type=search&seq=${searchCourseId}`;
    } 
    else {
      alert("공유할 코스가 없어요 ㅠㅠ");
      return;
    }

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
    flex: '0 0 260px', 
    backgroundColor: '#f8f9fa', 
    padding: '15px', 
    borderRadius: '20px', 
    boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
    borderLeft: '5px solid #007AFF',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column'
  };

  const inputStyle = { padding: '12px', border: '1px solid #ddd', borderRadius: '20px', fontSize: '14px', width: 'calc(100% - 70px)', boxSizing: 'border-box' as const, marginRight: '10px' };
  const coreMsgStyle = { 
    backgroundColor: '#f0f2f5', color: '#333', padding: '10px 15px', borderRadius: '15px 15px 15px 5px', 
    maxWidth: '80%', alignSelf: 'flex-start', fontSize: '14px', marginBottom: '10px', lineHeight: '1.5',
    whiteSpace: 'pre-wrap' 
  };
  const userMsgStyle = { backgroundColor: '#007AFF', color: 'white', padding: '10px 15px', borderRadius: '15px 15px 5px 15px', maxWidth: '80%', alignSelf: 'flex-end', fontSize: '14px', marginBottom: '10px', lineHeight: '1.5' };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '30px', paddingBottom: '50px' }}>
      <div style={{ 
        padding: '30px', 
        backgroundColor: 'white', 
        borderRadius: '25px', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)', 
        width: '90%', 
        maxWidth: '700px', 
        height: '80vh', 
        minHeight: '600px', 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden' 
      }}>
        <h3 style={{ textAlign: 'center', color: '#007AFF', marginBottom: '20px' }}>NoPlan AI 가이드 🤖</h3>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: '15px' }}>
          
          {/* 🚀 이제 결과창 스텝은 6이에용! */}
          {currentStep === 6 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ height: '250px', flexShrink: 0, border: '1px solid #eee', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '5px' }}>
                <MapBoard 
                  courseList={messages[messages.length - 1]?.courseData || []} 
                  userLocation={travelData.location} 
                />
              </div>

              <div style={{ display: 'flex', overflowX: 'auto', gap: '15px', padding: '10px 5px', alignItems: 'stretch' }}>
                {messages[messages.length - 1]?.courseData?.map((item, index) => (
                  <div 
                    key={index} 
                    onClick={() => {
                        const keyword = item.searchKeyword || item.title;
                        const detailData = MOCK_STORE_DETAILS[keyword] || {
                          name: keyword,
                          hanjul: '노플랜 추천 핫플레이스!',
                          description: '아직 상세 정보를 불러오기 전이라 임시 화면을 보여드리고 있어요! 나중에 찐 데이터로 꽉꽉 채워질 거예요!',
                          imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
                          recommendedMenu: { name: '노플랜 시그니처 메뉴', price: 15000 },
                          hours: '10:00 ~ 22:00',
                          parking: true,
                          ratings: { combined: 4.5, stars: 4 },
                          reviewLinks: {} 
                        };
                        setSelectedStoreDetail(detailData); 
                    }}
                    style={carouselCardStyle}
                  >
                    <p style={{ color: '#888', fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0' }}>⏰ {item.time}</p>
                    <p style={{ color: '#333', fontSize: '15px', fontWeight: 'bold', margin: '0 0 5px 0', whiteSpace: 'normal', wordBreak: 'keep-all' }}>✨ {item.title}</p>
                    <p style={{ color: '#007AFF', fontSize: '14px', fontWeight: 'bold', margin: '0 0 8px 0', whiteSpace: 'normal', wordBreak: 'keep-all' }}>📍 {item.searchKeyword || item.title}</p>
                    <p style={{ color: '#555', fontSize: '13px', lineHeight: '1.5', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', whiteSpace: 'normal' }}>
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div id="messages" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingRight: '10px' }}>
              {messages.map((msg) => {
                if (msg.text) { return ( <div key={msg.id} style={msg.sender === 'core' ? coreMsgStyle : userMsgStyle}>{msg.text}</div> ); }
                if (msg.courseData && currentStep !== 6) {
                    return (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px', width: '100%' }}>
                            <p style={{ color: '#007AFF', fontWeight: 'bold', margin: '0 0 5px 10px', fontSize: '15px' }}>✨ 코아의 맞춤형 추천 코스 도착!</p>
                            {msg.courseData.map((item, index) => ( <div key={index} onClick={() => {}} style={{}}><p style={{}}>✨ {item.title}</p><p style={{}}>📍 {item.searchKeyword || item.title}</p></div> ))}
                        </div>
                    );
                }
                return null;
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        <div style={{ borderTop: '1px solid #eee', paddingTop: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          
          {/* 🚀 스텝 번호들이 하나씩 밀렸어용! 0, 1, 3, 4일 때 글자 입력창이 보여용! */}
          {(currentStep === 0 || currentStep === 1 || currentStep === 3 || currentStep === 4) && ( 
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  {/* 📍 0단계: 내 위치로 찾기 버튼 */}
                  {currentStep === 0 && ( <button onClick={handleMyLocation} style={{ marginBottom: '10px', padding: '12px', backgroundColor: '#e8f0fe', color: '#007AFF', border: '1px solid #007AFF', borderRadius: '15px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}> 📍 내 현재 위치로 핫플 찾기 </button> )}
                  
                  {/* ⏰ 1단계: 지금부터 시작할래요 버튼 */}
                  {currentStep === 1 && ( <button onClick={() => handleSendMessage('지금부터')} style={{ marginBottom: '10px', padding: '12px', backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', borderRadius: '15px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}> ⏰ 지금부터 당장 시작할래요! </button> )}

                  <div style={{ display: 'flex', width: '100%' }}>
                      <input type="text" placeholder={currentStep === 4 ? "원하는 분위기를 자유롭게 적어주세요!" : "입력해 주세요."} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)} style={inputStyle} /> 
                      <button onClick={() => handleSendMessage(inputValue)} style={{ padding: '12px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>전송</button> 
                  </div>
              </div>
          )}

          {/* 🚀 인원수 고르기는 이제 2단계예용! */}
          {currentStep === 2 && ( <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}> {[1, 2, 3, 4, 5].map((num) => ( <button key={num} onClick={() => handleSendMessage(`${num}명`)} style={{ flex: 1, padding: '10px', backgroundColor: 'white', border: '2px solid #007AFF', color: '#007AFF', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}> {num}명 </button> ))} </div> )}
          
          {/* 🚀 로딩은 5단계! */}
          {currentStep === 5 && ( <p style={{ width: '100%', textAlign: 'center', color: '#888', fontSize: '14px', margin: 0 }}> 코아가 열심히 코스를 짜고 있어요... 🚀 </p> )}

          {/* 🚀 결과 버튼 구역은 6단계! */}
          {currentStep === 6 && (
            <div style={{ width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <button onClick={() => { setMessages([{ id: Date.now(), sender: 'core', text: '다시 새로운 여행을 떠나볼까요? 현재 어디에 계신가요?' }]); setCurrentStep(0); setSavedCourseId(null); setSearchCourseId(null); setTravelData({ location: '', startTime: '', pax: '', purpose: '', vibe: '' }); setSelectedStoreDetail(null); 
              }} style={{ padding: '10px 20px', backgroundColor: 'rgb(240, 242, 245)', color: 'rgb(51, 51, 51)', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}> 처음부터 다시 짜기 🔄 </button>

              {messages[messages.length - 1]?.courseData && messages[messages.length - 1].courseData!.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px', justifyContent: 'center', width: '100%' }}>
                  <button onClick={handleSaveCourse} style={{ flex: 1, padding: '12px 20px', backgroundColor: '#ff3b30', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>💖 코스 찜하기</button>
                  <button onClick={handleCopyLink} style={{ flex: 1, padding: '12px 20px', backgroundColor: '#fedc3e', color: '#391b1b', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>💬 링크 복사</button> 
                </div>
              )}
            </div>
          )}
        </div>
      </div> 

      <StoreDetailModal detail={selectedStoreDetail} onClose={() => setSelectedStoreDetail(null)} />

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
export default Chatbot;