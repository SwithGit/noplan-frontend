import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chip } from '../../components/ui/Chip';
import { AppTopBar } from '../../components/ui/AppTopBar';
import MapBoard from '../../components/MapBoard';
import { NopiBubble } from '../../components/ui/NopiBubble';
import { PlaceVisual } from '../../components/ui/PlaceVisual';
import companionFamilyImage from '../../assets/nopi/가족.png';
import companionCoworkerImage from '../../assets/nopi/동료.png';
import companionCoupleImage from '../../assets/nopi/연인.png';
import companionFriendImage from '../../assets/nopi/친구.png';
import nopiImage from '../../assets/nopi/nopi.png';
import { saveCourse } from '../../api/courseApi';
import { usePlanner } from './PlannerContext';

const timeOptions = ['지금', '오늘 저녁', '오늘 밤', '내일', '이번 주말'];
const peopleOptions = ['혼자', '두명', '3-4명', '5명 이상'];
const companionOptions = ['친구', '연인', '가족', '동료'];
const placeOptions = ['맛집', '카페/디저트', '놀거리', '문화/전시', '산책/구경', '술/야간'];
const placeDetailOptions: Record<string, string[]> = {
  맛집: ['한식', '일식', '중식', '양식', '고기', '분식', '해산물', '아무거나'],
  '카페/디저트': ['커피', '디저트', '베이커리', '브런치', '아무거나'],
  놀거리: ['방탈출', '보드게임', '볼링', '노래방', '오락실', '공방/체험', '스포츠', '아무거나'],
  '문화/전시': ['전시', '영화', '공연', '팝업', '미술관/박물관', '아무거나'],
  '산책/구경': ['산책', '공원', '야경', '쇼핑몰', '시장/상권', '아무거나'],
  '술/야간': ['포차', '펍', '와인/칵테일', '이자카야', '아무거나'],
};
const durationOptions = ['2시간', '4시간', '저녁까지', '밤까지'];
const tuningOptions = ['도보 짧게', '대기 적게', '사진 예쁜 곳', '조용한 곳', '비 안 맞게', '2시간 안에'];
const companionImages: Record<string, string> = {
  가족: companionFamilyImage,
  동료: companionCoworkerImage,
  연인: companionCoupleImage,
  친구: companionFriendImage,
};

type DateTimeSheetMode = 'date' | 'time';
type ConditionEditSection = 'location' | 'time' | 'people' | 'place' | 'duration';
type Meridiem = 'AM' | 'PM';

interface SummaryRow {
  id: ConditionEditSection;
  label: string;
  value: string;
}

const pad2 = (value: number) => String(value).padStart(2, '0');
const hourOptions = Array.from({ length: 12 }, (_, index) => pad2(index + 1));
const minuteOptions = Array.from({ length: 12 }, (_, index) => pad2(index * 5));

