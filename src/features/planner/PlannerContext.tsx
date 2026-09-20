import { inferNamedTextLocation, resolveTextLocation } from './textLocation';
import { isCourseRecommendationPlace } from './recommendationPolicy';
import { savedAccuracyPreferences, accuracyMissing } from './accuracyModel';
import { readPlannerDraft, savePlannerDraft, missingPlannerCondition } from './plannerDraft';
import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { extractDongFromText } from '../../utils/location';
import { createLocationResolver } from './locationCache';
import { generateCourse, makeFallbackPlan, parsePlannerCondition, trackPlannerEvent, trackRecommendationImpressions } from '../../api/plannerApi';
import type { CoursePlan, CurrentPosition, PlannerCondition } from '../../types/noplan';
import type { CourseProgress } from '../../api/courseRequest';
import {
  categoryLabelFromKey,
  inferAtmosphereTags,
  inferCoreIntentFromText,
  inferMainCategoryFromText,
  normalizeCoreIntent,
} from './plannerIntents';

interface KakaoGeocodeResult {
  address?: {
    address_name?: string;
    region_2depth_name?: string;
    region_3depth_name?: string;
  };
  road_address?: {
    address_name?: string;
    region_2depth_name?: string;
    road_name?: string;
  };
}

interface KakaoGeocoder {
  coord2Address: (
    lng: number,
    lat: number,
    callback: (result: KakaoGeocodeResult[], status: string) => void,
  ) => void;
}

declare const kakao: {
  maps: {
    services: {
      Geocoder: new () => KakaoGeocoder;
      Status: { OK: string };
    };
  };
};

interface PlannerContextValue {
  condition: PlannerCondition;
  currentPosition: CurrentPosition | null;
  plan: CoursePlan;
  activePlan: CoursePlan | null;
  hasActivePlan: boolean;
  isSearching: boolean;
  searchProgress: CourseProgress | null;
  locationStatus: 'idle' | 'locating' | 'success' | 'error';
  searchError: string;
  detectCurrentLocation: (options?: { updateCondition?: boolean; updateStatus?: boolean }) => Promise<{ address: string; label: string }>;
  ensureCurrentLocation: () => void;
  setCondition: (patch: Partial<PlannerCondition>) => void;
  inputNotice: string;
  startFromText: (text: string) => Promise<boolean>;
  runSearch: (conditionOverride?: PlannerCondition) => Promise<boolean>;
  loadPlan: (nextPlan: CoursePlan) => void;
  selectCurrentPlan: () => boolean;
  selectPlanOption: (id: string) => void;
  applyReplacementPlan: (index: number, nextPlan: CoursePlan, expectedPlan: CoursePlan) => boolean;
  resetPlanner: () => void;
}

const defaultCondition: PlannerCondition = {
  rawText: '',
  location: '',
  locationLabel: '',
  time: '',
  companion: '',
  mood: '',
  mainCategory: '',
  supportingCategories: [],
  coreIntent: '',
  coreIntentExplicit: false,
  coreIntentSkipped: false,
  atmosphereTags: [],
  duration: '',
  extras: ['도보 짧게'],
  accuracy: savedAccuracyPreferences(),
};

const PlannerContext = createContext<PlannerContextValue | null>(null);

function getBrowserPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('이 브라우저에서는 현재 위치를 지원하지 않아요.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 15000,
      timeout: 10000,
    });
  });
}

function baseRoadName(roadName: string) {
  return roadName.replace(/^(.+?로)\d.*$/u, '$1').replace(/^(.+?길)\d.*$/u, '$1');
}

function compactLocationLabel(address: string) {
  const cleaned = address
    .replace(/^서울특별시\s*/u, '')
    .replace(/^서울시\s*/u, '')
    .replace(/^경기도\s*/u, '')
    .trim();
  const parts = cleaned.split(/\s+/u).filter(Boolean);
  const dong = extractDongFromText(address);
  const district = parts.find((part) => /(구|군)$/u.test(part));
  const road = parts.find((part) => /(로|길)\d*(가길|길)?$/u.test(part));

  if (dong) return dong;
  if (district && road) return `${district} ${baseRoadName(road)}`;
  if (road) return baseRoadName(road);

  return cleaned || address;
}

