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
  hanjul: string; // 한줄평
  description: string; // 가게 설명
  imageUrl: string;
  recommendedMenu: { name: string; price: number }; // 추천메뉴, 가격
  hours: string; // 영업시간
  parking: boolean; // 주차여부
  ratings: { combined: number; stars: number }; // 3사 종합 평점
  reviewLinks: { naver?: string; google?: string; kakao?: string }; // 리뷰 사이트 연결
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
  text?: string; // 🚀 글자일 수도 있고
  courseData?: CourseItem[]; // 🚀 코스 배열일 수도 있게 옵션(?)을 달아줘용!
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
  //const [showMap, setShowMap] = useState(false);  
  const [savedCourseId, setSavedCourseId] = useState<number | null>(null);
  const [searchCourseId, setSearchCourseId] = useState<number | null>(null);
  const [selectedStoreDetail, setSelectedStoreDetail] = useState<StoreDetail | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // 🚀 코아의 핵심 마법 상자! 유저의 4가지 대답을 여기에 꽉꽉 모을 거예용!
  const [travelData, setTravelData] = useState({
    location: '',
    pax: '',
    purpose: '',
    vibe: ''
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  },[messages]);

  const handleSendMessage = (userText: string) => {
    if (!userText.trim()) return; 

    // 1. 유저가 한 말을 채팅창에 띄우기
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text: userText }]);
    setInputValue(''); 

    // 2. 코아가 1초 뒤에 찰떡같이 대답하기!
    setTimeout(() => {
      let coreResponse = '';
      let nextStep = currentStep;
      let updatedData = { ...travelData }; // 보따리 복사!

      // 🌸 오빠의 기획대로 스텝 바이 스텝!
      if (currentStep === 0) {
        updatedData.location = userText; // 위치 저장!
        coreResponse = `아하, ${userText}에 계시는군요! 멋진 곳이죠! ✨ 그럼 오늘 같이 여행할 인원은 몇 명인가요?`;
        nextStep = 1;
      } 
      else if (currentStep === 1) {
        updatedData.pax = userText; // 인원 저장!
        coreResponse = `${userText}이서 가시는군요! 오붓하고 좋겠어요 🥰 오늘 여행의 목적은 무엇인가요? (예: 친구와 힐링, 로맨틱한 데이트, 핫플 탐방 등)`;
        nextStep = 2;
      }
      else if (currentStep === 2) {
        updatedData.purpose = userText; // 목적 저장!
        coreResponse = `네, 목적 접수 완료! 🎯 마지막으로 원하시는 구체적인 방향이나 분위기가 있다면 길~게 자유롭게 적어주세요! (예: 조용한 카페가 있었으면 좋겠어, 무조건 사진이 잘 나오는 곳!)`;
        nextStep = 3;
      }
      else if (currentStep === 3) {
        updatedData.vibe = userText; 
        coreResponse = `완벽해요! ${userNick}님의 취향을 듬뿍 담아 코스 데이터를 분석 중입니다. 잠시만 기다려주세요... ⏳✨`;
        nextStep = 4; // 로딩 중 화면으로 전환!
        
        // 🚀 대망의 AI 호출 작전 시작! (비동기로 백엔드에 슝!)
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
              // 대성공! AI가 짠 코스를 코아의 말투로 채팅창에 딱! 띄워용!
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
            // 답변이 오면 다시 처음부터 물어볼 수 있게 스텝을 바꿀 수도 있고, 
            // 일단은 결과를 보여준 채로(step 5) 놔둘게용!
            setCurrentStep(5); 
          }
        };

        // 함수 실행!
        fetchAICourse();
      }

      setTravelData(updatedData); 
      
      if (coreResponse) {
        setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'core', text: coreResponse }]);
        setCurrentStep(nextStep);
      }
    }, 800); 
  };

