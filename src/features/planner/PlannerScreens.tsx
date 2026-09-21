import { t as uiText } from '../../i18n/translate';
import './result-screen.css';
import { CourseOptionCards } from './CourseOptionCards';
import { useStopDrag } from './useStopDrag';
import { reorderPlan } from '../../api/courseOrderApi';
import { kakaoPlaceUrl } from '../../utils/placeMap';
import { FavoriteButton } from '../mobile/MobileUi';
import { CourseNearbyEvents } from '../events/CourseNearbyEvents';
import { planFavorite } from '../mobile/mobileModel';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Chip } from '../../components/ui/Chip';
import { AppTopBar } from '../../components/ui/AppTopBar';
import { NopiBubble } from '../../components/ui/NopiBubble';
import { NopiCheckNote } from '../../components/ui/NopiCheckNote';
import { PlaceVisual } from '../../components/ui/PlaceVisual';
import { CrowdingStatus } from '../../components/ui/CrowdingStatus';
import companionFamilyImage from '../../assets/nopi/가족.png';
import companionCoworkerImage from '../../assets/nopi/동료.png';
import companionCoupleImage from '../../assets/nopi/연인.png';
import companionFriendImage from '../../assets/nopi/친구.png';
import homeNopiImage from '../../assets/nopi/nopi-home.png';
import nopiIconImage from '../../assets/nopi/nopi-icon.png';
import { saveCourse } from '../../api/courseApi';
import { trackMvpFeedback, trackPlannerEvent } from '../../api/plannerApi';
import type { PlannerCondition, CoursePlan } from '../../types/noplan';
import { ROUTES, coursePlaceRoute } from '../../routes';
import { usePlanner } from './PlannerContext';
import { AccuracyPreferences } from './AccuracyPreferences';
import { MobilePlannerWizard } from './MobilePlannerWizard';
import { useDesktop } from '../mobile/useDesktop';
import { accuracyMissing } from './accuracyModel';
import {
  PLANNER_CATEGORIES,
  categoryKeyFromLabel,
  categoryLabelFromKey,
  getCoreIntentOptions,
  needsCoreIntentQuestion,
  normalizeCoreIntent,
} from './plannerIntents';

const timeOptions = ['지금', '오늘 저녁', '오늘 밤', '내일', '이번 주말'];
const peopleOptions = ['혼자', '두명', '3-4명', '5명 이상'];
const companionOptions = ['친구', '연인', '가족', '동료'];
const placeOptions = PLANNER_CATEGORIES.map((category) => category.label);
const placeDetailOptions: Record<string, string[]> = {
  맛집: ['한식', '일식', '중식', '양식', '고기', '분식', '해산물', '아무거나'],
  '카페/디저트': ['커피', '디저트', '베이커리', '브런치', '아무거나'],
  놀거리: ['방탈출', '보드게임', '볼링', '노래방', '오락실', '공방/체험', '스포츠', '아무거나'],
  '산책/구경': ['산책', '공원', '야경', '쇼핑몰', '시장/상권', '아무거나'],
  '술/야간': ['포차', '펍', '와인/칵테일', '이자카야', '아무거나'],
};
const MAX_PLACE_SELECTIONS = 3;
const durationOptions = ['2시간', '4시간', '저녁까지', '밤까지'];
const durationOptionLabel = (value: string) => value === '밤까지' ? '밤까지 (00:30)' : value === '저녁까지' ? '저녁까지 (20:30 전후)' : value;
function endTimeHint(value: string) {
  if (value === '저녁까지') return '20:30을 목표로 하되, 늦게 출발하면 이동과 선택한 활동의 최소 체류 시간을 확보해 종료 시각을 조정해요.';
  const match = value.match(/^종료 (\d{2}):(\d{2})$/);
  if (!match) return '출발 시각보다 이른 종료 시각은 다음 날로 계산해요.';
  const hour = Number(match[1]);
  return `${hour < 12 ? '오전' : '오후'} ${hour % 12 || 12}시 ${match[2]}분 종료예요. 출발보다 이르면 다음 날이에요.`;
}
const tuningOptions = ['도보 짧게', '대기 적게', '사진 예쁜 곳', '조용한 곳'];
const companionImages: Record<string, string> = {
  가족: companionFamilyImage,
  동료: companionCoworkerImage,
  연인: companionCoupleImage,
  친구: companionFriendImage,
};

type DateTimeSheetMode = 'date' | 'time';
type ConditionEditSection = 'location' | 'time' | 'people' | 'place' | 'duration';
type Meridiem = 'AM' | 'PM';

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

function useDialogAccessibility<T extends HTMLElement>(onClose: () => void) {
  const dialogRef = useRef<T>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>('button, input, select, textarea')?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!dialogRef.current) return;
      const overlays = [...document.querySelectorAll('.date-time-overlay')];
      if (!overlays.at(-1)?.contains(dialogRef.current)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = [...dialogRef.current.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter((element) => !element.hasAttribute('disabled'));
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, []);

  return dialogRef;
}

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

interface MoodSelection {
  category: string;
  detail: string;
}

function getMoodSelections(mood: string): MoodSelection[] {
  const value = String(mood || '').trim();
  const aliases: Record<string, string> = {
    음식점: '맛집',
    카페: '카페/디저트',
    디저트: '카페/디저트',
    운동: '놀거리',
    놀이: '놀거리',
    산책: '산책/구경',
    술집: '술/야간',
  };
  if (!value) return [];

  const selections: MoodSelection[] = [];
  const groups = value.split(/\s*·\s*/).filter(Boolean);

  groups.forEach((group) => {
    const tokens = group.split(/\s*,\s*/).map((token) => token.trim()).filter(Boolean);
    const categories = tokens.map((token) => (
      placeOptions.find((option) => token === option)
      || aliases[token]
      || Object.entries(placeDetailOptions).find(([, details]) => details.includes(token))?.[0]
      || ''
    )).filter(Boolean);

    [...new Set(categories)].forEach((category) => {
      if (selections.some((selection) => selection.category === category)) return;
      const details = placeDetailOptions[category] || [];
      const detail = tokens.find((token) => details.includes(token))
        || (group === '운동' ? '스포츠' : '')
        || (group === '전시' ? '전시' : '')
        || (group === '산책' ? '산책' : '');
      selections.push({ category, detail });
    });
  });

  return selections.slice(0, MAX_PLACE_SELECTIONS);
}

function composeMoods(selections: MoodSelection[]) {
  return selections
    .slice(0, MAX_PLACE_SELECTIONS)
    .map(({ category, detail }) => (
      detail && detail !== '아무거나' ? `${category}, ${detail}` : category
    ))
    .join(' · ');
}

