// Chatbot.tsx
import { useState } from 'react';
import MapBoard from './MapBoard';

declare global {
  interface Window {
    Kakao: any;
  }
}

interface CourseItem {
  time: string;
  title: string;
  description: string;
  searchKeyword?: string; // 🚀 코아가 추가한 마법의 비밀 열쇠!
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

function Chatbot({userNick }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'core', text: `안녕하세요, ${userNick}님! 여행 계획을 함께 세워드릴 AI 가이드 코아입니다. 😊` },
    { id: 2, sender: 'core', text: '먼저, 현재 어디에 계신가요? (예: 인사동 쌈지길, 해운대 등)' },
  ]);

  const [currentStep, setCurrentStep] = useState(0); 
  const [inputValue, setInputValue] = useState(''); 
  const [showMap, setShowMap] = useState(false);  
  const [savedCourseId, setSavedCourseId] = useState<number | null>(null);
  // 🚀 코아의 핵심 마법 상자! 유저의 4가지 대답을 여기에 꽉꽉 모을 거예용!
  const [travelData, setTravelData] = useState({
    location: '',
    pax: '',
    purpose: '',
    vibe: ''
  });

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
          const API_BASE_URL = import.meta.env.VITE_APP_API_URL;
          try {
            const response = await fetch(`${API_BASE_URL}/generate-course`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedData), // 🎒 여행 보따리 투척!
            });
            const result = await response.json();

            if (response.ok && result.success) {
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
    const currentCourseData = messages[messages.length - 1]?.courseData;
    if (!currentCourseData || currentCourseData.length === 0) {
      alert("저장할 코스가 없어용 ㅠㅠ");
      return;
    }

    const savedUser = localStorage.getItem('loggedInUser');
    if (!savedUser) {
      alert("로그인 먼저 해주세용!");
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
        alert("💖 마이페이지 '나만의 여행 서랍'에 쏙! 저장되었어용!");
        setSavedCourseId(result.courseId);
      }
    } catch (error) {
      console.error("저장 에러:", error);
    }
  };

 // 💌 카카오톡 공유 마법 주문!
  const shareKakao = () => {
    if (!savedCourseId) {
      alert("카톡으로 공유하려면 먼저 '💖 코스 찜하기'를 눌러서 코스를 저장해주세요!");
      return;
    }
    // 🌸 코아의 해결책: 최신 코스 데이터 스윽 꺼내기!
    const currentCourseData = messages[messages.length - 1]?.courseData;
    if (!currentCourseData || currentCourseData.length === 0) {
      alert("공유할 코스가 없어용 ㅠㅠ");
      return;
    }

    if (window.Kakao) {
      const Kakao = window.Kakao;
      // 🚀 오빠의 카카오 JavaScript 키!
      if (!Kakao.isInitialized()) {
        Kakao.init('0677eafb268f625e8698633d20f2ce4c'); 
      }
      const courseUrl = `https://plamad.xyz?shared_seq=${savedCourseId}`;
      Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: '노플랜의 완벽한 맞춤형 여행 코스! 🗺️',
          description: `첫 번째 목적지는 '${currentCourseData[0]?.title}'! 우리 이번 주말에 여기 갈래?!`,
          imageUrl: 'https://plamad.xyz/images/Logo.png', 
          link: { 
            mobileWebUrl: courseUrl, // 🚀 비밀 열쇠가 숨겨진 주소!
            webUrl: courseUrl // 🚀 비밀 열쇠가 숨겨진 주소!
          },
        },
        buttons: [
          { title: '코스 자세히 보기', link: { mobileWebUrl: courseUrl, webUrl: courseUrl } },
        ],
      });
    }
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
      <div style={{ padding: '30px', backgroundColor: 'white', borderRadius: '25px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '400px', height: '600px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ textAlign: 'center', color: '#007AFF', marginBottom: '20px' }}>NoPlan AI 가이드 🤖</h3>

        {/* 대화 창 구역 */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingRight: '10px', marginBottom: '20px' }}>
          {messages.map((msg) => {
            
            // 🌸 일반적인 텍스트 메시지일 때!
            if (msg.text) {
              return (
                <div key={msg.id} style={msg.sender === 'core' ? coreMsgStyle : userMsgStyle}>
                  {msg.text}
                </div>
              );
            }

            // 🌸 AI가 짜준 코스 배열(courseData)이 들어왔을 때! (예쁜 카드 변신!)
            if (msg.courseData) {
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px', width: '100%' }}>
                  <p style={{ color: '#007AFF', fontWeight: 'bold', margin: '0 0 5px 10px', fontSize: '15px' }}>
                    ✨ 코아의 맞춤형 추천 코스 도착!
                  </p>
                  
                  {msg.courseData.map((item, index) => (
                    <div key={index} style={{ backgroundColor: '#f0f2f5', padding: '15px', borderRadius: '15px', borderLeft: '5px solid #007AFF', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                      <p style={{ color: '#888', fontSize: '12px', fontWeight: 'bold', margin: '0 0 5px 0' }}>⏰ {item.time}</p>
                      <p style={{ color: '#333', fontSize: '16px', fontWeight: 'bold', margin: '0 0 10px 0' }}>📍 {item.title}</p>
                      <p style={{ color: '#555', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{item.description}</p>
                    </div>
                  ))}
                </div>
              );
            }

            return null;
          })}
        </div>

        <div style={{ borderTop: '1px solid #eee', paddingTop: '15px', display: 'flex', alignItems: 'center' }}>
          
          {/* 🗺️ 0단계, 2단계, 3단계: 글자 입력창 (재사용!) */}
          {(currentStep === 0 || currentStep === 2 || currentStep === 3) && (
            <>
              <input 
                type="text" 
                placeholder={currentStep === 3 ? "원하는 분위기를 자유롭게 적어주세요!" : "입력해 주세요."} 
                value={inputValue} 
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                style={inputStyle} 
              />
              <button onClick={() => handleSendMessage(inputValue)} style={{ padding: '12px', backgroundColor: '#007AFF', color: 'white', border: 'none', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>
                전송
              </button>
            </>
          )}

          {/* 👫 1단계: 인원 선택 버튼 */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}>
              {[2, 3, 4, 5].map((num) => (
                <button 
                  key={num} 
                  onClick={() => handleSendMessage(`${num}명`)}
                  style={{ flex: 1, padding: '10px', backgroundColor: 'white', border: '2px solid #007AFF', color: '#007AFF', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {num}명
                </button>
              ))}
            </div>
          )}

          {/* ⏳ 4단계: AI 로딩 중 */}
          {currentStep === 4 && (
            <p style={{ width: '100%', textAlign: 'center', color: '#888', fontSize: '14px', margin: 0 }}>
              코아가 열심히 코스를 짜고 있어요... 🚀
            </p>
          )}

          {/* 🎉 5단계: 결과 출력 완료! */}
          {currentStep === 5 && (
            <div style={{ width: '100%', textAlign: 'center', marginTop: '10px' }}>
              
              {/* 지도가 안 켜져 있을 때만 예쁜 파란 버튼 보여주기! */}
              {!showMap ? (
                <button 
                  onClick={() => setShowMap(true)}
                  style={{ padding: '12px 20px', backgroundColor: 'rgb(0, 122, 255)', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px', width: '100%' }}
                >
                  추천 코스 지도로 한눈에 보기 🗺️
                </button>
              ) : (
                /* 🚀 버튼을 누르면 지도가 짠! 하고 등장해용! (AI가 준 마지막 메시지의 코스 배열을 통째로 넘김!) */
                <MapBoard courseList={messages[messages.length - 1]?.courseData || []} />
              )}

              <button 
                onClick={() => {
                  setMessages([{ id: Date.now(), sender: 'core', text: '다시 새로운 여행을 떠나볼까요? 현재 어디에 계신가요?' }]);
                  setCurrentStep(0);
                  setSavedCourseId(null);
                  setTravelData({ location: '', pax: '', purpose: '', vibe: '' });
                  setShowMap(false); // 다시 할 땐 지도 스위치 끄기!
                }}
                style={{ padding: '10px 20px', backgroundColor: 'rgb(240, 242, 245)', color: 'rgb(51, 51, 51)', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', width: '100%', marginTop: '5px' }}
              >
                처음부터 다시 짜기 🔄
              </button>

             {messages[messages.length - 1]?.courseData && messages[messages.length - 1].courseData!.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
                  <button onClick={handleSaveCourse} style={{ flex: 1, padding: '12px 20px', backgroundColor: '#ff3b30', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                    💖 코스 찜하기
                  </button>
                  <button onClick={shareKakao} style={{ flex: 1, padding: '12px 20px', backgroundColor: '#FEE500', color: '#391B1B', border: 'none', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                    💬 카카오톡 공유
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Chatbot;