function locationLabelFromGeocode(item: KakaoGeocodeResult, address: string) {
  const dong = item?.address?.region_3depth_name;
  const district = item?.road_address?.region_2depth_name || item?.address?.region_2depth_name;
  const roadName = item?.road_address?.road_name;

  if (dong && extractDongFromText(dong)) return dong;
  if (district && roadName) return `${district} ${baseRoadName(roadName)}`;

  return compactLocationLabel(address);
}

function reverseGeocode(lat: number, lng: number) {
  return new Promise<{ address: string; label: string }>((resolve) => {
    const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    if (typeof kakao === 'undefined' || !kakao.maps?.services) {
      resolve({ address: fallback, label: fallback });
      return;
    }

    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.coord2Address(lng, lat, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result[0]) {
        const address = result[0].road_address?.address_name || result[0].address?.address_name;
        const nextAddress = address || fallback;
        resolve({ address: nextAddress, label: locationLabelFromGeocode(result[0], nextAddress) });
        return;
      }

      resolve({ address: fallback, label: fallback });
    });
  });
}

const inferLocationFromText = inferNamedTextLocation;

function inferTimeFromText(text: string) {
  if (/지금|바로/.test(text)) return '지금';
  if (/주말/.test(text)) return '이번 주말';

  const day = text.includes('내일') ? '내일' : '오늘';
  if (/새벽/.test(text)) return `${day} 새벽`;
  if (/아침/.test(text)) return `${day} 아침`;
  if (/오전/.test(text)) return `${day} 오전`;
  if (/점심/.test(text)) return `${day} 점심`;
  if (/저녁/.test(text)) return `${day} 저녁`;
  if (/밤/.test(text)) return `${day} 밤`;
  if (text.includes('내일')) return '내일';
  if (text.includes('오늘')) return '오늘';

  return '';
}