function makeCategoryPreferencePatch(
  selections: MoodSelection[],
  condition: Pick<PlannerCondition, 'mainCategory' | 'coreIntent' | 'coreIntentExplicit' | 'coreIntentSkipped'>,
) {
  const mainCategory = categoryKeyFromLabel(selections[0]?.category);
  const supportingCategories = selections.slice(1)
    .map((selection) => categoryKeyFromLabel(selection.category))
    .filter(Boolean);
  const mainChanged = mainCategory !== condition.mainCategory;
  const coreIntent = mainChanged
    ? ''
    : normalizeCoreIntent(mainCategory, condition.coreIntent);

  return {
    mainCategory,
    supportingCategories,
    coreIntent,
    coreIntentExplicit: mainChanged ? false : Boolean(condition.coreIntentExplicit),
    coreIntentSkipped: mainChanged || coreIntent ? false : condition.coreIntentSkipped,
  };
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

export function PlannerHome({ active = true }: { active?: boolean }) {
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

    const hasLocation = await startFromText(text);
    navigate(hasLocation ? ROUTES.plannerCondition : ROUTES.plannerChat);
  };

  const handleCurrentLocation = async () => {
    try {
      await detectCurrentLocation();
      setLocationMessage('');
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : '현재 위치를 가져오지 못했어요.');
    }
  };

  useEffect(() => {
    if (!active || didRequestLocation.current || locationStatus !== 'idle') return;

    didRequestLocation.current = true;
    const timer = window.setTimeout(() => {
      void detectCurrentLocation().catch((error) => {
        setLocationMessage(error instanceof Error ? error.message : '현재 위치를 가져오지 못했어요.');
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [active, detectCurrentLocation, locationStatus]);

  return (
    <div className="home-screen">
      <header className="home-header">
        <button className="location-pill" type="button" onClick={handleCurrentLocation}>
          <span />
          {uiText(locationStatus === 'locating' ? '위치 찾는 중' : displayLocationLabel(condition))}
        </button>
        <button aria-label={uiText("메뉴")} className="menu-button" type="button">
          <span />
          <span />
          <span />
        </button>
      </header>

      <section className="home-hero">
        <div>
          <span className="eyebrow">{uiText("오늘")}</span>
          <h1>{uiText("어디 갈까?")}</h1>
          <p>{uiText("상황만 알려줘. 코스는 내가 골라볼게.")}</p>
        </div>
        <img alt="" src={homeNopiImage} />
      </section>

      <section className="prompt-card">
        <label htmlFor="home-prompt">{uiText("어떤 약속인가요?")}</label>
        <div>
          <input
            id="home-prompt"
            placeholder={uiText("예: 건대입구역에서 친구랑 조용한 카페")}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
          />
          <button aria-label={uiText("시작")} type="button" onClick={submit}>
            ↑
          </button>
        </div>
      </section>

      <p className="home-service-area-note">
        <span aria-hidden="true">i</span>{uiText("등록된 주변 장소가 없으면 실시간 검색으로 코스를 찾아요. 도보 기준이며 가격·리뷰 확인이 필요할 수 있어요.")}</p>

      {locationMessage && <p className="home-location-note">{locationMessage}</p>}

      <button
        className="quick-start-button"
        type="button"
        onClick={() => {
          void trackPlannerEvent('planner_start', { entryMode: 'quick' }, undefined, { resetSession: true }).catch(() => undefined);
          setCondition({
            companion: '',
            mood: '',
            mainCategory: '',
            supportingCategories: [],
            coreIntent: '',
            coreIntentExplicit: false,
            coreIntentSkipped: false,
            atmosphereTags: [],
            rawText: '',
            time: '',
          });
          navigate(ROUTES.plannerChat);
        }}
      >
        <span>{uiText("입력 없이 고르기")}</span>
        <strong>{uiText("빠른 추천 받기")}</strong>
      </button>

      <section className="recommend-grid">
        <article className="mini-card warm">
          <span>{uiText("오늘의 퀘스트")}</span>
          <strong>{uiText("근처 산책")}<br />{uiText("스탬프 받기")}</strong>
        </article>
        <article className="mini-card mint">
          <span>{uiText("지금 추천")}</span>
          <strong>{uiText("실내 중심")}<br />{uiText("짧은 코스")}</strong>
        </article>
      </section>

      <button className="course-preview" type="button" onClick={() => navigate(ROUTES.courseMap)}>
        <PlaceVisual color="#E6F7F0" />
        <div>
          <strong>{uiText(plan.title)}</strong>
          <span>{plan.durationText}</span>
        </div>
        <b>{uiText("지금")}</b>
      </button>
    </div>
  );
}

export function ChatStart() {
  return useDesktop() ? <DesktopChatStart /> : <MobilePlannerWizard DateSheet={DateTimeSheet} AddressSheet={AddressInputSheet} />;
}

function DesktopChatStart() {
  const navigate = useNavigate();
  const { condition, detectCurrentLocation, locationStatus, setCondition, inputNotice } = usePlanner();
  const [activeStep, setActiveStep] = useState(() => {
    const hasPeople = peopleOptions.some((option) => condition.companion.includes(option));
    if (!condition.location) return 0;
    if (!condition.time) return 1;
    if (!hasPeople) return 2;
    if (!condition.mood) return 3;
    return 4;
  });
  const [statusMessage, setStatusMessage] = useState(inputNotice);
  const [dateTimeSheetMode, setDateTimeSheetMode] = useState<DateTimeSheetMode | null>(null);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [locationSelectionSource, setLocationSelectionSource] = useState<'current' | 'manual' | null>(
    condition.location ? 'current' : null,
  );
  const selectedPeople = peopleOptions.find((option) => condition.companion.includes(option)) || '';
  const selectedCompanion = companionOptions.find((option) => condition.companion.includes(option)) || '';
  const selectedPlaces = getMoodSelections(condition.mood);
  const locationLabel = condition.location ? displayLocationLabel(condition) : '출발지 미선택';
  const currentLocationLabel =
    locationStatus === 'locating'
      ? '현재 위치 확인 중...'
      : locationSelectionSource === 'current' && condition.location
        ? locationLabel
        : '현재 위치로 시작';
  const manualAddressLabel =
    locationSelectionSource === 'manual' && condition.location ? locationLabel : '주소 직접 입력';
  const stepSummaries = [
    { label: '출발지', value: locationLabel, complete: Boolean(condition.location) },
    { label: '시간', value: condition.time || '미선택', complete: Boolean(condition.time) },
    { label: '동행', value: condition.companion || '미선택', complete: Boolean(selectedPeople) },
    { label: '목적', value: condition.mood || '미선택', complete: Boolean(condition.mood) },
    { label: '이용 시간', value: condition.duration || '미선택', complete: Boolean(condition.duration) },
  ];
  const stepComplete = stepSummaries[activeStep].complete;

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

  const chooseFallbackArea = (area: string) => {
    const nextCondition = { ...condition, location: area, locationLabel: area };
    setCondition({ location: area, locationLabel: area, rawText: buildHomePrompt(nextCondition) });
    setLocationSelectionSource('manual');
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
    const exists = selectedPlaces.some((selection) => selection.category === place);
    if (!exists && selectedPlaces.length >= MAX_PLACE_SELECTIONS) {
      setStatusMessage(`목적은 최대 ${MAX_PLACE_SELECTIONS}개까지 고를 수 있어.`);
      return;
    }

    const nextSelections = exists
      ? selectedPlaces.filter((selection) => selection.category !== place)
      : [...selectedPlaces, { category: place, detail: '' }];
    const nextMood = composeMoods(nextSelections);
    const preferencePatch = makeCategoryPreferencePatch(nextSelections, condition);
    const nextCondition = { ...condition, mood: nextMood, ...preferencePatch };

    setCondition({ mood: nextMood, ...preferencePatch, rawText: buildHomePrompt(nextCondition) });
    setStatusMessage('');
  };

  const updateDetail = (place: string, detail: string) => {
    const nextSelections = selectedPlaces.map((selection) => (
      selection.category === place
        ? { ...selection, detail: selection.detail === detail ? '' : detail }
        : selection
    ));
    const nextMood = composeMoods(nextSelections);
    const preferencePatch = makeCategoryPreferencePatch(nextSelections, condition);
    const nextCondition = { ...condition, mood: nextMood, ...preferencePatch };

    setCondition({ mood: nextMood, ...preferencePatch, rawText: buildHomePrompt(nextCondition) });
    setStatusMessage('');
  };

  const advance = () => {
    if (!stepComplete) return;
    if (activeStep < 4) {
      setActiveStep((step) => step + 1);
      setStatusMessage('');
      return;
    }
    setCondition({ rawText: buildHomePrompt(condition) });
    navigate(ROUTES.plannerCondition);
  };

  const goBack = () => {
    if (activeStep === 0) {
      navigate(ROUTES.appHome);
      return;
    }
    setActiveStep((step) => step - 1);
    setStatusMessage('');
  };

  return (
    <div className="quick-chat-screen">
      <QuickChatHeader activeStep={activeStep} onBack={goBack} />

      <section className="quick-chat-content">
        <nav aria-label={uiText("완료한 조건")} className="chat-summary-chips">
          {stepSummaries.map((step, index) => step.complete && index < activeStep ? (
            <button key={step.label} onClick={() => setActiveStep(index)} type="button">
              <span>{uiText(step.label)}</span>
              <strong>{step.value}</strong>
            </button>
          ) : null)}
        </nav>

        <QuickBotMessage>
          {uiText([
            '어디에서 시작할지 알려줘.',
            '출발할 시간을 골라줘.',
            '누구와 함께하는지 알려줘.',
            '하고 싶은 걸 최대 3개 골라줘.',
            '마지막으로 얼마나 놀지 정해보자.',
          ][activeStep])}
        </QuickBotMessage>

        {activeStep === 0 && <QuickQuestion title={uiText("어디에서 출발할까요?")}>
          <button
            aria-pressed={locationSelectionSource === 'current' && Boolean(condition.location)}
            className={`wide-option ${locationSelectionSource === 'current' && condition.location ? 'selected' : ''} ${locationStatus === 'locating' ? 'loading' : ''}`}
            disabled={locationStatus === 'locating'}
            onClick={applyCurrentLocation}
            type="button"
          >
            {currentLocationLabel}
          </button>
          <button
            aria-pressed={locationSelectionSource === 'manual' && Boolean(condition.location)}
            className={`wide-option pale ${locationSelectionSource === 'manual' ? 'selected' : ''}`}
            disabled={locationStatus === 'locating'}
            onClick={openAddressSheet}
            type="button"
          >
            {manualAddressLabel}
          </button>
          {(locationStatus === 'error' || statusMessage) && (
            <div className="location-fallback-options">
              <p>{uiText(statusMessage || '현재 위치를 못 찾았어요. 관광지·역 이름이나 주소를 직접 입력해 주세요.')}</p>
              <div>{['건대입구역', '강남역', '잠실역', '종로'].map((area) => (
                <button aria-pressed={condition.location === area} key={area} onClick={() => chooseFallbackArea(area)} type="button">{area}</button>
              ))}</div>
            </div>
          )}
        </QuickQuestion>}

        {activeStep === 1 && <QuickQuestion title={uiText("언제 출발하시나요?")}>
          <div className="single-step-options">
            {['지금', '오늘 저녁', '오늘 밤'].map((option) => (
              <button aria-pressed={condition.time === option} className={`chip-button ${condition.time === option ? 'selected' : ''}`} key={option} onClick={() => applyQuickCondition('time', option)} type="button">{uiText(option)}</button>
            ))}
            <button
              aria-pressed={Boolean(condition.time && !['지금', '오늘 저녁', '오늘 밤'].includes(condition.time))}
              className={`chip-button ${condition.time && !['지금', '오늘 저녁', '오늘 밤'].includes(condition.time) ? 'selected' : ''}`}
              onClick={() => setDateTimeSheetMode('date')}
              type="button"
            >
              {uiText(condition.time && !['지금', '오늘 저녁', '오늘 밤'].includes(condition.time) ? condition.time : '날짜·시간 직접 선택')}
            </button>
          </div>
        </QuickQuestion>}

        {activeStep === 2 && <QuickQuestion title={uiText("누구와 함께 가시나요?")}>
          <p className="option-label">{uiText("인원 선택")}</p>
          <div className="option-grid four">
            {peopleOptions.map((option) => (
              <button
                aria-pressed={selectedPeople === option}
                className={`chip-button ${selectedPeople === option ? 'selected' : ''}`}
                key={option}
                onClick={() => updatePeople(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>

          <p className="option-label">{uiText("동행 선택 (선택사항)")}</p>
          <div className="option-grid four companion-grid">
            {companionOptions.map((option) => (
              <button
                aria-pressed={selectedCompanion === option}
                className={`companion-button ${selectedCompanion === option ? 'selected' : ''}`}
                key={option}
                onClick={() => updateCompanionType(option)}
                type="button"
              >
                <img alt="" src={companionImages[option]} />
                <b>{uiText(option)}</b>
              </button>
            ))}
          </div>
          {selectedPeople && selectedPeople !== '혼자' && (
            <button aria-pressed={!selectedCompanion} className={`wide-option pale ${!selectedCompanion ? 'selected' : ''}`} onClick={() => updateCompanion(selectedPeople, '')} type="button">{uiText("관계 선택 안 함")}</button>
          )}
        </QuickQuestion>}

        {activeStep === 3 && <QuickQuestion title={uiText("오늘 뭐 하고 싶나요?")} subtitle={uiText(`1개 이상, 최대 ${MAX_PLACE_SELECTIONS}개까지 고를 수 있어요.`)}>
          <div className="option-grid five compact">
            {placeOptions.map((place) => (
              <button
                aria-pressed={selectedPlaces.some((selection) => selection.category === place)}
                className={`chip-button ${selectedPlaces.some((selection) => selection.category === place) ? 'selected' : ''}`}
                key={place}
                onClick={() => updatePlace(place)}
                type="button"
              >
                {place}
              </button>
            ))}
          </div>

          {selectedPlaces.map((selection) => (
            <div className="purpose-detail-group" key={selection.category}>
              <p className="option-label">{uiText(selection.category)}{uiText(" 세부 선택")}</p>
              <div className="sub-option-panel">
                {placeDetailOptions[selection.category].map((option) => (
                  <button
                    aria-pressed={selection.detail === option}
                    className={`pill-button ${selection.detail === option ? 'selected' : ''}`}
                    key={option}
                    onClick={() => updateDetail(selection.category, option)}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </QuickQuestion>}

        {activeStep === 4 && <QuickQuestion title={uiText("언제까지 즐길까요?")} subtitle={uiText("이동과 선택한 활동의 체류 시간을 함께 고려해 코스를 찾아요.")}>
          <div className="option-grid duration-grid">
            {durationOptions.map((option) => (
              <button
                aria-pressed={condition.duration === option}
                className={`chip-button ${condition.duration === option ? 'selected' : ''}`}
                key={option}
                onClick={() => {
                  const duration = condition.duration === option ? '' : option;
                  const nextCondition = { ...condition, duration };
                  setCondition({ duration, rawText: buildHomePrompt(nextCondition) });
                }}
                type="button"
              >
                {durationOptionLabel(option)}
              </button>
            ))}
          </div>
          <label className={`duration-time-field ${condition.duration.startsWith('종료 ') ? 'selected' : ''}`}>
            <span>{uiText("종료 시간 선택")}</span>
            <input
              aria-label={uiText("종료 시간")}
              onChange={(event) => {
                const duration = event.target.value ? `종료 ${event.target.value}` : '';
                const nextCondition = { ...condition, duration };
                setCondition({ duration, rawText: buildHomePrompt(nextCondition) });
              }}
              type="time"
              value={condition.duration.startsWith('종료 ') ? condition.duration.slice(3) : ''}
            />
          </label>
          <p className="inline-message">{endTimeHint(condition.duration)}</p>
        </QuickQuestion>}

        {activeStep !== 0 && statusMessage && <p className="inline-message warning">{statusMessage}</p>}

        <div className="chat-step-footer">
          <button className="primary-result-button" disabled={!stepComplete} type="button" onClick={advance}>
            {uiText(activeStep === 4 ? '조건 확인하기' : '다음')}
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

    </div>
  );
}

interface QuickChatHeaderProps {
  activeStep: number;
  onBack: () => void;
}

function QuickChatHeader({ activeStep, onBack }: QuickChatHeaderProps) {
  const totalSteps = 5;

  return (
    <header className="chat-header">
      <button aria-label={uiText("뒤로 가기")} className="round-back" onClick={onBack} type="button">
        ‹
      </button>
      <div>
        <h1>{uiText("노피와 코스 찾기")}</h1>
        <p>{uiText("한 번에 하나씩 알려주세요")}</p>
      </div>
      <div aria-label={uiText(`진행률 ${activeStep + 1} / ${totalSteps}`)} className="progress-row">
        {Array.from({ length: totalSteps }, (_, index) => (
          <span className={index <= activeStep ? 'done' : ''} key={index} />
        ))}
        <strong>{activeStep + 1} / {totalSteps}</strong>
      </div>
    </header>
  );
}

function QuickBotMessage({ children }: { children: ReactNode }) {
  return (
    <div className="bot-row">
      <div className="avatar" aria-hidden="true">
        <img alt="" src={nopiIconImage} />
      </div>
      <div className="bot-bubble">{children}</div>
    </div>
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
  selectedPeople: string;
  selectedPlaces: MoodSelection[];
}

function ConditionEditSheet({
  condition,
  onApply,
  onClose,
  onDetectCurrentLocation,
  section,
  selectedCompanion,
  selectedPeople,
  selectedPlaces,
}: ConditionEditSheetProps) {
  const dialogRef = useDialogAccessibility<HTMLElement>(onClose);
  const [draftLocation, setDraftLocation] = useState(condition.location);
  const [draftLocationLabel, setDraftLocationLabel] = useState(condition.locationLabel || compactLocationLabel(condition.location));
  const [draftLocationSource, setDraftLocationSource] = useState<'current' | 'manual'>('manual');
  const [draftTime, setDraftTime] = useState(condition.time);
  const [draftPeople, setDraftPeople] = useState(selectedPeople);
  const [draftCompanion, setDraftCompanion] = useState(selectedCompanion);
  const [draftPlaces, setDraftPlaces] = useState<MoodSelection[]>(selectedPlaces);
  const [draftDuration, setDraftDuration] = useState(condition.duration);
  const [dateTimeSheetMode, setDateTimeSheetMode] = useState<DateTimeSheetMode | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState('');

  const chooseCurrentLocation = async () => {
    if (locationBusy) return;

    try {
      setLocationBusy(true);
      const location = await onDetectCurrentLocation();


      setDraftLocation(location.address);
      setDraftLocationLabel(location.label);
      setDraftLocationSource('current');
      setLocationError('');
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

    if (!draftPlaces.length) return;

    onApply({
      mood: composeMoods(draftPlaces),
    });
  };

  const isApplyDisabled =
    (section === 'location' && !draftLocation.trim()) ||
    (section === 'time' && !draftTime) ||
    (section === 'people' && !draftPeople) ||
    (section === 'place' && !draftPlaces.length);

  return (
    <>
      <div aria-modal="true" className="date-time-overlay" role="dialog">
        <button aria-label={uiText("조건 수정 닫기")} className="date-time-backdrop" onClick={onClose} type="button" />
        <section className="condition-edit-sheet" ref={dialogRef}>
          {section === 'location' && (
            <>
              <h2>{uiText("어디서 출발하세요?")}</h2>
              <button
                className={`edit-option ${locationBusy ? 'selected' : ''}`}
                onClick={() => void chooseCurrentLocation()}
                type="button"
              >
                <span>{uiText(locationBusy ? '현재 위치 확인 중...' : '현재 위치')}</span>
                {locationBusy && <b>›</b>}
              </button>
              <label className="edit-address-field">
                <input
                  onChange={(event) => {
                    setDraftLocation(event.target.value);
                    setDraftLocationLabel(compactLocationLabel(event.target.value));
                    setDraftLocationSource('manual');
                  }}
                  placeholder={uiText("주소 입력")}
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
              {locationError && <p className="inline-message warning" role="alert">{uiText(locationError)}</p>}
            </>
          )}

          {section === 'time' && (
            <>
              <h2>{uiText("언제 출발하시나요?")}</h2>
              <button
                aria-pressed={draftTime === '지금'}
                className={`edit-option ${draftTime === '지금' ? 'selected' : ''}`}
                onClick={() => setDraftTime((previous) => (previous === '지금' ? '' : '지금'))}
                type="button"
              >
                <span>{uiText("지금")}</span>
                {draftTime === '지금' && <b>›</b>}
              </button>
              <button
                aria-pressed={Boolean(draftTime && draftTime !== '지금')}
                className={`edit-option ${draftTime && draftTime !== '지금' ? 'selected' : ''}`}
                onClick={() => setDateTimeSheetMode('date')}
                type="button"
              >
                <span>{uiText(draftTime && draftTime !== '지금' ? draftTime : '날짜 / 시간 선택')}</span>
                {draftTime && draftTime !== '지금' && <b>›</b>}
              </button>
            </>
          )}

          {section === 'people' && (
            <>
              <h2>{uiText("누구와 함께하시나요?")}</h2>
              <div className="edit-grid four">
                {peopleOptions.map((option) => (
                  <button
                    aria-pressed={draftPeople === option}
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
              <p className="edit-subtitle">{uiText("동행 선택 (선택사항)")}</p>
              <div className="edit-grid four">
                {companionOptions.map((option) => (
                  <button
                    aria-pressed={draftCompanion === option}
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
              <h2>{uiText("오늘 뭐 하고 싶나요?")}</h2>
              <p className="edit-subtitle">{uiText("최대 ")}{MAX_PLACE_SELECTIONS}{uiText("개까지 고를 수 있어요.")}</p>
              <div className="edit-grid three">
                {placeOptions.map((place) => (
                  <button
                    aria-pressed={draftPlaces.some((selection) => selection.category === place)}
                    className={`edit-chip ${draftPlaces.some((selection) => selection.category === place) ? 'selected' : ''}`}
                    disabled={draftPlaces.length >= MAX_PLACE_SELECTIONS && !draftPlaces.some((selection) => selection.category === place)}
                    key={place}
                    onClick={() => {
                      const isSelected = draftPlaces.some((selection) => selection.category === place);
                      setDraftPlaces((previous) => (
                        isSelected
                          ? previous.filter((selection) => selection.category !== place)
                          : [...previous, { category: place, detail: '' }].slice(0, MAX_PLACE_SELECTIONS)
                      ));
                    }}
                    type="button"
                  >
                    {place}
                  </button>
                ))}
              </div>
              {draftPlaces.map((selection) => (
                <div className="purpose-detail-group" key={selection.category}>
                  <p className="edit-subtitle">{uiText(selection.category)}{uiText(" 세부 선택")}</p>
                  <div className="edit-grid cuisine">
                    {placeDetailOptions[selection.category].map((option) => (
                      <button
                        aria-pressed={selection.detail === option}
                        className={`edit-chip pill ${selection.detail === option ? 'selected' : ''}`}
                        key={option}
                        onClick={() => setDraftPlaces((previous) => previous.map((item) => (
                          item.category === selection.category
                            ? { ...item, detail: item.detail === option ? '' : option }
                            : item
                        )))}
                        type="button"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {section === 'duration' && (
            <>
              <h2>{uiText("얼마나 놀까요?")}</h2>
              <p className="edit-subtitle">{uiText("이동 시간을 포함해 즐길 시간을 선택해 주세요.")}</p>
              <div className="edit-grid four">
                {durationOptions.map((option) => (
                  <button
                    aria-pressed={draftDuration === option}
                    className={`edit-chip ${draftDuration === option ? 'selected' : ''}`}
                    key={option}
                    onClick={() => setDraftDuration((previous) => (previous === option ? '' : option))}
                    type="button"
                  >
                    {durationOptionLabel(option)}
                  </button>
                ))}
              </div>
              <label className={`duration-time-field ${draftDuration.startsWith('종료 ') ? 'selected' : ''}`}>
                <span>{uiText("종료 시간 선택")}</span>
                <input
                  aria-label={uiText("종료 시간")}
                  onChange={(event) => setDraftDuration(event.target.value ? `종료 ${event.target.value}` : '')}
                  type="time"
                  value={draftDuration.startsWith('종료 ') ? draftDuration.slice(3) : ''}
                />
              </label>
              <p className="edit-subtitle">{endTimeHint(draftDuration)}</p>
            </>
          )}

          <button className="condition-apply-button" disabled={isApplyDisabled} onClick={applyEdit} type="button">{uiText("적용하기")}</button>
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
  const dialogRef = useDialogAccessibility<HTMLElement>(onClose);
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
      <button aria-label={uiText("날짜 시간 선택 닫기")} className="date-time-backdrop" onClick={onClose} type="button" />
      <section className="date-time-sheet" ref={dialogRef}>
        <h2>{uiText("언제 출발하시나요?")}</h2>

        <div aria-label={uiText("날짜 시간 선택")} className="date-time-tabs" role="tablist">
          <button className={mode === 'date' ? 'active' : ''} onClick={() => onModeChange('date')} type="button">{uiText("날짜 선택")}</button>
          <button className={mode === 'time' ? 'active' : ''} onClick={() => onModeChange('time')} type="button">{uiText("시간 선택")}</button>
        </div>

        {mode === 'date' ? (
          <div className="calendar-panel">
            <div className="calendar-month">
              <button aria-label={uiText("이전 달")} onClick={() => moveMonth(-1)} type="button">
                ‹
              </button>
              <strong>
                {displayMonth.getFullYear()}{uiText("년 ")}{displayMonth.getMonth() + 1}{uiText("월")}</strong>
              <button aria-label={uiText("다음 달")} onClick={() => moveMonth(1)} type="button">
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
                    aria-label={uiText(`${day.getFullYear()}년 ${day.getMonth() + 1}월 ${day.getDate()}일 선택`)}
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
            <div aria-label={uiText("시간 선택")} className="time-select-groups">
              <div className="time-option-group">
                <p>{uiText("시")}</p>
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
                <p>{uiText("분")}</p>
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
          <span>{uiText("선택된 날짜 및 시간")}</span>
          <strong>{selectedDateTimeLabel}</strong>
        </div>

        <button className="date-time-confirm" onClick={() => onConfirm(selectedDateTimeLabel)} type="button">{uiText("날짜 / 시간 선택하기")}</button>
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
  const dialogRef = useDialogAccessibility<HTMLFormElement>(onClose);
  const trimmedValue = value.trim();

  return (
    <div aria-modal="true" className="date-time-overlay" role="dialog">
      <button aria-label={uiText("주소 입력 닫기")} className="date-time-backdrop" onClick={onClose} type="button" />
      <form
        className="address-sheet"
        ref={dialogRef}
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <h2>{uiText("출발지를 입력해주세요")}</h2>
        <label className="address-field">
          <span>{uiText("주소 또는 장소")}</span>
          <input
            autoFocus
            onChange={(event) => onChange(event.target.value)}
            placeholder={uiText("예: OO역, OO동")}
            type="text"
            value={value}
          />
        </label>
        <div className="address-sheet-actions">
          <button className="address-cancel-button" onClick={onClose} type="button">{uiText("취소")}</button>
          <button className="date-time-confirm" disabled={!trimmedValue} type="submit">{uiText("주소 선택하기")}</button>
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
      <h2>{uiText(title)}</h2>
      {subtitle && <p className="question-subtitle">{uiText(subtitle)}</p>}
      {children}
    </section>
  );
}

export function ConditionConfirm() {
  return useDesktop() ? <DesktopConditionConfirm /> : <MobilePlannerWizard review DateSheet={DateTimeSheet} AddressSheet={AddressInputSheet} />;
}

function DesktopConditionConfirm() {
  const navigate = useNavigate();
  const { condition, detectCurrentLocation, locationStatus, runSearch, searchError, setCondition } = usePlanner();
  const [editSection, setEditSection] = useState<ConditionEditSection | null>(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [accuracyError, setAccuracyError] = useState('');
  const didTrackView = useRef(false);
  const locationText = displayLocationLabel(condition);
  const locationValue = condition.location ? locationText : '';
  const selectedPeople = peopleOptions.find((option) => condition.companion.includes(option)) || '';
  const selectedCompanion = companionOptions.find((option) => condition.companion.includes(option)) || '';
  const selectedPlaces = getMoodSelections(condition.mood);
  const mainCategoryLabel = categoryLabelFromKey(condition.mainCategory) || selectedPlaces[0]?.category || '';
  const supportingCategoryLabels = (condition.supportingCategories.length
    ? condition.supportingCategories.map(categoryLabelFromKey)
    : selectedPlaces.slice(1).map((selection) => selection.category))
    .filter(Boolean);
  const coreIntentOptions = getCoreIntentOptions(condition.mainCategory);
  const shouldAskCoreIntent = needsCoreIntentQuestion(
    condition.mainCategory,
    condition.coreIntent,
    condition.coreIntentSkipped,
  );
  const firstMissingSection: ConditionEditSection | null = !condition.location
    ? 'location'
    : !condition.time
      ? 'time'
      : !selectedPeople
        ? 'people'
        : !selectedPlaces.length
          ? 'place'
          : !condition.duration ? 'duration' : null;
  const conditionRows = [
    { id: 'location' as const, label: '출발지', value: locationValue },
    { id: 'time' as const, label: '시간', value: condition.time },
    { id: 'people' as const, label: '동행', value: condition.companion },
    {
      id: 'place' as const,
      label: '목적',
      value: [mainCategoryLabel, ...supportingCategoryLabels].filter(Boolean).join(' · '),
    },
    { id: 'duration' as const, label: '이용 시간', value: condition.duration || '자동 추천' },
  ];

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
    const categoryPatch = conditionPatch.mood !== undefined
      ? makeCategoryPreferencePatch(getMoodSelections(conditionPatch.mood), condition)
      : {};
    const nextCondition = { ...condition, ...conditionPatch, ...categoryPatch };

    setCondition({ ...conditionPatch, ...categoryPatch, rawText: buildHomePrompt(nextCondition) });
    void trackPlannerEvent('condition_edit', {
      field: Object.keys(conditionPatch)[0] || editSection || 'unknown',
    }, nextCondition).catch(() => undefined);
    setEditSection(null);
  };

  useEffect(() => {
    if (didTrackView.current) return;
    didTrackView.current = true;
    void trackPlannerEvent('condition_confirm_view', undefined, condition).catch(() => undefined);
  }, [condition]);

  const startSearch = async () => {
    if (firstMissingSection) {
      setEditSection(firstMissingSection);
      return;
    }
    const missing = accuracyMissing(condition);
    if (missing) {
      setAccuracyError(missing);
      document.querySelector('.accuracy-preferences')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setAccuracyError('');
    const searchCondition = shouldAskCoreIntent
      ? {
          ...condition,
          coreIntent: '',
          coreIntentExplicit: false,
          coreIntentSkipped: true,
        }
      : condition;
    if (shouldAskCoreIntent) {
      setCondition({
        coreIntent: '',
        coreIntentExplicit: false,
        coreIntentSkipped: true,
      });
    }
    navigate(ROUTES.plannerSearching);
    const [searchSucceeded] = await Promise.all([
      runSearch(searchCondition),
      new Promise((resolve) => {
        window.setTimeout(resolve, 1200);
      }),
    ]);
    if (searchSucceeded) navigate(ROUTES.plannerResult, { replace: true });
  };

  const retryCurrentLocation = async () => {
    try {
      await detectCurrentLocation();
      setLocationMessage('현재 위치를 새로 반영했어요.');
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : '현재 위치를 다시 확인하지 못했어요.');
    }
  };

  return (
    <div className="condition-confirm-screen non-home-screen">
      <AppTopBar title={uiText("조건 확인")} subtitle={uiText("Nopi가 이해한 내용을 다듬어줘")} />
      {/전시|영화|공연|팝업|미술관|박물관|문화/.test(condition.rawText)&&<p className="inline-message">{uiText("문화·전시는 별도로 둘러볼 수 있어요. ")}<Link to={ROUTES.events}>{uiText("문화·행사 보러 가기 →")}</Link></p>}
      <NopiBubble title={uiText("마지막으로 조건을 확인해줘.")} body="바꾸고 싶은 항목만 누르면 돼." />
      {firstMissingSection && <p className="inline-message warning">{uiText("필수 조건이 비어 있어요. 표시된 항목을 먼저 선택해 주세요.")}</p>}

      <section className="screen-section">
        <h2>{uiText("정리된 조건")}</h2>
        <div className="condition-summary-list">
          {conditionRows.map((row) => (
            <div className="condition-row-group" key={row.id}>
              <ConditionCard
                color={row.id === firstMissingSection ? '#cf4d5b' : '#5b5ce2'}
                label={uiText(row.label)}
                onClick={() => setEditSection(row.id)}
                value={row.value}
              />
              {row.id === 'location' && (
                <div className="condition-location-retry">
                  <span>{uiText("현재 위치가 정확하지 않나요?")}</span>
                  <button className="location-refresh-button" type="button" onClick={() => void retryCurrentLocation()}>
                    {uiText(locationStatus === 'locating' ? '위치 확인 중' : '현재 위치 다시 잡기')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        {locationMessage && <p className={`inline-message ${condition.location ? '' : 'warning'}`} role="status">{locationMessage}</p>}
      </section>

      {shouldAskCoreIntent && (
        <section className="screen-section core-intent-question" aria-labelledby="core-intent-title">
          <span className="core-intent-eyebrow">{uiText("선택하면 더 잘 맞춰드려요")}</span>
          <h2 id="core-intent-title">
            {uiText(mainCategoryLabel === '카페/디저트'
              ? '카페에서 가장 하고 싶은 것은 무엇인가요?'
              : `${mainCategoryLabel}에서 가장 중요한 것은 무엇인가요?`)}
          </h2>
          <p>{uiText("선택사항이에요. 맞는 장소를 우선 추천하며, 태그 정보가 부족해도 다른 조건에 맞는 장소를 찾아요.")}</p>
          <div className="chip-row core-intent-options">
            {coreIntentOptions.map((option) => (
              <Chip
                active={condition.coreIntent === option.key}
                key={option.key}
                onClick={() => setCondition({
                  coreIntent: option.key,
                  coreIntentExplicit: true,
                  coreIntentSkipped: false,
                })}
              >
                {uiText(option.label)}
              </Chip>
            ))}
            <Chip
              active={condition.coreIntentSkipped}
              onClick={() => setCondition({
                coreIntent: '',
                coreIntentExplicit: false,
                coreIntentSkipped: true,
              })}
            >{uiText("아무거나")}</Chip>
          </div>
        </section>
      )}

      <AccuracyPreferences condition={condition} onChange={accuracy => { setCondition({ accuracy }); setAccuracyError(''); }} />
      {accuracyError && <p className="inline-message warning" role="alert">{accuracyError}</p>}
      <section className="screen-section">
        <h2>{uiText("더 맞춰볼까요?")}</h2>
        <div className="chip-row">
          {tuningOptions.map((option) => (
            <Chip
              active={condition.extras.includes(option)}
              key={option}
              onClick={() => {
                const exists = condition.extras.includes(option);
                const extras = exists
                  ? condition.extras.filter((item) => item !== option)
                  : [...condition.extras, option];
                setCondition({ extras });
                void trackPlannerEvent('condition_edit', { field: 'extras' }, { ...condition, extras }).catch(() => undefined);
              }}
            >
              {option}
            </Chip>
          ))}
        </div>
      </section>

      {searchError && <p className="inline-message warning">{uiText("이전 검색: ")}{searchError}</p>}

      <button className="primary-bottom-button condition-search-button" type="button" onClick={startSearch}>{uiText("이 조건으로 코스 찾기")}</button>

      {editSection && (
        <ConditionEditSheet
          condition={condition}
          onApply={applyConditionEdit}
          onClose={() => setEditSection(null)}
          onDetectCurrentLocation={detectCurrentLocation}
          section={editSection}
          selectedCompanion={selectedCompanion}
          selectedPeople={selectedPeople}
          selectedPlaces={selectedPlaces}
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
      aria-label={uiText(`${label} ${isEmpty ? '추가하기' : '수정하기'}`)}
      className={`condition-card ${className} ${isEmpty ? 'empty' : ''}`}
      onClick={onClick}
      type="button"
    >
      <span style={{ background: color }} />
      <small style={{ color }}>{uiText(label)}</small>
      <strong>{displayValue}</strong>
      <b aria-hidden="true">›</b>
    </button>
  );
}

function PriceUnknownCandidates({places}: {places: CoursePlan['priceUnknownPlaces']}) {
  if(!places?.length)return null;
  return <details className="candidate-disclosure">
    <summary>{uiText("가격 확인이 필요한 후보 ")}<span>{places.length}{uiText("곳")}</span></summary>
    <p>{uiText("아래 장소는 예산을 계산할 수 없어 추천 코스에서 제외했어요. 영업시간과 동선도 최종 확인되지 않았어요.")}</p>
    {places.map((place,index)=><p key={`${place.catalogPlaceId}-${index}`}><strong>{place.name}</strong> · {place.basis}</p>)}
  </details>;
}

function UnverifiedCandidates({places}: {places: CoursePlan['unverifiedPlaces']}) {
  if(!places?.length)return null;
  return <details className="candidate-disclosure">
    <summary>{uiText("영업·경로 확인이 필요한 후보 ")}<span>{places.length}{uiText("곳")}</span></summary>
    <p>{uiText("아래 장소는 확인된 추천과 구분해 표시해요. 이 목록만으로 영업 중이거나 코스 전체 조건을 충족한다고 볼 수는 없어요.")}</p>
    {places.map((p,i)=><p key={`${p.catalogPlaceId}-${i}`}><strong>{p.name}</strong> · {p.basis}</p>)}
  </details>;
}

export function SearchingScreen() {
  const navigate = useNavigate();
  const { condition, plan, isSearching, searchProgress, runSearch, searchError } = usePlanner();
  const [searchTakingLong, setSearchTakingLong] = useState(false);
  const locationText = condition.location ? displayLocationLabel(condition) : '출발지 미입력';
  const searchSteps = useMemo(
    () =>
      [
        {
          detail: '인원·예산·제외 메뉴를 확인하고 있어요.',
          label: '기본 조건',
          nopi: '오늘의 조건부터 확인할게.',
          value: condition.companion || '동행 미입력',
        },
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
          value: condition.time || '출발 시간 미입력',
        },
        {
          detail: `${condition.mood || '취향'} 관련 메뉴, 리뷰, 분위기 확인 중`,
          label: '장소 후보',
          nopi: `${condition.mood || '취향'} 느낌에 맞는 곳만 남겨볼게.`,
          value: condition.mood || '활동 미입력',
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
  const progressStep = ({'request-received':0,'preferences-normalized':1,'location-resolved':2,'time-window-resolved':3,'candidates-ready':4,'verification-started':4,'verifying-places':4,'verification-finished':4,'walking-route-diagnostics':4,'walking-routes-finished':4,'complete':5} as Record<string,number>)[searchProgress?.stage || 'request-received'] ?? 4;
  const verificationText = searchProgress?.examined != null
    ? `${searchProgress.examined}개 조합 확인 · ${searchProgress.verified || 0}개 코스 검증 완료`
    : searchProgress?.checked != null ? `활동별 영업정보 ${searchProgress.checked}${searchProgress.total ? ` / ${searchProgress.total}` : ''}건 확인 중` : '실제 이동 경로와 방문 시간·전체 예산을 확인하고 있어요.';
  useEffect(() => {
    if (!isSearching && !searchError) navigate(ROUTES.plannerCondition, {replace:true});
  }, [isSearching,searchError,navigate]);

  useEffect(() => {
    if(!isSearching)return;
    const delayedTimer = window.setTimeout(() => setSearchTakingLong(true), 8000);
    return () => window.clearTimeout(delayedTimer);
  }, [isSearching]);

  const retrySearch = async () => {
    setSearchTakingLong(false);
    const succeeded = await runSearch();
    if (succeeded) navigate(ROUTES.plannerResult, { replace: true });
  };

  const searchFailed = Boolean(searchError && !isSearching);

  return (
    <div className="searching-screen non-home-screen">
      <AppTopBar title={uiText(searchFailed ? "조건 확인이 필요해요" : "코스 찾는 중")} subtitle={uiText(searchFailed ? "아래 실패 이유를 확인해 주세요" : "조건에 맞는 장소를 고르고 있어")} />
      <NopiBubble title={uiText(searchFailed ? "코스를 찾지 못했어." : searchSteps[Math.min(progressStep,4)].nopi)} body={searchFailed ? searchError : progressStep===4 ? verificationText : searchSteps[Math.min(progressStep,4)].detail} />
      <p className="search-live-status" role="status" aria-live="polite">
        {uiText(searchFailed
          ? '조건에 맞는 코스를 완성하지 못했어요.'
          : progressStep===5 ? '코스 검증이 완료됐어요.' : `${searchSteps[progressStep].label} 확인 중 · ${progressStep + 1} / 5`)}
      </p>

      {searchTakingLong && isSearching && (
        <p className="inline-message warning">{uiText("평소보다 확인이 길어지고 있어요. 영업시간과 위치 정보를 조금 더 살펴보고 있어요.")}</p>
      )}

      <section className="reading-card">
        <strong>{uiText("요청한 조건")}</strong>
        {condition.accuracy?.budgetPerPerson != null && <p className="inline-message">
          {uiText(condition.accuracy.budgetPerPerson != null && (condition.accuracy.budgetPerPerson === 0 ? '예산 제한 없음' : `1인 ${condition.accuracy.budgetPerPerson.toLocaleString()}원`))}
          {uiText(/술/.test(condition.mood) && ` · ${{any:'주류 무관',soju:'소주',beer:'맥주',wine:'와인',cocktail:'칵테일·하이볼'}[condition.accuracy.alcoholPreference || 'any']} ${condition.accuracy.drinkServings ?? 2}주문단위`)}
          {uiText(Boolean(condition.accuracy.excludedDetails?.length) && ` · 제외: ${condition.accuracy.excludedDetails?.join(', ')}`)}
          {uiText(condition.extras.includes('도보 짧게') && ' · 도보 짧게')}
        </p>}
        <div className="condition-check-row">
          {[locationText,condition.time,condition.companion,condition.mood].map((value, index) => (
            <span
              className={`condition-check-chip ${progressStep > [1,2,0,3][index] ? 'done' : ''}`}
              key={index}
            >
              <b>{progressStep > [1,2,0,3][index] ? '✓' : index + 1}</b>
              {uiText(value)}
            </span>
          ))}
        </div>
      </section>

      <section className="screen-section">
        <h2>{uiText(searchFailed ? '요청 내용' : '이 조건으로 확인 중이에요')}</h2>
        <div className="search-check-list">
          {searchSteps.map((step, index) => (
            <article
              className={`search-check-item ${index<progressStep?'done':index===progressStep&&!searchFailed?'active':''}`}
              aria-current={index===progressStep&&!searchFailed?'step':undefined}
              key={step.label}
            >
              <span>{index<progressStep?'✓':index + 1}</span>
              <div>
                <strong>{uiText(step.label)}</strong>
                <p>{uiText(step.label==='코스' ? (searchFailed?'코스 검증을 완료하지 못했어요.':verificationText) : index===progressStep ? step.detail : step.value)}</p>
              </div>
            </article>
          ))}
        </div>
        {!searchFailed && <div className="loading-dots">
          <span />
          <span />
          <span />
        </div>}
      </section>

      {searchFailed ? (
        <section className="search-failure-card" role="alert">
          <span>{uiText(plan.constraintFailureCode==='walking_service_rate_limited'?'경로 서비스 호출 한도':'검색 실패')}</span>
          <h2>{uiText(plan.constraintFailureCode==='walking_service_rate_limited'?'도보 경로 확인이 일시 중단됐어요':'이번 조건으로 코스를 완성하지 못했어요')}</h2>
          <p>{searchError}</p>
          {plan.constraintFailureCode!=='walking_service_rate_limited' && <>
            <PriceUnknownCandidates places={plan.priceUnknownPlaces}/>
            <UnverifiedCandidates places={plan.unverifiedPlaces}/>
          </>}
          {plan.requestedWindow && <p>{uiText("계산한 일정: ")}{new Date(plan.requestedWindow.startAt).toLocaleString('ko-KR', {timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit'})} → {new Date(plan.requestedWindow.endAt).toLocaleString('ko-KR', {timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit'})} · {plan.requestedWindow.availableMinutes}{uiText("분")}</p>}
          <div>
            <button type="button" onClick={() => navigate(ROUTES.plannerCondition, { replace: true })}>{uiText("조건 수정")}</button>
            <button className="primary" type="button" onClick={() => void retrySearch()}>{uiText(plan.constraintFailureCode==='walking_service_rate_limited'?'경로 서비스 다시 확인':'같은 조건으로 다시 찾기')}</button>
          </div>
        </section>
      ) : (
        <section className="screen-section">
          <h2>{uiText("곧 추천 코스가 나와요")}</h2>
          <SkeletonCard />
          <SkeletonCard />
        </section>
      )}
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
  const { condition, plan, runSearch, selectCurrentPlan, selectPlanOption, setCondition, applyReorderedPlan } = usePlanner();
  const feedbackStorageKey = `noplanMvpFeedback:${plan.searchCourseId || plan.algorithmVersion || 'current'}:${plan.selectedOptionId || 'default'}`;
  const [saveMessage, setSaveMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [feedbackScore, setFeedbackScore] = useState(0);
  const [feedbackConcern, setFeedbackConcern] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(() => sessionStorage.getItem(feedbackStorageKey) === 'submitted');
  const didTrackResult = useRef(false);
  const saveInFlight = useRef(false);
  const reorderRequest = useRef<AbortController | null>(null);
  const [reordering,setReordering] = useState(false);
  const [reorderMessage,setReorderMessage] = useState('');
  useEffect(()=>()=>{reorderRequest.current?.abort();},[]);
  const changeOrder = async (from:number,to:number) => {
    if (reorderRequest.current || saveInFlight.current) return;
    const controller=new AbortController();
    reorderRequest.current=controller;
    const timeout=window.setTimeout(()=>controller.abort(),45000);
    setReordering(true);setReorderMessage('새 동선과 방문 시간을 확인하고 있어요.');
    try {
      const next=await reorderPlan(plan,from,to,controller.signal);
      if (controller.signal.aborted) return;
      applyReorderedPlan(next,plan);
      setSaveStatus('idle');setSaveMessage('');setFeedbackScore(0);setFeedbackConcern('');setFeedbackSubmitted(false);
      setReorderMessage('순서를 변경했어요. 이동 시간과 예상 종료 시간도 반영했어요.');
    } catch (error) {
      setReorderMessage(error instanceof Error && error.name!=='AbortError' ? error.message : '확인이 지연되어 기존 순서를 유지했어요. 다시 시도해 주세요.');
    } finally {
      window.clearTimeout(timeout);reorderRequest.current=null;setReordering(false);
    }
  };
  const stopDrag=useStopDrag(plan.courseData.length,reordering || saveStatus==='saving', (from,to)=>void changeOrder(from,to));
  const locationText = displayLocationLabel(condition);
  const hasCourse = plan.source !== 'fallback' && plan.courseData.length > 0;
  const crowding = plan.courseData.find((place) => place.crowding)?.crowding;
  const walkingMinutes = plan.courseOptions?.find(option => option.id === plan.selectedOptionId)?.ranking.walkingMinutes;
  const failureContent = plan.failureReason === 'no_candidates'
    ? {
        badge: '장소 부족',
        title: '주변에 승인된 장소가 없어요',
        body: '현재 위치 근처에서 추천할 수 있는 등록 장소를 찾지 못했습니다.',
      }
    : plan.failureReason === 'verification_failed'
      ? {
          badge: '검증 실패',
          title: '장소는 찾았지만 지금 추천하기 어려워요',
          body: '현재 영업 중이면서 평점과 리뷰 기준을 통과한 장소를 확인하지 못했습니다.',
        }
      : plan.failureReason === 'unsupported_region'
        ? {
            badge: '미지원 지역',
            title: '아직 추천하지 않는 지역이에요',
            body: '현재 지원하는 지역 안에서 출발지를 선택해 주세요.',
          }
        : {
            badge: '연결 오류',
            title: '추천 서버에서 결과를 받지 못했어요',
            body: '잠시 후 같은 조건으로 다시 시도해 주세요.',
          };

  useEffect(() => {
    if (didTrackResult.current) return;
    didTrackResult.current = true;
    void trackPlannerEvent('result_view', {
      courseCount: plan.courseData.length,
      catalogOnly: Boolean(plan.catalogOnly),
    }, condition, {
      courseId: plan.searchCourseId,
      algorithmVersion: plan.algorithmVersion,
    }).catch(() => undefined);
  }, [condition, plan]);

  const handleSave = async () => {
    if (saveInFlight.current || reorderRequest.current || saveStatus === 'saved') return;
    saveInFlight.current = true;
    setSaveStatus('saving');
    setSaveMessage('코스를 저장하고 있어요.');

    try {
      const result = await saveCourse(plan.title, plan.location, plan.courseData);
      if (!result.success) throw new Error(result.message || '저장 결과를 확인해 주세요.');
      setSaveStatus('saved');
      setSaveMessage(result.alreadySaved ? '이미 저장된 코스예요.' : '코스를 저장했어요. 마이에서 확인할 수 있어요.');
    } catch (error) {
      setSaveStatus('error');
      setSaveMessage(error instanceof Error ? error.message : '저장하지 못했어요.');
    } finally {
      saveInFlight.current = false;
    }
  };

  const submitFeedback = async () => {
    if (!feedbackScore || feedbackSubmitted) return;
    await trackMvpFeedback(plan, feedbackScore, feedbackConcern);
    sessionStorage.setItem(feedbackStorageKey, 'submitted');
    setFeedbackSubmitted(true);
  };

  const retrySearch = async (widen = false) => {
    if (widen) setCondition({ extras: [] });
    navigate(ROUTES.plannerSearching);
    const succeeded = await runSearch();
    if (succeeded) navigate(ROUTES.plannerResult, { replace: true });
  };

  return (
    <div className="result-screen non-home-screen">
      <AppTopBar title={uiText("추천 코스")} subtitle={uiText(`${locationText} · ${condition.time} · ${condition.companion} · ${condition.mood}`)} />
      {hasCourse && (
        <NopiBubble
          title={uiText(plan.adjustmentNotice
            ? '코스를 이렇게 조정했어.'
            : plan.partial ? '확인된 장소까지만 골랐어.' : '선택한 활동을 모두 담았어.')}
          body={plan.adjustmentNotice
            || (plan.partial ? '검증되지 않은 일정은 빼고, 바로 갈 수 있는 장소만 남겼어.' : '이동 거리와 영업시간, 선택한 목적을 함께 확인했어.')}
          compact
        />
      )}
      {hasCourse && plan.partial && !plan.adjustmentNotice && <p className="inline-message warning">{uiText("일부 조건을 통과한 장소가 부족해 확인된 일정만 보여드려요.")}</p>}

      {hasCourse && plan.courseOptions && <section className="screen-section course-options" aria-label={uiText("추천 코스 비교")}>
        <div className="result-section-heading"><div><span className="result-eyebrow">{uiText("나에게 맞는 하루")}</span><h2>{uiText("어떤 코스로 떠날까요?")}</h2></div><span className="result-count">{plan.courseOptions.length}{uiText("개 코스")}</span></div>
        <p className="result-intro">{uiText("마음에 드는 코스를 선택하면 아래에서 일정을 볼 수 있어요.")}</p>
        {plan.courseOptions.length<3 && plan.comparison?.hoursUnknown && <p>{uiText("영업시간을 확인하지 못해 제외한 후보가 있어요. 미확인 장소를 포함하려면 조건 수정에서 허용할 수 있어요.")}</p>}
        <CourseOptionCards options={plan.courseOptions} selectedId={plan.selectedOptionId} disabled={reordering || saveStatus==='saving'} onSelect={id=>{
          if(plan.selectedOptionId===id)return;
          selectPlanOption(id);setReorderMessage('');setSaveStatus('idle');setSaveMessage('');setFeedbackScore(0);setFeedbackConcern('');setFeedbackSubmitted(false);
        }}/>
        <details className="result-disclosure"><summary>{uiText("코스는 어떻게 골랐나요?")}</summary><p>{plan.comparison?.examinedCourses ?? plan.courseOptions.length}{uiText("개 조합을 확인했어요. ")}{plan.courseOptions[0]?.ranking.basis}{uiText(" 기준으로 비교했으며 일부 장소는 겹칠 수 있어요. ")}{uiText(plan.comparison?.limited ? '확인 한도 내에서 비교한 결과예요.' : '')}</p></details>
      </section>}

      {hasCourse && !plan.courseOptions?.length ? (
        <article className="result-card">
          <span className="rank-pill">{uiText(plan.partial ? '부분 추천' : '선택한 코스')}</span>
          <h1>{uiText(plan.title)}</h1>
          <p>{plan.durationText}</p>
          {plan.accuracySummary && <div className="accuracy-result">
            <span>{uiText("1인 예상 비용")}</span>
            <strong className="result-total">{uiText(plan.accuracySummary.costKnown
              ? `${plan.accuracySummary.estimatedMin?.toLocaleString()}~${plan.accuracySummary.estimatedMax?.toLocaleString()}원`
              : '가격 확인 필요')}</strong>
            <div className="result-facts"><span>{uiText("활동 ")}{plan.accuracySummary.fulfilledCount}/{plan.accuracySummary.requiredCount}{uiText(" 포함")}</span>{walkingMinutes != null && <span>{uiText("총 도보 약 ")}{walkingMinutes}{uiText("분")}</span>}</div>
            <details className="result-disclosure"><summary>{uiText("예상 비용·방문 전 확인사항")}</summary>
              <p>{uiText("메뉴 가격과 선택한 주문량으로 계산한 예상 비용이에요.")}</p>
              {plan.accuracySummary.warnings.map(warning => <p key={warning}>{warning}</p>)}
            </details>
          </div>}
          {crowding && <CrowdingStatus snapshot={crowding} compact/>}
        </article>
      ) : !hasCourse ? (
        <article className="result-card">
          <span className="rank-pill">{failureContent.badge}</span>
          <h1>{uiText(failureContent.title)}</h1>
          <p>{failureContent.body}</p>
        </article>
      ) : null}

      {hasCourse && (
        <section className="screen-section result-itinerary">
          <div className="result-section-heading"><div><span className="result-eyebrow">{uiText("선택한 코스 · ")}{plan.durationText}</span><h2>{uiText("오늘의 일정")}</h2></div><span>{plan.courseData.length}{uiText("곳")}</span></div>
          {Boolean(plan.courseOptions?.length) && <div className="itinerary-overview" aria-live="polite">
            <span>{uiText(plan.title)}</span>
            {plan.accuracySummary && <details className="result-disclosure"><summary>{uiText("예상 비용·방문 전 확인사항")}</summary>
              <p>{uiText("선택한 활동 ")}{plan.accuracySummary.fulfilledCount}/{plan.accuracySummary.requiredCount}{uiText(" 포함 · 메뉴 가격과 주문량 기준 예상 비용이에요.")}</p>
              {plan.accuracySummary.warnings.map(warning=><p key={warning}>{warning}</p>)}
            </details>}
            {crowding && <CrowdingStatus snapshot={crowding} compact/>}
          </div>}
          {plan.courseData.length>1 && <p className="reorder-help" id="course-reorder-help">{uiText('번호를 잡아 끌면 방문 순서를 바꿀 수 있어요.')}</p>}
          <p className="reorder-status" role="status" aria-live="polite">{uiText(reorderMessage || (stopDrag.preview && stopDrag.preview.to>=0 && stopDrag.preview.from!==stopDrag.preview.to ? `${stopDrag.preview.to+1}번째 위치에 놓기` : ''))}</p>
          <div className="result-place-list" ref={stopDrag.listRef} aria-busy={reordering}>
            {plan.courseData.map((place, index) => (
              <article data-stop-index={index} className={`result-stop${stopDrag.preview?.from===index?' is-dragging':''}${stopDrag.preview?.to===index && stopDrag.preview.from!==index?' is-drop-target':''}`} key={`${plan.selectedOptionId}-${place.id}`}>
                <div className="stop-transfer"><button className="stop-number stop-drag-handle" {...stopDrag.handleProps(index,place.name)}>{index+1}<span aria-hidden="true">⠿</span></button><div>
                  <strong className="stop-clock">{uiText(place.scheduledStart ? new Date(place.scheduledStart).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'numeric',minute:'2-digit'}) : place.time || `${index+1}번째 장소`)}</strong>
                  <span>{uiText(index===0 ? '출발지에서' : '이전 장소에서')} · {uiText(place.moveText || '이동 정보 확인')}</span>
                </div></div>
                <div className="stop-card">
                  <button className="stop-open" type="button" disabled={reordering} aria-label={uiText(`${place.name} 상세 보기`)} onClick={() => {
                    if (selectCurrentPlan()) navigate(coursePlaceRoute(index));
                  }}>
                    <PlaceVisual alt={place.name} color={place.color} imageUrl={place.imageUrl} type={place.type} detailType={place.detailType} />
                    <div className="result-place-copy">
                      <small className="stop-category">{uiText(place.mealRole === 'dinner' ? '저녁 식사·반주' : {food:'맛집',cafe:'카페',hotplace:'산책·구경',drink:'술집',activity:'놀거리'}[place.type] || place.detailType || '장소')}{uiText(place.autoAdded ? ' · 추가 일정' : '')}</small>
                      <strong>{place.searchKeyword || place.title || place.name}</strong>
                      {place.durationMinutes ? <small>{uiText("약 ")}{Math.max(1, Math.floor(place.durationMinutes))}{uiText("분 머물기")}</small> : null}
                      <span className={`stop-status ${place.businessStatus==='open'?'is-open':''}`}>{uiText(place.businessStatus==='open'?'방문 시간 영업 확인':place.businessStatus==='closed'?'영업 종료':'영업시간 확인 필요')}</span>
                    </div>
                    <span className="stop-arrow" aria-hidden="true">›</span>
                  </button>
                  {place.businessStatus !== 'open' && place.businessStatus !== 'closed' && <p className="stop-hours-warning"><NopiCheckNote>{uiText("영업시간 미확인 · 방문 전 확인해 주세요.")}<a href={kakaoPlaceUrl(place)} target="_blank" rel="noopener noreferrer">{uiText("카카오맵에서 영업시간 확인 ↗")}</a></NopiCheckNote>
                  </p>}
                  {place.estimatedCost && <p className="stop-price"><span>{uiText("1인 예상")}</span><strong>{uiText(place.estimatedCost.status==='estimated' ? place.estimatedCost.min===place.estimatedCost.max ? `${place.estimatedCost.min?.toLocaleString()}원` : `${place.estimatedCost.min?.toLocaleString()}~${place.estimatedCost.max?.toLocaleString()}원` : '가격 확인 필요')}</strong></p>}
                  {place.type !== 'hotplace' && (place.catalogRating != null || place.catalogReviewCount != null) && <p className="stop-rating">{place.catalogRating != null && <>★ {place.catalogRating.toFixed(1)} </>}<span>{place.catalogReviewCount != null && <>{uiText("리뷰 ")}{place.catalogReviewCount.toLocaleString('ko-KR')} · </>}{uiText("노플랜 수집 정보")}</span></p>}
                  <CrowdingStatus compact snapshot={place.crowding}/>
                  {(Boolean(place.estimatedCost?.menuExamples?.length) || Boolean(place.estimatedCost?.assumptions?.length)) && <details className="result-disclosure stop-evidence"><summary>{uiText("예산 기준 메뉴·가격 가정")}</summary>
                    {Boolean(place.estimatedCost?.menuExamples?.length) && <p>{place.estimatedCost?.menuExamples?.slice(0,3).join(' · ')}</p>}
                    {place.estimatedCost?.assumptions?.map(text=><p key={text}>{text}</p>)}
                  </details>}
                </div>
              </article>
            ))}
          </div>
          {plan.courseData.some((place) => place.walkingRouteSource === 'google_routes') && (
            <p className="walking-route-notice">{uiText("Google Maps 도보 경로 기준이며 실제 보행 환경과 다를 수 있어요.")}</p>
          )}
          {plan.courseData.some((place) => place.walkingRouteSource === 'tmap_pedestrian') && (
            <p className="walking-route-notice">{uiText("TMAP 도보 경로 기준이며 실제 보행 환경과 다를 수 있어요.")}</p>
          )}
        </section>
      )}

      {hasCourse && <CourseNearbyEvents places={plan.courseData}/>}
      <PriceUnknownCandidates places={plan.priceUnknownPlaces}/>
      <UnverifiedCandidates places={plan.unverifiedPlaces}/>
      {hasCourse && (
        <details className="mvp-feedback-panel result-feedback">
          <summary>{uiText("이 코스, 마음에 드나요? ")}<span>{uiText("의견 남기기")}</span></summary>
          <p className="feedback-question">{uiText("이 코스로 나가보고 싶은 정도를 골라주세요.")}</p>
          {feedbackSubmitted ? (
            <p>{uiText("고마워요. 다음 추천을 다듬는 데 반영할게요.")}</p>
          ) : (
            <>
              <div className="feedback-score" aria-label={uiText("외출 의향 점수")}>
                {[1, 2, 3, 4, 5].map((score) => <button className={feedbackScore === score ? 'active' : ''} aria-pressed={feedbackScore===score} aria-label={uiText(`${score}점`)} key={score} type="button" onClick={() => setFeedbackScore(score)}>{score}</button>)}
              </div>
              <label>{uiText("가장 불편하거나 못 믿겠던 부분")}<select value={feedbackConcern} onChange={(event) => setFeedbackConcern(event.target.value)}>
                  <option value="">{uiText("선택하지 않음")}</option>
                  <option value="place_fit">{uiText("장소가 조건과 안 맞음")}</option>
                  <option value="route">{uiText("동선이 불편함")}</option>
                  <option value="hours">{uiText("영업시간이 불안함")}</option>
                  <option value="trust">{uiText("추천 근거가 부족함")}</option>
                  <option value="choice">{uiText("선택지가 부족함")}</option>
                </select>
              </label>
              <button className="feedback-submit" disabled={!feedbackScore} type="button" onClick={() => void submitFeedback()}>{uiText("피드백 보내기")}</button>
            </>
          )}
        </details>
      )}

      {hasCourse && <fieldset className="m-mobile-only m-result-save reorder-save" disabled={reordering}><FavoriteButton item={planFavorite(plan)}/></fieldset>}
      <div className="sticky-actions result-actions">
        {saveMessage && (
          <p className={`result-save-message ${saveStatus === 'error' ? 'error' : ''}`} role={saveStatus === 'error' ? 'alert' : 'status'}>
            {saveMessage}
          </p>
        )}
        {hasCourse ? (
          <>
            {plan.partial ? (
              <button type="button" disabled={reordering} onClick={() => void retrySearch(true)}>{uiText("범위를 넓혀 다시 찾기")}</button>
            ) : (
              <button className="m-desktop-only" disabled={reordering || saveStatus === 'saving' || saveStatus === 'saved'} type="button" onClick={() => void handleSave()}>
                {uiText(saveStatus === 'saving' ? '저장 중' : saveStatus === 'saved' ? '저장됨' : '저장')}
              </button>
            )}
            <button className="primary" type="button" disabled={reordering} onClick={() => {
              if (selectCurrentPlan()) navigate(ROUTES.courseMap);
            }}>{uiText("이 코스로 출발")}</button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => navigate(ROUTES.plannerCondition)}>{uiText("조건 수정")}</button>
            <button className="primary" type="button" onClick={() => void retrySearch()}>{uiText("같은 조건으로 다시 찾기")}</button>
          </>
        )}
      </div>
    </div>
  );
}