// 💖 찜하기 마법 주문!
  const handleSaveCourse = async () => {
    // 🌸 코아의 해결책: 최신 코스 데이터 스윽 꺼내기!
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
      //setView('login'); // App.tsx에서 view를 바꾸게 해야하지만, 일단 alert로!
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
          // 🚀 꺼내온 데이터로 예쁜 제목 만들기!
          title: `${currentCourseData[0]?.title} 외 ${currentCourseData.length - 1}곳`, 
          courseData: currentCourseData // 🚀 꺼내온 데이터 통째로 저장!
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

 // 💌 카카오톡 공유 마법 주문!
  // const shareKakao = () => {
  //   if (!savedCourseId) {
  //     alert("카톡으로 공유하려면 먼저 '💖 코스 찜하기'를 눌러서 코스를 저장해주세요!");
  //     return;
  //   }
  //   // 🌸 코아의 해결책: 최신 코스 데이터 스윽 꺼내기!
  //   const currentCourseData = messages[messages.length - 1]?.courseData;
  //   if (!currentCourseData || currentCourseData.length === 0) {
  //     alert("공유할 코스가 없어용 ㅠㅠ");
  //     return;
  //   }

  //   if (window.Kakao) {
  //     const Kakao = window.Kakao;
  //     // 🚀 오빠의 카카오 JavaScript 키!
  //     if (!Kakao.isInitialized()) {
  //       Kakao.init('0677eafb268f625e8698633d20f2ce4c'); 
  //     }
  //     const courseUrl = `https://plamad.xyz?shared_seq=${savedCourseId}`;
  //     Kakao.Share.sendDefault({
  //       objectType: 'feed',
  //       content: {
  //         title: '노플랜의 완벽한 맞춤형 여행 코스! 🗺️',
  //         description: `첫 번째 목적지는 '${currentCourseData[0]?.title}'! 우리 이번 주말에 여기 갈래?!`,
  //         imageUrl: 'https://plamad.xyz/images/Logo.png', 
  //         link: { 
  //           mobileWebUrl: courseUrl, // 🚀 비밀 열쇠가 숨겨진 주소!
  //           webUrl: courseUrl // 🚀 비밀 열쇠가 숨겨진 주소!
  //         },
  //       },
  //       buttons: [
  //         { title: '코스 자세히 보기', link: { mobileWebUrl: courseUrl, webUrl: courseUrl } },
  //       ],
  //     });
  //   }
  // };

  const handleCopyLink = () => {
    let linkToCopy = '';

    // 1. 찜한 코스가 있다면 찜 링크!
    if (savedCourseId) {
      linkToCopy = `https://plamad.xyz?type=saved&seq=${savedCourseId}`;
    } 
    // 2. 찜은 안 했지만 방금 검색한 코스가 있다면 검색 링크!
    else if (searchCourseId) {
      linkToCopy = `https://plamad.xyz?type=search&seq=${searchCourseId}`;
    } 
    else {
      alert("공유할 코스가 없어요 ㅠㅠ");
      return;
    }

    // 🚀 클립보드에 마법처럼 복사하기!
    navigator.clipboard.writeText(linkToCopy).then(() => {
      alert("💖 링크가 복사되었어요! 친구에게 붙여넣기 해보세요!");
    });
  };

  // 🚀 코아의 특급 마법! 내 위치 찾아서 챗봇한테 바로 전송하기!
  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      alert("앗! 이 브라우저에서는 위치 확인을 지원하지 않아요 ㅠㅠ");
      return;
    }

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'core', text: "위치를 위성으로 찾고 있어요! 조금만 기다려주세요... 🛰️✨" }
    ]);

    // 오빠의 GPS 위치를 찾아라!
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
          const geocoder = new kakao.maps.services.Geocoder();
          geocoder.coord2RegionCode(lng, lat, (result: any, status: any) => {
            if (status === kakao.maps.services.Status.OK) {
              const regionName = result.find((r: any) => r.region_type === 'H')?.address_name || result[0].address_name;
              
              // 🚀 2단계: 주소 찾으면 그때 동네 이름을 슝!
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
    flex: '0 0 260px', // 🚨 핵심 마법! 카드 넓이를 260px로 완전 고정! 절대 안 늘어나용!
    backgroundColor: '#f8f9fa', 
    padding: '15px', 
    borderRadius: '20px', 
    boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
    borderLeft: '5px solid #007AFF',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column'
  };

  // 스타일 생략 (아까랑 똑같이 유지해주세용!)
  const inputStyle = { padding: '12px', border: '1px solid #ddd', borderRadius: '20px', fontSize: '14px', width: 'calc(100% - 70px)', boxSizing: 'border-box' as const, marginRight: '10px' };
  // 🌸 코아의 센스! AI가 줄바꿈(\n) 해준 걸 그대로 예쁘게 보여주려면 'pre-wrap'이 꼭 필요해용!
  const coreMsgStyle = { 
    backgroundColor: '#f0f2f5', color: '#333', padding: '10px 15px', borderRadius: '15px 15px 15px 5px', 
    maxWidth: '80%', alignSelf: 'flex-start', fontSize: '14px', marginBottom: '10px', lineHeight: '1.5',
    whiteSpace: 'pre-wrap' // 🚀 바로 요 녀석이에용!
  };
  const userMsgStyle = { backgroundColor: '#007AFF', color: 'white', padding: '10px 15px', borderRadius: '15px 15px 5px 15px', maxWidth: '80%', alignSelf: 'flex-end', fontSize: '14px', marginBottom: '10px', lineHeight: '1.5' };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '30px', paddingBottom: '50px' }}>
      
      {/* 🚀 메인 상자 */}
      <div style={{ 
        padding: '30px', 
        backgroundColor: 'white', 
        borderRadius: '25px', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)', 
        
        // 🌸 넓이 마법: 스마트폰에선 화면의 90%만 차지하고, PC에선 최대 700px까지만 넓어져라 얍!
        width: '90%', 
        maxWidth: '700px', 
        
        // 🌸 높이 마법: 화면 높이의 80%를 차지하되, 너무 작아지면 600px은 유지해라 얍!
        height: '80vh', 
        minHeight: '600px', 
        
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden' 
      }}>
        <h3 style={{ textAlign: 'center', color: '#007AFF', marginBottom: '20px' }}>NoPlan AI 가이드 🤖</h3>

        {/* --- 🌸 VIEW AREA (대화창/결과창 통합!) --- */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: '15px' }}>
          
          {/* 🚀 Conditional Rendering: 코스 생성 완료(Step 5) & 지도 보기 모드일 때만 변신! */}
          {currentStep === 5 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              
              {/* 🗺️ 1. 지도 영역 (높이 250px 고정, 안 찌그러지게 flexShrink: 0) */}
              <div style={{ height: '250px', flexShrink: 0, border: '1px solid #eee', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '5px' }}>
                <MapBoard 
                  courseList={messages[messages.length - 1]?.courseData || []} 
                  
                  // 🚀 코아의 꿀팁! 오빠가 입력한 동네 이름을 지도 요원한테 전달!
                  userLocation={travelData.location} 
                />
              </div>

              {/* 🚀 2. 예쁜 캐러셀 카드 구역!! (가로 스크롤) */}
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
                    
                    {/* 🚨 글자가 길어도 카드 밖으로 안 나가게 줄바꿈 마법(wordBreak) 추가! */}
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
            // ❌ 기존 대화 창 구역 (Results View가 아닐 때 보여줌)
            <div id="messages" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingRight: '10px' }}>
              {messages.map((msg) => {
                if (msg.text) { return ( <div key={msg.id} style={msg.sender === 'core' ? coreMsgStyle : userMsgStyle}>{msg.text}</div> ); }
                // standard courseData rendering ( Results View에선 가로 캐러셀로 보여주니까 지워도 되지만, 
                // 혹시 모르니 Step 5가 아니거나 지도 안 볼 때만 보여주게 안전장치! )
                if (msg.courseData && currentStep !== 5) {
                    return (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px', width: '100%' }}>
                            <p style={{ color: '#007AFF', fontWeight: 'bold', margin: '0 0 5px 10px', fontSize: '15px' }}>✨ 코아의 맞춤형 추천 코스 도착!</p>
                            {msg.courseData.map((item, index) => ( <div key={index} onClick={() => { /* 팝업창 로직 */ }} style={{ /* 기존 standard card style */ }}><p style={{ /* 기존 styles */ }}>✨ {item.title}</p><p style={{ /* 기존 styles */ }}>📍 {item.searchKeyword || item.title}</p></div> ))}
                        </div>
                    );
                }
                return null;
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* --- 🌸 FOOTER AREA (Buttons 구역) --- */}
        <div style={{ borderTop: '1px solid #eee', paddingTop: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          
          {/* Steps 0-3 Inputs logic (기존 그대로 유지) */}
          {(currentStep === 0 || currentStep === 2 || currentStep === 3) && ( 
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  {/* 내 위치로 찾기 버튼 (처음 질문 0단계에서만 보여용!) */}
                  {currentStep === 0 && ( <button onClick={handleMyLocation} style={{ marginBottom: '10px', padding: '12px', backgroundColor: '#e8f0fe', color: '#007AFF', border: '1px solid #007AFF', borderRadius: '15px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}> 📍 내 현재 위치로 핫플 찾기 </button> )}
                  <div style={{ display: 'flex', width: '100%' }}>
                      <input type="text" placeholder={currentStep === 3 ? "원하는 분위기를 자유롭게 적어주세요!" : "입력해 주세요."} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)} style={inputStyle} /> 
                      <button onClick={() => handleSendMessage(inputValue)} style={{ padding: '12px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>전송</button> 
                  </div>
              </div>
          )}

          {currentStep === 1 && ( <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}> {[1, 2, 3, 4, 5].map((num) => ( <button key={num} onClick={() => handleSendMessage(`${num}명`)} style={{ flex: 1, padding: '10px', backgroundColor: 'white', border: '2px solid #007AFF', color: '#007AFF', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}> {num}명 </button> ))} </div> )}
          {currentStep === 4 && ( <p style={{ width: '100%', textAlign: 'center', color: '#888', fontSize: '14px', margin: 0 }}> 코아가 열심히 코스를 짜고 있어요... 🚀 </p> )}

          {/* Step 5 결과 버튼 구역 (지도는 Results View에서 고정으로 보여주니까, 지도 보기 버튼은 없애고 나머지만!) */}
          {currentStep === 5 && (
            <div style={{ width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <button onClick={() => { setMessages([{ id: Date.now(), sender: 'core', text: '다시 새로운 여행을 떠나볼까요? 현재 어디에 계신가요?' }]); setCurrentStep(0); setSavedCourseId(null); setSearchCourseId(null); setTravelData({ location: '', pax: '', purpose: '', vibe: '' }); setSelectedStoreDetail(null); // 처음부터 다시 짤 땐 상세 정보 상자도 비워용!
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

      </div> {/* Chatbot 메인 박스 끝 */}

      {/* 가게 상세 정보 팝업창 등장!! */}
      <StoreDetailModal detail={selectedStoreDetail} onClose={() => setSelectedStoreDetail(null)} />

    </div>
  );
}

const StoreDetailModal = ({ detail, onClose }: { detail: StoreDetail | null; onClose: () => void }) => {
  if (!detail) return null; // 열려있지 않으면 아무것도 안 그려용!

  // 리뷰 버튼 스타일 (Naver, Google, Kakao 색깔)
  const reviewBtnStyle = (color: string) => ({ width: '50px', height: '50px', borderRadius: '50%', border: `3px solid ${color}`, backgroundColor: 'white', color: color, fontWeight: 'bold', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', textAlign: 'center' as const, flexShrink: 0 });

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '25px', width: '100%', maxWidth: '360px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        
        {/* 1. 헤더: (N) 마크 + 가게명 ( image_6.png 상단) */}
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', position: 'relative' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#333', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail.name}</h2>
          
          {/* 노플랜 인증마크(N) ( image_6.png 우측 상단) */}
          <div style={{ display: 'flex', alignItems: 'center', position: 'absolute', right: '45px', top: '15px' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #007AFF', color: '#007AFF', fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>N</div>
            <p style={{ margin: 0, marginLeft: '5px', fontSize: '11px', color: '#007AFF', fontWeight: 'bold' }}>인증마크</p>
          </div>

          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✖</button>
        </div>

        {/* 2. 메인: 이미지 & 한줄평 ( image_6.png 중간 flex 레이아웃) */}
        <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            {/* 이미지 */}
            <img src={detail.imageUrl} alt={detail.name} style={{ width: '120px', height: '120px', borderRadius: '15px', objectFit: 'cover', flexShrink: 0 }} />
            {/* 한줄평 */}
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#333' }}>한줄평</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#555', lineHeight: '1.6', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical' as const }}>{detail.hanjul}</p>
            </div>
          </div>

          {/* 가게 설명 */}
          <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.6', marginBottom: '20px', marginTop: 0 }}>{detail.description}</p>

          {/* 3. 정보 항목들 ( 추천 메뉴, 가격, 영업시간, 주차 여부 - image_5.png 기반) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#333', borderTop: '1px solid #eee', paddingTop: '15px', marginBottom: '20px' }}>
            <p style={{ margin: 0 }}><strong>추천 메뉴:</strong> {detail.recommendedMenu.name} ({detail.recommendedMenu.price}원)</p>
            <p style={{ margin: 0 }}><strong>영업 시간:</strong> {detail.hours}</p>
            <p style={{ margin: 0 }}><strong>주차 여부:</strong> {detail.parking ? '가능 🚗' : '불가능 ✖'}</p>
          </div>

          {/* 4. 푸터: 리뷰 버튼 + 종합 평점 ( image_6.png 하단) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '15px', marginTop: 'auto' }}>
            {/* 리뷰 버튼 3사 ( 누르면 사이트로 접속 - Naver: 초록, Google: 빨강, Kakao: 노랑) */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#666', marginRight: '5px' }}>리뷰:</p>
                <button onClick={() => detail.reviewLinks.naver && window.open(detail.reviewLinks.naver)} style={reviewBtnStyle('#2DB400')}>네이버</button>
                <button onClick={() => detail.reviewLinks.google && window.open(detail.reviewLinks.google)} style={reviewBtnStyle('#ea4335')}>구글</button>
                <button onClick={() => detail.reviewLinks.kakao && window.open(detail.reviewLinks.kakao)} style={reviewBtnStyle('#FEE500')}>카카오</button>
            </div>
            {/* ⭐ 총점 3사 종합평점 */}
            <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>3사 종합평점</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    <p style={{ margin: 0, fontSize: '18px', color: '#f39c12' }}>{'⭐'.repeat(detail.ratings.stars)}</p>
                    <p style={{ margin: 0, fontSize: '18px', color: '#333', fontWeight: 'bold' }}>{detail.ratings.combined}</p>
                </div>
            </div>
          </div>
        </div>

        {/* 확인 버튼 */}
        <div style={{ padding: '15px', borderTop: '1px solid #eee', marginTop: 'auto' }}>
          <button onClick={onClose} style={{ width: '100%', padding: '14px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>확인</button>
        </div>

      </div>
    </div>
  );
};
export default Chatbot;