function inferConditionFromText(text: string): Partial<PlannerCondition> {
  const patch: Partial<PlannerCondition> = {};
  const location = inferLocationFromText(text);
  const time = inferTimeFromText(text);

  if (location) {
    patch.location = location;
    patch.locationLabel = location;
  }

  if (time) patch.time = time;

  const people = /혼자|혼밥|혼술/.test(text)
    ? '혼자'
    : /둘이서|둘이|두\s*명|2\s*명/.test(text)
      ? '두명'
      : /(?:3|4)\s*명/.test(text)
        ? '3-4명'
        : /(?:5|여러)\s*명|단체/.test(text)
          ? '5명 이상'
          : '';
  const relation = /데이트|연인|커플/.test(text)
    ? '연인'
    : /가족|부모/.test(text)
      ? '가족'
      : /동료|회사/.test(text)
        ? '동료'
        : /친구|동기|모임/.test(text)
          ? '친구'
          : '';

  if (people === '혼자') patch.companion = '혼자';
  else if (people || relation) patch.companion = [people, relation].filter(Boolean).join(', ');

  if (/맛집|밥|식사|고기|파스타|한식|일식/.test(text)) patch.mood = '맛집';
  else if (/카페|디저트|커피|베이커리|브런치/.test(text)) patch.mood = '카페/디저트';
  else if (/산책|걷|공원|야경|구경|시장/.test(text)) patch.mood = '산책/구경';
  else if (/술|포차|펍|와인|칵테일|이자카야/.test(text)) patch.mood = '술/야간';
  else if (/놀|놀거리|체험|방탈출|보드게임|볼링|노래방|오락실|공방|스포츠/.test(text)) patch.mood = '놀거리';

  const mainCategory = inferMainCategoryFromText(text);
  if (mainCategory) {
    patch.mainCategory = mainCategory;
    patch.supportingCategories = [];
    patch.coreIntent = inferCoreIntentFromText(text, mainCategory);
    patch.coreIntentExplicit = false;
    patch.coreIntentSkipped = false;
  }
  patch.atmosphereTags = inferAtmosphereTags(text);

  const inferredExtras = [];
  if (/도보\s*(?:짧게|적게)|가까운\s*곳|멀리\s*걷지/.test(text)) inferredExtras.push('도보 짧게');
  if (/실내|비\s*(?:안|피)|추워|더워/.test(text)) inferredExtras.push('실내 중심');
  if (inferredExtras.length > 0) patch.extras = inferredExtras;

  if (/2\s*시간/.test(text)) patch.duration = '2시간';
  else if (/4\s*시간/.test(text)) patch.duration = '4시간';
  else if (/저녁까지/.test(text)) patch.duration = '저녁까지';
  else if (/밤까지/.test(text)) patch.duration = '밤까지';

  return patch;
}

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [initialDraft] = useState(() => readPlannerDraft({ ...defaultCondition, accuracy: savedAccuracyPreferences() }));
  const [condition, setConditionState] = useState(initialDraft.condition);
  const [currentPosition, setCurrentPosition] = useState<CurrentPosition | null>(initialDraft.currentPosition);
  const [resolveCurrentLocation] = useState(()=>createLocationResolver(async()=>{
    const position=await getBrowserPosition();
    const lat=position.coords.latitude,lng=position.coords.longitude;
    const location=await reverseGeocode(lat,lng);
    return {...location,lat,lng,capturedAt:Date.now()};
  },initialDraft.currentPosition));
  const automaticLocationAttempted=useRef(false);
  const [plan, setPlan] = useState(() => makeFallbackPlan(defaultCondition));
  const [activePlan, setActivePlan] = useState<CoursePlan | null>(null);
  const hasActivePlan = Boolean(activePlan && activePlan.courseData.length > 0 && activePlan.source !== 'fallback');
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState<CourseProgress | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'success' | 'error'>('idle');
  const [searchError, setSearchError] = useState('');
  const [inputNotice, setInputNotice] = useState('');
  useEffect(() => { savePlannerDraft(condition,currentPosition); }, [condition,currentPosition]);

  const setCondition = (patch: Partial<PlannerCondition>) => {
    if (patch.location !== undefined && patch.location !== currentPosition?.address) {
      setCurrentPosition(null);
    }
    setConditionState((prev) => {
      const next = { ...prev, ...patch };
      if (patch.companion !== undefined && patch.companion !== prev.companion && !patch.accuracy) next.accuracy = { ...prev.accuracy, groupSize: undefined };
      if (patch.mainCategory !== undefined && patch.mainCategory !== prev.mainCategory) {
        const validIntent = normalizeCoreIntent(next.mainCategory, next.coreIntent);
        next.coreIntent = validIntent;
        next.coreIntentExplicit = false;
        if (!validIntent) next.coreIntentSkipped = false;
      }
      return next;
    });
  };

  const startFromText = async (text: string) => {
    const rawText = text.trim();
    if (!rawText) return false;
    setInputNotice('');
    await trackPlannerEvent('planner_start', { entryMode: 'text' }, undefined, { resetSession: true }).catch(() => undefined);
    const fallbackCondition = inferConditionFromText(rawText);
    const parsedCondition = await parsePlannerCondition(rawText);
    await trackPlannerEvent(
      parsedCondition ? 'condition_parse_success' : 'condition_parse_failure',
      { parser: parsedCondition ? 'openai' : 'fallback' },
    ).catch(() => undefined);
    // A deliberate null from the parser must not be overwritten by regex guesses.
    const resolvedCondition = parsedCondition || fallbackCondition;
    const intent = resolveTextLocation(rawText, resolvedCondition.location, parsedCondition?.locationMode);
    let location = intent.mode === 'named' ? intent.location : intent.mode === 'unspecified' ? condition.location : '';
    let locationLabel = intent.mode === 'named' ? intent.location : intent.mode === 'unspecified' ? condition.locationLabel : '';
    if (intent.mode !== 'unspecified') setCurrentPosition(null);
    if (intent.mode === 'current') {
      try {
        const current = await detectCurrentLocation({ updateCondition: false });
        location = current.address; locationLabel = current.label;
      } catch {
        setInputNotice('현재 위치를 확인하지 못했어요. 위치 권한을 허용하거나 출발할 동네·역을 직접 선택해 주세요.');
      }
    } else if (intent.mode === 'context') {
      setInputNotice('집·회사·숙소가 어디인지 알려주세요. 출발할 동네나 역을 선택하면 나머지 조건은 그대로 이어갈게요.');
    }

    setConditionState((prev) => ({
      ...prev,
      location,
      locationLabel,
      time: resolvedCondition.time || '',
      companion: resolvedCondition.companion || '',
      mood: resolvedCondition.mood || categoryLabelFromKey(resolvedCondition.mainCategory) || '',
      mainCategory: resolvedCondition.mainCategory || '',
      supportingCategories: resolvedCondition.supportingCategories || [],
      coreIntent: normalizeCoreIntent(resolvedCondition.mainCategory, resolvedCondition.coreIntent),
      coreIntentExplicit: false,
      coreIntentSkipped: false,
      atmosphereTags: resolvedCondition.atmosphereTags || [],
      duration: resolvedCondition.duration || '',
      extras: [...new Set([...prev.extras, ...(fallbackCondition.extras || [])])],
      rawText,
      accuracy: { ...prev.accuracy, groupSize: undefined },
    }));
    return Boolean(location);
  };

  const runSearch = async (conditionOverride?: PlannerCondition) => {
    const searchCondition = conditionOverride || condition;
    const missing=missingPlannerCondition(searchCondition) || accuracyMissing(searchCondition);
    if(missing){
      setSearchError(missing);
      setPlan({...makeFallbackPlan(searchCondition),failureReason:'invalid_conditions',message:missing});
      setIsSearching(false);
      return false;
    }
    savePlannerDraft(searchCondition,currentPosition);
    setIsSearching(true);
    setSearchProgress({stage:'request-received'});
    setSearchError('');
    void trackPlannerEvent('course_generate_start', undefined, searchCondition).catch(() => undefined);
    const nextPlan = await generateCourse(searchCondition, currentPosition, {onProgress:setSearchProgress});
    if (nextPlan.source === 'fallback' && nextPlan.message) {
      setSearchError(nextPlan.message);
      void trackPlannerEvent('course_generate_failure', { errorType: 'no_verified_course' }, searchCondition).catch(() => undefined);
    } else {
      void trackPlannerEvent('course_generate_success', {
        courseCount: nextPlan.courseData.length,
        generator: nextPlan.algorithmVersion || 'unknown',
        catalogOnly: Boolean(nextPlan.catalogOnly),
      }, searchCondition, {
        courseId: nextPlan.searchCourseId,
        algorithmVersion: nextPlan.algorithmVersion,
      }).catch(() => undefined);
    }
    setPlan(nextPlan);
    const searchSucceeded = nextPlan.source !== 'fallback' && nextPlan.courseData.length > 0;
    if(searchSucceeded)setSearchProgress({stage:'complete'});
    trackRecommendationImpressions(nextPlan, searchCondition).catch(() => undefined);
    window.setTimeout(() => setIsSearching(false), 550);
    return searchSucceeded;
  };

  const detectCurrentLocation = async (options: { updateCondition?: boolean; updateStatus?: boolean } = {}) => {
    if (options.updateStatus !== false) setLocationStatus('locating');

    try {
      const location = await resolveCurrentLocation();
      setCurrentPosition(location);
      if (options.updateCondition !== false) {
        setConditionState((prev) => ({
          ...prev,
          location: location.address,
          locationLabel: location.label,
        }));
      }
      if (options.updateStatus !== false) setLocationStatus('success');

      return location;
    } catch (error) {
      if (options.updateStatus !== false) setLocationStatus('error');
      throw error instanceof Error ? error : new Error('현재 위치를 가져오지 못했어요.');
    }
  };

  const ensureCurrentLocation = () => {
    const previousLocation=condition.location;
    const needsNeighborhood=Boolean(currentPosition?.address===previousLocation && !extractDongFromText(condition.locationLabel,previousLocation));
    if ((previousLocation&&!needsNeighborhood) || automaticLocationAttempted.current) return;
    automaticLocationAttempted.current=true;
    void detectCurrentLocation({updateCondition:false}).then(found=>{
      // Do not overwrite an area the user typed while GPS was resolving.
      setConditionState(prev=>prev.location&&!(needsNeighborhood&&prev.location===previousLocation)?prev:{...prev,location:found.address,locationLabel:found.label});
    }).catch(()=>undefined);
  };

  const loadPlan = (nextPlan: CoursePlan) => {
    setPlan(nextPlan);
    setSearchError('');
    if (nextPlan.courseData.length > 0 && nextPlan.source !== 'fallback') setActivePlan(nextPlan);
    setConditionState((prev) => ({
      ...prev,
      rawText: nextPlan.title,
      location: nextPlan.location || prev.location,
      locationLabel: nextPlan.location ? compactLocationLabel(nextPlan.location) : prev.locationLabel,
    }));
  };

  const selectCurrentPlan = () => {
    if (plan.courseData.length === 0 || plan.source === 'fallback') return false;
    setActivePlan(plan);
    return true;
  };

  const selectPlanOption = (id: string) => {
    setPlan(current => {
      const option=current.courseOptions?.find(item=>item.id===id);
      if(!option || current.selectedOptionId===id)return current;
      const end=new Date(option.summary.endAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'numeric',minute:'2-digit'});
      return {...current,selectedOptionId:id,courseData:option.courseData,accuracySummary:option.summary,
        durationText:`${option.courseData.length}곳 · ${end}까지`,backupPlaces:[],id:undefined,searchCourseId:null};
    });
  };

  const applyReplacementPlan = (index: number, nextPlan: CoursePlan, expectedPlan: CoursePlan) => {
    if (!activePlan || activePlan !== expectedPlan || nextPlan.source !== 'api'
      || !Number.isInteger(index) || index < 0 || index >= activePlan.courseData.length
      || nextPlan.courseData.length !== activePlan.courseData.length
      || !nextPlan.courseData.every(isCourseRecommendationPlace)) return false;
    const ids = nextPlan.courseData.map(place => place.catalogPlaceId);
    if (ids.some(id => !id) || new Set(ids).size !== ids.length
      || ids[index] === activePlan.courseData[index].catalogPlaceId
      || ids.some((id, slot) => slot !== index && id !== activePlan.courseData[slot].catalogPlaceId)) return false;
    const replacedPlan = { ...nextPlan, id: undefined, searchCourseId: null, courseOptions: undefined, selectedOptionId: undefined };
    setActivePlan(replacedPlan);
    setPlan(currentPlan => currentPlan === activePlan ? replacedPlan : currentPlan);
    return true;
  };

  const resetPlanner = () => {
    setConditionState({ ...defaultCondition, accuracy: savedAccuracyPreferences() });
    setPlan(makeFallbackPlan(defaultCondition));
    setActivePlan(null);
    setSearchError('');
  };

  const value: PlannerContextValue = {
    condition,
    currentPosition,
    plan,
    activePlan,
    hasActivePlan,
    isSearching,
    searchProgress,
    locationStatus,
    searchError,
    inputNotice,
    detectCurrentLocation,
    ensureCurrentLocation,
    loadPlan,
    selectCurrentPlan,
    selectPlanOption,
    setCondition,
    startFromText,
    runSearch,
    applyReplacementPlan,
    resetPlanner,
  };

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlanner() {
  const value = useContext(PlannerContext);

  if (!value) {
    throw new Error('usePlanner must be used inside PlannerProvider.');
  }

  return value;
}