const formatDateTimeLabel = (date: Date, period: Meridiem, hour: string, minute: string) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${period} ${hour} : ${minute}`;

const getInitialDateTime = (value?: string) => {
  const parsed = value?.match(/^(\d{4})-(\d{2})-(\d{2})\s+(AM|PM)\s+(\d{2})\s+:\s+(\d{2})$/);

  if (parsed) {
    return {
      date: new Date(Number(parsed[1]), Number(parsed[2]) - 1, Number(parsed[3])),
      period: parsed[4] as Meridiem,
      hour: parsed[5],
      minute: parsed[6],
    };
  }

  const now = new Date();
  const currentHour = now.getHours();

  return {
    date: now,
    period: currentHour >= 12 ? ('PM' as Meridiem) : ('AM' as Meridiem),
    hour: pad2(currentHour % 12 || 12),
    minute: pad2(Math.floor(now.getMinutes() / 5) * 5),
  };
};

const getCalendarCells = (displayMonth: Date) => {
  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
  ];
};

const isSameDate = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

function compactLocationLabel(location: string) {
  if (!location) return '현재 위치';

  const cleaned = location
    .replace(/^서울특별시\s*/, '')
    .replace(/^서울시\s*/, '')
    .replace(/^경기도\s*/, '')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const dong = parts.find((part) => part.endsWith('동'));
  const district = parts.find((part) => /(구|군)$/.test(part));
  const road = parts.find((part) => /(로|길)\d*(가길|길)?$/.test(part));

  if (dong) return dong;
  if (district && road) return `${district} ${road.replace(/^(.+?로)\d.*$/, '$1')}`;

  return cleaned;
}

function displayLocationLabel(condition: { location: string; locationLabel?: string }) {
  return condition.locationLabel || compactLocationLabel(condition.location);
}

function displayConditionValue(value: unknown) {
  const normalized = String(value ?? '').trim();
  return normalized && !/^(null|undefined)$/i.test(normalized) ? normalized : '미정';
}

function companionPhrase(companion: string) {
  if (!companion) return '';
  if (companion === '혼자') return '혼자';
  if (companion === '데이트') return '데이트로';
  return `${companion}랑`;
}

function getMoodSelection(mood: string) {
  const value = String(mood || '').trim();
  const aliases: Record<string, string> = {
    음식점: '맛집',
    카페: '카페/디저트',
    디저트: '카페/디저트',
    운동: '놀거리',
    놀이: '놀거리',
    전시: '문화/전시',
    산책: '산책/구경',
    술집: '술/야간',
  };
  const tokens = value.split(/\s*[,·]\s*/).filter(Boolean);
  const category = placeOptions.find((option) => value === option || tokens.includes(option))
    || aliases[tokens[0]]
    || Object.entries(placeDetailOptions).find(([, details]) => details.includes(value))?.[0]
    || '';
  const details = category ? placeDetailOptions[category] || [] : [];
  const detail = tokens.slice(1).find((token) => details.includes(token))
    || (details.includes(value) ? value : '')
    || (value === '운동' ? '스포츠' : '')
    || (value === '전시' ? '전시' : '')
    || (value === '산책' ? '산책' : '');

  return { category, detail };
}

function composeMood(category: string, detail: string) {
  if (!category) return '';
  return detail && detail !== '아무거나' ? `${category}, ${detail}` : category;
}

function buildHomePrompt({
  companion,
  location,
  locationLabel,
  mood,
  duration,
  time,
}: {
  companion: string;
  location: string;
  locationLabel?: string;
  mood: string;
  duration?: string;
  time: string;
}) {
  const hasSelectedContext = Boolean(time || companion || mood);

  return [
    time,
    hasSelectedContext && location ? `${displayLocationLabel({ location, locationLabel })}에서` : '',
    companionPhrase(companion),
    mood,
    duration,
  ]
    .filter(Boolean)
    .join(' ');
}

export function PlannerHome() {
  const navigate = useNavigate();
  const { condition, detectCurrentLocation, locationStatus, plan, setCondition, startFromText } = usePlanner();
  const [text, setText] = useState(condition.rawText);
  const [locationMessage, setLocationMessage] = useState('');
  const didRequestLocation = useRef(false);

  const submit = async () => {
    if (!text.trim()) {
      setLocationMessage('약속 내용을 입력하거나 빠른 추천을 눌러줘.');
      return;
    }

    await startFromText(text);
    navigate('/planner/condition');
  };

  const useCurrentLocation = async () => {
    try {
      await detectCurrentLocation();
      setLocationMessage('');
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : '현재 위치를 가져오지 못했어요.');
    }
  };

  useEffect(() => {
    setText(condition.rawText);
  }, [condition.rawText]);

  useEffect(() => {
    if (didRequestLocation.current || locationStatus !== 'idle') return;

    didRequestLocation.current = true;
    void useCurrentLocation();
  }, [locationStatus]);

  return (
    <div className="home-screen">
      <header className="home-header">
        <button className="location-pill" type="button" onClick={useCurrentLocation}>
          <span />
          {locationStatus === 'locating' ? '위치 찾는 중' : displayLocationLabel(condition)}
        </button>
        <button aria-label="메뉴" className="menu-button" type="button">
          <span />
          <span />
          <span />
        </button>
      </header>

      <section className="home-hero">
        <div>
          <span className="eyebrow">오늘</span>
          <h1>어디 갈까?</h1>
          <p>상황만 알려줘. 코스는 내가 골라볼게.</p>
        </div>
        <img alt="" src={nopiImage} />
      </section>

      <section className="prompt-card">
        <label htmlFor="home-prompt">어떤 약속인가요?</label>
        <div>
          <input
            id="home-prompt"
            placeholder="예: 성수에서 친구랑 조용한 카페"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
          />
          <button aria-label="시작" type="button" onClick={submit}>
            ↑
          </button>
        </div>
      </section>

      {locationMessage && <p className="home-location-note">{locationMessage}</p>}

      <button
        className="quick-start-button"
        type="button"
        onClick={() => {
          setCondition({ companion: '', mood: '', rawText: '', time: '' });
          navigate('/planner/chat');
        }}
      >
        <span>입력 없이 고르기</span>
        <strong>빠른 추천 받기</strong>
      </button>

      <section className="recommend-grid">
        <article className="mini-card warm">
          <span>오늘의 퀘스트</span>
          <strong>근처 산책<br />스탬프 받기</strong>
        </article>
        <article className="mini-card mint">
          <span>지금 추천</span>
          <strong>실내 중심<br />짧은 코스</strong>
        </article>
      </section>

      <button className="course-preview" type="button" onClick={() => navigate('/course/map')}>
        <PlaceVisual color="#E6F7F0" />
        <div>
          <strong>{plan.title}</strong>
          <span>{plan.durationText}</span>
        </div>
        <b>지금</b>
      </button>
    </div>
  );
}

export function ChatStart() {
  const navigate = useNavigate();
  const { condition, detectCurrentLocation, locationStatus, setCondition } = usePlanner();
  const [statusMessage, setStatusMessage] = useState('');
  const [dateTimeSheetMode, setDateTimeSheetMode] = useState<DateTimeSheetMode | null>(null);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [editSection, setEditSection] = useState<ConditionEditSection | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [locationSelectionSource, setLocationSelectionSource] = useState<'current' | 'manual' | null>(
    condition.location ? 'current' : null,
  );
  const selectedPeople = peopleOptions.find((option) => condition.companion.includes(option)) || '';
  const selectedCompanion = companionOptions.find((option) => condition.companion.includes(option)) || '';
  const moodSelection = getMoodSelection(condition.mood);
  const selectedPlace = moodSelection.category;
  const selectedDetail = moodSelection.detail;
  const companionStepComplete = selectedPeople === '혼자' ? selectedPeople : selectedCompanion;
  const completedSteps = [
    condition.location,
    condition.time,
    selectedPeople,
    companionStepComplete,
    condition.mood,
  ].filter(Boolean).length;
  const locationLabel = condition.location ? displayLocationLabel(condition) : '현재 위치 확인 중';
  const currentLocationLabel =
    locationStatus === 'locating'
      ? '현재 위치 확인 중...'
      : locationSelectionSource === 'current' && condition.location
        ? locationLabel
        : '현재 위치로 시작';
  const manualAddressLabel =
    locationSelectionSource === 'manual' && condition.location ? locationLabel : '주소 직접 입력';
  const summaryRows: SummaryRow[] = [
    { id: 'location', label: '출발지', value: locationLabel },
    { id: 'time', label: '시간', value: condition.time || '미선택' },
    { id: 'people', label: '인원', value: [selectedPeople, selectedCompanion].filter(Boolean).join(', ') || '미선택' },
    { id: 'place', label: '목적', value: [selectedPlace, selectedDetail].filter(Boolean).join(', ') || '미선택' },
    { id: 'duration', label: '이용 시간', value: condition.duration || '자동 추천' },
  ];

  const applyCurrentLocation = async () => {
    try {
      const location = await detectCurrentLocation();
      const nextCondition = { ...condition, location: location.address, locationLabel: location.label };
      setCondition({ location: location.address, locationLabel: location.label, rawText: buildHomePrompt(nextCondition) });
      setLocationSelectionSource('current');
      setStatusMessage('');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '현재 위치를 가져오지 못했어요.');
    }
  };

  const applyQuickCondition = (field: 'companion' | 'mood' | 'time', value: string) => {
    const nextValue = condition[field] === value ? '' : value;
    const nextCondition = { ...condition, [field]: nextValue };
    const nextText = buildHomePrompt(nextCondition);

    setCondition({ [field]: nextValue, rawText: nextText });
    setStatusMessage('');
  };

  const confirmDateTime = (dateTimeLabel: string) => {
    const nextCondition = { ...condition, time: dateTimeLabel };

    setCondition({ time: dateTimeLabel, rawText: buildHomePrompt(nextCondition) });
    setDateTimeSheetMode(null);
    setStatusMessage('');
  };

  const openAddressSheet = () => {
    setManualAddress(locationSelectionSource === 'manual' ? condition.location : '');
    setAddressSheetOpen(true);
    setStatusMessage('');
  };

  const confirmManualAddress = () => {
    const nextAddress = manualAddress.trim();

    if (!nextAddress) return;

    const nextCondition = {
      ...condition,
      location: nextAddress,
      locationLabel: compactLocationLabel(nextAddress),
    };

    setCondition({
      location: nextAddress,
      locationLabel: compactLocationLabel(nextAddress),
      rawText: buildHomePrompt(nextCondition),
    });
    setLocationSelectionSource('manual');
    setAddressSheetOpen(false);
    setStatusMessage('');
  };

  const applyConditionEdit = (patch: {
    companion?: string;
    location?: string;
    locationLabel?: string;
    mood?: string;
    duration?: string;
    source?: 'current' | 'manual';
    time?: string;
  }) => {
    const { source, ...conditionPatch } = patch;
    const nextCondition = { ...condition, ...conditionPatch };

    setCondition({ ...conditionPatch, rawText: buildHomePrompt(nextCondition) });
    if (source) setLocationSelectionSource(source);
    setEditSection(null);
    setStatusMessage('');
  };

  const updateCompanion = (people: string, companion: string) => {
    const nextCompanion = [people, companion].filter(Boolean).join(', ');
    const nextCondition = { ...condition, companion: nextCompanion };

    setCondition({ companion: nextCompanion, rawText: buildHomePrompt(nextCondition) });
    setStatusMessage('');
  };

  const updatePeople = (people: string) => {
    const nextPeople = selectedPeople === people ? '' : people;
    const nextCompanion = nextPeople === '혼자' ? '' : selectedCompanion;
    updateCompanion(nextPeople, nextCompanion);
  };

  const updateCompanionType = (companion: string) => {
    updateCompanion(selectedPeople, selectedCompanion === companion ? '' : companion);
  };

  const updatePlace = (place: string) => {
    const nextMood = selectedPlace === place ? '' : place;
    const nextCondition = { ...condition, mood: nextMood };

    setCondition({ mood: nextMood, rawText: buildHomePrompt(nextCondition) });
    setStatusMessage('');
  };

  const updateDetail = (detail: string) => {
    const nextDetail = selectedDetail === detail ? '' : detail;
    const nextMood = composeMood(selectedPlace, nextDetail);
    const nextCondition = { ...condition, mood: nextMood };

    setCondition({ mood: nextMood, rawText: buildHomePrompt(nextCondition) });
    setStatusMessage('');
  };

  const goConfirm = () => {
    if (!condition.location) {
      setStatusMessage('출발 위치를 먼저 확인해줘.');
      return;
    }

    if (!condition.time || !condition.companion || !condition.mood) {
      setStatusMessage('시간, 동행, 목적을 골라줘.');
      return;
    }

    setCondition({ rawText: buildHomePrompt(condition) });
    navigate('/planner/condition');
  };

  return (
    <div className="quick-chat-screen">
      <QuickChatHeader completedSteps={completedSteps} onBack={() => navigate(-1)} />

      <section className="quick-chat-content">
        <QuickBotMessage>
          안녕하세요 👋
          <br />
          오늘 어떤 코스를 찾고 계신가요?
          <br />
          원하시는 조건을 하나씩 알려주세요!
        </QuickBotMessage>

        <QuickQuestion title="어디에서 출발할까요?">
          <button
            className={`wide-option selected ${locationStatus === 'locating' ? 'loading' : ''}`}
            disabled={locationStatus === 'locating'}
            onClick={applyCurrentLocation}
            type="button"
          >
            {currentLocationLabel}
          </button>
          <button
            className={`wide-option pale ${locationSelectionSource === 'manual' ? 'selected' : ''}`}
            disabled={locationStatus === 'locating'}
            onClick={openAddressSheet}
            type="button"
          >
            {manualAddressLabel}
          </button>
        </QuickQuestion>

        <QuickQuestion title="언제 출발 하시나요?">
          <div className="split-options">
            <button
              className={`chip-button ${condition.time === timeOptions[0] ? 'selected' : ''}`}
              onClick={() => applyQuickCondition('time', timeOptions[0])}
              type="button"
            >
              지금
            </button>
            <button
              className={`chip-button ${condition.time && condition.time !== timeOptions[0] ? 'selected' : ''}`}
              onClick={() => setDateTimeSheetMode('date')}
              type="button"
            >
              {condition.time && condition.time !== timeOptions[0] ? condition.time : '날짜 / 시간 선택'}
            </button>
          </div>
        </QuickQuestion>

        <QuickQuestion title="누구와 함께 가시나요?">
          <p className="option-label">인원 선택</p>
          <div className="option-grid four">
            {peopleOptions.map((option) => (
              <button
                className={`chip-button ${selectedPeople === option ? 'selected' : ''}`}
                key={option}
                onClick={() => updatePeople(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>

          <p className="option-label">동행 선택 (선택사항)</p>
          <div className="option-grid four companion-grid">
            {companionOptions.map((option) => (
              <button
                className={`companion-button ${selectedCompanion === option ? 'selected' : ''}`}
                key={option}
                onClick={() => updateCompanionType(option)}
                type="button"
              >
                <img alt="" src={companionImages[option]} />
                <b>{option}</b>
              </button>
            ))}
          </div>
        </QuickQuestion>

        <QuickQuestion title="오늘 뭐 하고 싶나요?">
          <div className="option-grid five compact">
            {placeOptions.map((place) => (
              <button
                className={`chip-button ${selectedPlace === place ? 'selected' : ''}`}
                key={place}
                onClick={() => updatePlace(place)}
                type="button"
              >
                {place}
              </button>
            ))}
          </div>

          {selectedPlace && (
            <div className="sub-option-panel">
              {placeDetailOptions[selectedPlace].map((option) => (
                <button
                  className={`pill-button ${selectedDetail === option ? 'selected' : ''}`}
                  key={option}
                  onClick={() => updateDetail(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </QuickQuestion>

        <QuickQuestion title="얼마나 놀까요?" subtitle="선택하지 않으면 시작 시간에 맞춰 자동으로 짜드려요.">
          <div className="option-grid duration-grid">
            {durationOptions.map((option) => (
              <button
                className={`chip-button ${condition.duration === option ? 'selected' : ''}`}
                key={option}
                onClick={() => {
                  const duration = condition.duration === option ? '' : option;
                  const nextCondition = { ...condition, duration };
                  setCondition({ duration, rawText: buildHomePrompt(nextCondition) });
                }}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
          <label className={`duration-time-field ${condition.duration.startsWith('종료 ') ? 'selected' : ''}`}>
            <span>종료 시간 선택</span>
            <input
              aria-label="종료 시간"
              onChange={(event) => {
                const duration = event.target.value ? `종료 ${event.target.value}` : '';
                const nextCondition = { ...condition, duration };
                setCondition({ duration, rawText: buildHomePrompt(nextCondition) });
              }}
              type="time"
              value={condition.duration.startsWith('종료 ') ? condition.duration.slice(3) : ''}
            />
          </label>
        </QuickQuestion>

        <QuickConditionSummary rows={summaryRows} onEdit={setEditSection} />

        {statusMessage && <p className="inline-message warning">{statusMessage}</p>}

        <div className="inline-result-actions">
          <button className="primary-result-button" type="button" onClick={goConfirm}>
            조건 확인하기
          </button>
        </div>
      </section>

      {dateTimeSheetMode && (
        <DateTimeSheet
          initialValue={condition.time !== timeOptions[0] ? condition.time : ''}
          mode={dateTimeSheetMode}
          onClose={() => setDateTimeSheetMode(null)}
          onConfirm={confirmDateTime}
          onModeChange={setDateTimeSheetMode}
        />
      )}

      {addressSheetOpen && (
        <AddressInputSheet
          onChange={setManualAddress}
          onClose={() => setAddressSheetOpen(false)}
          onConfirm={confirmManualAddress}
          value={manualAddress}
        />
      )}

      {editSection && (
        <ConditionEditSheet
          condition={condition}
          onApply={applyConditionEdit}
          onClose={() => setEditSection(null)}
          onDetectCurrentLocation={detectCurrentLocation}
          section={editSection}
          selectedCompanion={selectedCompanion}
          selectedDetail={selectedDetail}
          selectedPeople={selectedPeople}
          selectedPlace={selectedPlace}
        />
      )}
    </div>
  );
}

interface QuickChatHeaderProps {
  completedSteps: number;
  onBack: () => void;
}

function QuickChatHeader({ completedSteps, onBack }: QuickChatHeaderProps) {
  const totalSteps = 5;

  return (
    <header className="chat-header">
      <button aria-label="뒤로 가기" className="round-back" onClick={onBack} type="button">
        ‹
      </button>
      <div>
        <h1>Nopi 와 대화중</h1>
        <p>원하는 조건을 알려주세요!</p>
      </div>
      <div aria-label={`진행률 ${completedSteps} / ${totalSteps}`} className="progress-row">
        {Array.from({ length: totalSteps }, (_, index) => (
          <span className={index < completedSteps ? 'done' : ''} key={index} />
        ))}
        <strong>{completedSteps} / {totalSteps}</strong>
      </div>
    </header>
  );
}

function QuickBotMessage({ children }: { children: ReactNode }) {
  return (
    <div className="bot-row">
      <div className="avatar" aria-hidden="true">
        <img alt="" src={nopiImage} />
      </div>
      <div className="bot-bubble">{children}</div>
    </div>
  );
}

interface QuickConditionSummaryProps {
  onEdit: (section: ConditionEditSection) => void;
  rows: SummaryRow[];
}

function QuickConditionSummary({ onEdit, rows }: QuickConditionSummaryProps) {
  return (
    <section className="condition-summary">
      <h2>현재 선택된 조건</h2>
      {rows.map((row) => (
        <button className="summary-row" key={row.label} onClick={() => onEdit(row.id)} type="button">
          <span />
          <div>
            <p>{row.label}</p>
            <strong>{row.value}</strong>
          </div>
          <b>›</b>
        </button>
      ))}
    </section>
  );
}

interface ConditionEditSheetProps {
  condition: {
    companion: string;
    location: string;
    locationLabel?: string;
    mood: string;
    duration: string;
    time: string;
  };
  onApply: (patch: {
    companion?: string;
    location?: string;
    locationLabel?: string;
    mood?: string;
    duration?: string;
    source?: 'current' | 'manual';
    time?: string;
  }) => void;
  onClose: () => void;
  onDetectCurrentLocation: () => Promise<{ address: string; label: string }>;
  section: ConditionEditSection;
  selectedCompanion: string;
  selectedDetail: string;
  selectedPeople: string;
  selectedPlace: string;
}

function ConditionEditSheet({
  condition,
  onApply,
  onClose,
  onDetectCurrentLocation,
  section,
  selectedCompanion,
  selectedDetail,
  selectedPeople,
  selectedPlace,
}: ConditionEditSheetProps) {
  const [draftLocation, setDraftLocation] = useState(condition.location);
  const [draftLocationLabel, setDraftLocationLabel] = useState(condition.locationLabel || compactLocationLabel(condition.location));
  const [draftLocationSource, setDraftLocationSource] = useState<'current' | 'manual'>('manual');
  const [draftTime, setDraftTime] = useState(condition.time);
  const [draftPeople, setDraftPeople] = useState(selectedPeople);
  const [draftCompanion, setDraftCompanion] = useState(selectedCompanion);
  const [draftPlace, setDraftPlace] = useState(selectedPlace);
  const [draftDetail, setDraftDetail] = useState(selectedDetail);
  const [draftDuration, setDraftDuration] = useState(condition.duration);
  const [dateTimeSheetMode, setDateTimeSheetMode] = useState<DateTimeSheetMode | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);

  const chooseCurrentLocation = async () => {
    if (locationBusy) return;

    try {
      setLocationBusy(true);
      const location = await onDetectCurrentLocation();

      setDraftLocation(location.address);
      setDraftLocationLabel(location.label);
      setDraftLocationSource('current');
    } finally {
      setLocationBusy(false);
    }
  };

  const applyEdit = () => {
    if (section === 'location') {
      const nextLocation = draftLocation.trim();
      if (!nextLocation) return;

      onApply({
        location: nextLocation,
        locationLabel: draftLocationLabel || compactLocationLabel(nextLocation),
        source: draftLocationSource,
      });
      return;
    }

    if (section === 'time') {
      if (!draftTime) return;

      onApply({ time: draftTime });
      return;
    }

    if (section === 'people') {
      if (!draftPeople) return;

      onApply({ companion: [draftPeople, draftCompanion].filter(Boolean).join(', ') });
      return;
    }

    if (section === 'duration') {
      onApply({ duration: draftDuration });
      return;
    }

    if (!draftPlace) return;

    onApply({
      mood: composeMood(draftPlace, draftDetail),
    });
  };

  const isApplyDisabled =
    (section === 'location' && !draftLocation.trim()) ||
    (section === 'time' && !draftTime) ||
    (section === 'people' && !draftPeople) ||
    (section === 'place' && !draftPlace);

  return (
    <>
      <div aria-modal="true" className="date-time-overlay" role="dialog">
        <button aria-label="조건 수정 닫기" className="date-time-backdrop" onClick={onClose} type="button" />
        <section className="condition-edit-sheet">
          {section === 'location' && (
            <>
              <h2>어디서 출발하세요?</h2>
              <button
                className={`edit-option ${locationBusy ? 'selected' : ''}`}
                onClick={() => void chooseCurrentLocation()}
                type="button"
              >
                <span>{locationBusy ? '현재 위치 확인 중...' : '현재 위치'}</span>
                {locationBusy && <b>›</b>}
              </button>
              <label className="edit-address-field">
                <input
                  onChange={(event) => {
                    setDraftLocation(event.target.value);
                    setDraftLocationLabel(compactLocationLabel(event.target.value));
                    setDraftLocationSource('manual');
                  }}
                  placeholder="주소 입력"
                  type="text"
                  value={draftLocation}
                />
              </label>
              {draftLocation && (
                <button className="edit-option selected" type="button">
                  <span>{draftLocation}</span>
                  <b>›</b>
                </button>
              )}
            </>
          )}

          {section === 'time' && (
            <>
              <h2>언제 출발하시나요?</h2>
              <button
                className={`edit-option ${draftTime === '지금' ? 'selected' : ''}`}
                onClick={() => setDraftTime((previous) => (previous === '지금' ? '' : '지금'))}
                type="button"
              >
                <span>지금</span>
                {draftTime === '지금' && <b>›</b>}
              </button>
              <button
                className={`edit-option ${draftTime && draftTime !== '지금' ? 'selected' : ''}`}
                onClick={() => setDateTimeSheetMode('date')}
                type="button"
              >
                <span>{draftTime && draftTime !== '지금' ? draftTime : '날짜 / 시간 선택'}</span>
                {draftTime && draftTime !== '지금' && <b>›</b>}
              </button>
            </>
          )}

          {section === 'people' && (
            <>
              <h2>누구와 함께하시나요?</h2>
              <div className="edit-grid four">
                {peopleOptions.map((option) => (
                  <button
                    className={`edit-chip ${draftPeople === option ? 'selected' : ''}`}
                    key={option}
                    onClick={() => {
                      const nextPeople = draftPeople === option ? '' : option;
                      setDraftPeople(nextPeople);
                      if (nextPeople === '혼자') setDraftCompanion('');
                    }}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
              <p className="edit-subtitle">동행 선택 (선택사항)</p>
              <div className="edit-grid four">
                {companionOptions.map((option) => (
                  <button
                    className={`edit-chip ${draftCompanion === option ? 'selected' : ''}`}
                    key={option}
                    onClick={() => setDraftCompanion((previous) => (previous === option ? '' : option))}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </>
          )}

          {section === 'place' && (
            <>
              <h2>오늘 뭐 하고 싶나요?</h2>
              <div className="edit-grid three">
                {placeOptions.map((place) => (
                  <button
                    className={`edit-chip ${draftPlace === place ? 'selected' : ''}`}
                    key={place}
                    onClick={() => {
                      const isSelected = draftPlace === place;

                      setDraftPlace(isSelected ? '' : place);
                      setDraftDetail('');
                    }}
                    type="button"
                  >
                    {place}
                  </button>
                ))}
              </div>
              {draftPlace && (
                <div className="edit-grid cuisine">
                  {placeDetailOptions[draftPlace].map((option) => (
                    <button
                      className={`edit-chip pill ${draftDetail === option ? 'selected' : ''}`}
                      key={option}
                      onClick={() => setDraftDetail((previous) => (previous === option ? '' : option))}
                      type="button"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {section === 'duration' && (
            <>
              <h2>얼마나 놀까요?</h2>
              <p className="edit-subtitle">선택하지 않으면 자동으로 코스를 짜드려요.</p>
              <div className="edit-grid four">
                {durationOptions.map((option) => (
                  <button
                    className={`edit-chip ${draftDuration === option ? 'selected' : ''}`}
                    key={option}
                    onClick={() => setDraftDuration((previous) => (previous === option ? '' : option))}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
              <label className={`duration-time-field ${draftDuration.startsWith('종료 ') ? 'selected' : ''}`}>
                <span>종료 시간 선택</span>
                <input
                  aria-label="종료 시간"
                  onChange={(event) => setDraftDuration(event.target.value ? `종료 ${event.target.value}` : '')}
                  type="time"
                  value={draftDuration.startsWith('종료 ') ? draftDuration.slice(3) : ''}
                />
              </label>
            </>
          )}

          <button className="condition-apply-button" disabled={isApplyDisabled} onClick={applyEdit} type="button">
            적용하기
          </button>
        </section>
      </div>

      {dateTimeSheetMode && (
        <DateTimeSheet
          initialValue={draftTime !== '지금' ? draftTime : ''}
          mode={dateTimeSheetMode}
          onClose={() => setDateTimeSheetMode(null)}
          onConfirm={(dateTimeLabel) => {
            setDraftTime(dateTimeLabel);
            setDateTimeSheetMode(null);
          }}
          onModeChange={setDateTimeSheetMode}
        />
      )}
    </>
  );
}

interface DateTimeSheetProps {
  initialValue?: string;
  mode: DateTimeSheetMode;
  onClose: () => void;
  onConfirm: (dateTimeLabel: string) => void;
  onModeChange: (mode: DateTimeSheetMode) => void;
}

function DateTimeSheet({ initialValue, mode, onClose, onConfirm, onModeChange }: DateTimeSheetProps) {
  const initialDateTime = useMemo(() => getInitialDateTime(initialValue), [initialValue]);
  const [selectedDate, setSelectedDate] = useState(initialDateTime.date);
  const [displayMonth, setDisplayMonth] = useState(
    new Date(initialDateTime.date.getFullYear(), initialDateTime.date.getMonth(), 1),
  );
  const [period, setPeriod] = useState<Meridiem>(initialDateTime.period);
  const [selectedHour, setSelectedHour] = useState(initialDateTime.hour);
  const [selectedMinute, setSelectedMinute] = useState(initialDateTime.minute);
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const calendarCells = useMemo(() => getCalendarCells(displayMonth), [displayMonth]);
  const selectedDateTimeLabel = formatDateTimeLabel(selectedDate, period, selectedHour, selectedMinute);

  const moveMonth = (offset: number) => {
    setDisplayMonth((previous) => new Date(previous.getFullYear(), previous.getMonth() + offset, 1));
  };

  return (
    <div aria-modal="true" className="date-time-overlay" role="dialog">
      <button aria-label="날짜 시간 선택 닫기" className="date-time-backdrop" onClick={onClose} type="button" />
      <section className="date-time-sheet">
        <h2>언제 출발하시나요?</h2>

        <div aria-label="날짜 시간 선택" className="date-time-tabs" role="tablist">
          <button className={mode === 'date' ? 'active' : ''} onClick={() => onModeChange('date')} type="button">
            날짜 선택
          </button>
          <button className={mode === 'time' ? 'active' : ''} onClick={() => onModeChange('time')} type="button">
            시간 선택
          </button>
        </div>

        {mode === 'date' ? (
          <div className="calendar-panel">
            <div className="calendar-month">
              <button aria-label="이전 달" onClick={() => moveMonth(-1)} type="button">
                ‹
              </button>
              <strong>
                {displayMonth.getFullYear()}년 {displayMonth.getMonth() + 1}월
              </strong>
              <button aria-label="다음 달" onClick={() => moveMonth(1)} type="button">
                ›
              </button>
            </div>
            <div className="calendar-grid weekday-grid">
              {weekdays.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {calendarCells.map((day, index) =>
                day ? (
                  <button
                    aria-label={`${day.getFullYear()}년 ${day.getMonth() + 1}월 ${day.getDate()}일 선택`}
                    className={isSameDate(day, selectedDate) ? 'selected' : ''}
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    type="button"
                  >
                    {day.getDate()}
                  </button>
                ) : (
                  <span key={`blank-${index}`} />
                ),
              )}
            </div>
          </div>
        ) : (
          <div className="time-panel">
            <div className="ampm-toggle">
              <button className={period === 'AM' ? 'active' : ''} onClick={() => setPeriod('AM')} type="button">
                AM
              </button>
              <button className={period === 'PM' ? 'active' : ''} onClick={() => setPeriod('PM')} type="button">
                PM
              </button>
            </div>
            <div aria-label="시간 선택" className="time-select-groups">
              <div className="time-option-group">
                <p>시</p>
                <div className="time-option-grid hour-grid">
                  {hourOptions.map((hour) => (
                    <button
                      className={selectedHour === hour ? 'selected' : ''}
                      key={hour}
                      onClick={() => setSelectedHour(hour)}
                      type="button"
                    >
                      {hour}
                    </button>
                  ))}
                </div>
              </div>
              <div className="time-option-group">
                <p>분</p>
                <div className="time-option-grid minute-grid">
                  {minuteOptions.map((minute) => (
                    <button
                      className={selectedMinute === minute ? 'selected' : ''}
                      key={minute}
                      onClick={() => setSelectedMinute(minute)}
                      type="button"
                    >
                      {minute}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="selected-date-time">
          <span>선택된 날짜 및 시간</span>
          <strong>{selectedDateTimeLabel}</strong>
        </div>

        <button className="date-time-confirm" onClick={() => onConfirm(selectedDateTimeLabel)} type="button">
          날짜 / 시간 선택하기
        </button>
      </section>
    </div>
  );
}

interface AddressInputSheetProps {
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  value: string;
}

function AddressInputSheet({ onChange, onClose, onConfirm, value }: AddressInputSheetProps) {
  const trimmedValue = value.trim();

  return (
    <div aria-modal="true" className="date-time-overlay" role="dialog">
      <button aria-label="주소 입력 닫기" className="date-time-backdrop" onClick={onClose} type="button" />
      <form
        className="address-sheet"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <h2>출발 주소를 입력해주세요</h2>
        <label className="address-field">
          <span>주소</span>
          <input
            autoFocus
            onChange={(event) => onChange(event.target.value)}
            placeholder="예: 서울시 중랑구 면목로92가길 15-11"
            type="text"
            value={value}
          />
        </label>
        <div className="address-sheet-actions">
          <button className="address-cancel-button" onClick={onClose} type="button">
            취소
          </button>
          <button className="date-time-confirm" disabled={!trimmedValue} type="submit">
            주소 선택하기
          </button>
        </div>
      </form>
    </div>
  );
}

interface QuickQuestionProps {
  children: ReactNode;
  subtitle?: string;
  title: string;
}

function QuickQuestion({ children, subtitle, title }: QuickQuestionProps) {
  return (
    <section className="question-block">
      <h2>{title}</h2>
      {subtitle && <p className="question-subtitle">{subtitle}</p>}
      {children}
    </section>
  );
}

export function ConditionConfirm() {
  const navigate = useNavigate();
  const { condition, detectCurrentLocation, locationStatus, runSearch, searchError, setCondition } = usePlanner();
  const [editSection, setEditSection] = useState<ConditionEditSection | null>(null);
  const locationText = displayLocationLabel(condition);
  const locationValue = condition.location ? locationText : '';
  const selectedPeople = peopleOptions.find((option) => condition.companion.includes(option)) || '';
  const selectedCompanion = companionOptions.find((option) => condition.companion.includes(option)) || '';
  const moodSelection = getMoodSelection(condition.mood);
  const selectedPlace = moodSelection.category;
  const selectedDetail = moodSelection.detail;

  const applyConditionEdit = (patch: {
    companion?: string;
    location?: string;
    locationLabel?: string;
    mood?: string;
    duration?: string;
    source?: 'current' | 'manual';
    time?: string;
  }) => {
    const conditionPatch = { ...patch };
    delete conditionPatch.source;
    const nextCondition = { ...condition, ...conditionPatch };

    setCondition({ ...conditionPatch, rawText: buildHomePrompt(nextCondition) });
    setEditSection(null);
  };

  const startSearch = async () => {
    navigate('/planner/searching');
    await Promise.all([
      runSearch(),
      new Promise((resolve) => {
        window.setTimeout(resolve, 3600);
      }),
    ]);
    navigate('/planner/result', { replace: true });
  };

  return (
    <div>
      <AppTopBar title="조건 확인" subtitle="Nopi가 이해한 내용을 다듬어줘" />
      <NopiBubble title="이 조건이면 가볍게 찾을 수 있어." body="부족한 것만 바꾸면 돼." />
      {searchError && <p className="inline-message warning">{searchError}</p>}

      <section className="screen-section">
        <h2>정리된 조건</h2>
        <div className="condition-grid">
          <ConditionCard color="#315BFF" label="장소" onClick={() => setEditSection('location')} value={locationValue} />
          <ConditionCard color="#7B61FF" label="시간" onClick={() => setEditSection('time')} value={condition.time} />
          <ConditionCard color="#16A17D" label="동행" onClick={() => setEditSection('people')} value={condition.companion} />
          <ConditionCard color="#F0A23A" label="취향" onClick={() => setEditSection('place')} value={condition.mood} />
          <ConditionCard className="wide" color="#14A6A1" label="이용 시간" onClick={() => setEditSection('duration')} value={condition.duration || '자동 추천'} />
        </div>
        <button className="location-refresh-button" type="button" onClick={() => void detectCurrentLocation()}>
          {locationStatus === 'locating' ? '현재 위치 확인 중' : '현재 위치 다시 잡기'}
        </button>
      </section>

      <section className="prompt-summary">
        <span>찾을 때 쓸 핵심 조건</span>
        <strong>
          {[locationValue, condition.time, condition.companion, condition.mood, condition.duration || '자동 추천']
            .map(displayConditionValue)
            .join(' · ')}
        </strong>
        <p>각 조건을 확인하면서 코스를 고를게.</p>
      </section>

      <section className="screen-section">
        <h2>더 맞춰볼까요?</h2>
        <div className="chip-row">
          {tuningOptions.map((option) => (
            <Chip
              active={condition.extras.includes(option)}
              key={option}
              onClick={() => {
                const exists = condition.extras.includes(option);
                setCondition({
                  extras: exists
                    ? condition.extras.filter((item) => item !== option)
                    : [...condition.extras, option],
                });
              }}
            >
              {option}
            </Chip>
          ))}
        </div>
      </section>

      <button className="primary-bottom-button" type="button" onClick={startSearch}>
        이 조건으로 코스 찾기
      </button>

      {editSection && (
        <ConditionEditSheet
          condition={condition}
          onApply={applyConditionEdit}
          onClose={() => setEditSection(null)}
          onDetectCurrentLocation={detectCurrentLocation}
          section={editSection}
          selectedCompanion={selectedCompanion}
          selectedDetail={selectedDetail}
          selectedPeople={selectedPeople}
          selectedPlace={selectedPlace}
        />
      )}
    </div>
  );
}

function ConditionCard({
  className = '',
  color,
  label,
  onClick,
  value,
}: {
  className?: string;
  color: string;
  label: string;
  onClick: () => void;
  value?: string | null;
}) {
  const displayValue = displayConditionValue(value);
  const isEmpty = displayValue === '미정';

  return (
    <button
      aria-label={`${label} ${isEmpty ? '추가하기' : '수정하기'}`}
      className={`condition-card ${className} ${isEmpty ? 'empty' : ''}`}
      onClick={onClick}
      type="button"
    >
      <span style={{ background: color }} />
      <small style={{ color }}>{label}</small>
      <strong>{displayValue}</strong>
      <b aria-hidden="true">›</b>
    </button>
  );
}

export function SearchingScreen() {
  const { condition, isSearching } = usePlanner();
  const [checkedCount, setCheckedCount] = useState(0);
  const locationText = displayLocationLabel(condition);
  const searchSteps = useMemo(
    () =>
      [
        {
          detail: `${locationText} 기준으로 가까운 후보를 먼저 모으는 중`,
          label: '출발지',
          nopi: `${locationText} 근처에서 이동 짧은 후보부터 볼게.`,
          value: locationText,
        },
        {
          detail: `${condition.time || '선택한 시간'}에 갈 수 있는지 확인 중`,
          label: '시간',
          nopi: `${condition.time || '선택한 시간'} 기준으로 영업시간을 걸러보고 있어.`,
          value: condition.time || '시간 확인',
        },
        {
          detail: `${condition.companion || '동행'}에게 맞는 좌석과 분위기 확인 중`,
          label: '동행',
          nopi: `${condition.companion || '동행'}랑 가도 편한 분위기인지 보고 있어.`,
          value: condition.companion || '동행 확인',
        },
        {
          detail: `${condition.mood || '취향'} 관련 메뉴, 리뷰, 분위기 확인 중`,
          label: '취향',
          nopi: `${condition.mood || '취향'} 느낌에 맞는 곳만 남겨볼게.`,
          value: condition.mood || '취향 확인',
        },
        {
          detail: '이동 순서와 코스 흐름 정리 중',
          label: '코스',
          nopi: '마지막으로 이동 순서가 자연스럽게 이어지는지 맞추는 중이야.',
          value: '코스 흐름',
        },
      ],
    [condition.companion, condition.mood, condition.time, locationText],
  );
  const activeStep = searchSteps[Math.min(checkedCount, searchSteps.length - 1)];

  useEffect(() => {
    setCheckedCount(0);
    const timers = searchSteps.map((_, index) =>
      window.setTimeout(() => {
        setCheckedCount(index + 1);
      }, 650 + index * 620),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [searchSteps]);

  return (
    <div>
      <AppTopBar title="코스 찾는 중" subtitle="조건에 맞는 장소를 고르고 있어" />
      <NopiBubble title={activeStep.nopi} body="조건이 맞는지 하나씩 확인하고 있어." />
      <p className="search-live-status">
        {checkedCount < searchSteps.length
          ? `${activeStep.label} 조건을 확인하고 있어요.`
          : isSearching
            ? '후보 장소를 마지막으로 정리하고 있어요.'
            : '추천 결과를 정리했어요.'}
      </p>

      <section className="reading-card">
        <strong>읽고 있는 조건</strong>
        <div className="condition-check-row">
          {searchSteps.slice(0, 4).map((step, index) => (
            <span
              className={`condition-check-chip ${
                index < checkedCount ? 'done' : index === checkedCount ? 'active' : ''
              }`}
              key={step.label}
            >
              <b>{index < checkedCount ? '✓' : index + 1}</b>
              {step.value}
            </span>
          ))}
        </div>
      </section>

      <section className="screen-section">
        <h2>Nopi가 확인하는 중</h2>
        <div className="search-check-list">
          {searchSteps.map((step, index) => (
            <article
              className={`search-check-item ${
                index < checkedCount ? 'done' : index === checkedCount ? 'active' : ''
              }`}
              key={step.label}
            >
              <span>{index < checkedCount ? '✓' : index + 1}</span>
              <div>
                <strong>{step.label}</strong>
                <p>{step.detail}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="loading-dots">
          <span />
          <span />
          <span />
        </div>
      </section>

      <section className="screen-section">
        <h2>곧 추천 코스가 나와요</h2>
        <SkeletonCard />
        <SkeletonCard />
      </section>
    </div>
  );
}

function SkeletonCard() {
  return (
    <article className="skeleton-card">
      <span className="skeleton-image" />
      <div>
        <i />
        <i />
        <i />
      </div>
      <b />
    </article>
  );
}

export function ResultScreen() {
  const navigate = useNavigate();
  const { condition, plan } = usePlanner();
  const [saveMessage, setSaveMessage] = useState('');
  const locationText = displayLocationLabel(condition);
  const hasCourse = plan.courseData.length > 0;

  const handleSave = async () => {
    try {
      const result = await saveCourse(plan.title, plan.location, plan.courseData);
      setSaveMessage(result.success ? '코스를 저장했어요.' : '저장 결과를 확인해줘.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : '저장하지 못했어요.');
    }
  };

  return (
    <div>
      <AppTopBar title="추천 코스" subtitle={`${locationText} · ${condition.time} · ${condition.companion} · ${condition.mood}`} />
      <NopiBubble
        title={hasCourse ? '이 코스가 제일 가벼워.' : '검증된 장소를 못 찾았어.'}
        body={hasCourse ? '이동 짧고, 분위기도 맞아.' : '평점, 리뷰, 영업시간 기준을 통과한 후보가 없었어.'}
        compact
      />
      {plan.message && <p className={`inline-message ${plan.source === 'fallback' ? 'warning' : ''}`}>{plan.message}</p>}

      <div className="chip-row result-chips">
        {[locationText, condition.time, condition.companion, condition.mood].map((token, index) => (
          <Chip active={index === 0} key={token}>
            {token}
          </Chip>
        ))}
      </div>

      {hasCourse ? (
        <article className="result-card">
          <span className="rank-pill">BEST 1</span>
          <h1>{plan.title}</h1>
          <p>{plan.durationText} · 실제 장소 추천</p>
          <div className="result-map-preview">
            <MapBoard courseList={plan.courseData} userLocation={plan.location} />
          </div>
          <div className="result-stops">
            {plan.courseData.slice(0, 2).map((place, index) => (
              <div key={place.id}>
                <b>{index + 1}</b>
                <strong>{place.title}</strong>
                <span>{place.summary}</span>
              </div>
            ))}
          </div>
        </article>
      ) : (
        <article className="result-card">
          <span className="rank-pill">검증 실패</span>
          <h1>추천할 실제 장소가 없어요</h1>
          <p>평점 3.5 이상, 리뷰 30개 이상, 영업 중 기준을 통과한 후보가 없었습니다.</p>
        </article>
      )}

      {hasCourse && (
        <section className="screen-section">
          <h2>추천된 장소</h2>
          <div className="result-place-list">
            {plan.courseData.map((place, index) => (
              <button key={place.id} type="button" onClick={() => navigate(`/course/place/${index}`)}>
                <PlaceVisual alt={place.name} color={place.color} imageUrl={place.imageUrl} label={String(index + 1)} />
                <span>
                  <strong>{place.searchKeyword || place.title}</strong>
                  <small>{place.description}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {saveMessage && <p className="inline-message">{saveMessage}</p>}

      <div className="sticky-actions result-actions">
        {hasCourse ? (
          <>
            <button type="button" onClick={handleSave}>저장</button>
            <button className="primary" type="button" onClick={() => navigate('/course/map')}>
              이 코스로 시작하기
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => navigate('/planner/chat')}>조건 다시 고르기</button>
            <button className="primary" type="button" onClick={() => navigate('/planner/condition')}>
              조건 확인하기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
