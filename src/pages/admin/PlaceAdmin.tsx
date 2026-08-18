import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  approvePlaceCandidate,
  checkAdminAccess,
  collectApifyCandidates,
  createPlaceCandidate,
  enrichCandidateNaverMenu,
  enrichCandidateNaverMenus,
  getPlaceCandidate,
  getPlaceCoverage,
  listPlaceCandidates,
  rejectPlaceCandidate,
  updatePlaceCandidate,
  uploadPlaceImage,
  type CandidateStatus,
  type PlaceCandidate,
  type PlaceCoverage,
  type PlaceEditorial,
  type PlaceImageInput,
  type PlaceMenuInput,
  type PlaceType,
  type RegionKey,
} from '../../api/adminPlacesApi';
import { PlaceVisual } from '../../components/ui/PlaceVisual';
import {
  ATMOSPHERE_OPTIONS,
  PLANNER_CATEGORIES,
  getCoreIntentOptions,
  getPlannerCategory,
  normalizeCoreIntent,
  type PlannerCategoryKey,
} from '../../features/planner/plannerIntents';
import { PLACE_DETAIL_OPTIONS, SEONGSU_HUB_OPTIONS, type SeongsuHubKey } from '../../features/planner/placeCatalog';

const REGION_OPTIONS: Array<{ key: RegionKey; label: string }> = [
  { key: 'hongdae', label: '홍대입구역' },
  { key: 'seongsu', label: '성수권' },
];

const RADIUS_OPTIONS = [1000, 1500, 1800, 2500] as const;

const CATEGORY_PLACE_TYPE: Record<PlannerCategoryKey, PlaceType> = {
  food: 'food',
  cafe: 'cafe',
  activity: 'activity',
  culture: 'activity',
  walk: 'hotplace',
  drink: 'drink',
};

const STATUS_OPTIONS: Array<{ value: CandidateStatus; label: string }> = [
  { value: 'pending', label: '검수 대기' },
  { value: 'approved', label: '승인됨' },
  { value: 'rejected', label: '제외됨' },
];

const ATMOSPHERE_TAG_OPTIONS = ATMOSPHERE_OPTIONS.map((option) => ({ value: option.key, label: option.label }));
const AMENITY_TAG_OPTIONS = [
  { value: 'parking', label: '주차 가능' },
  { value: 'pet_friendly', label: '반려동물 동반' },
  { value: 'reservation', label: '예약 가능' },
];
const COMPANION_OPTIONS = [
  { value: 'friends', label: '친구' },
  { value: 'couple', label: '연인' },
  { value: 'family', label: '가족' },
  { value: 'coworkers', label: '동료' },
  { value: 'solo', label: '혼자' },
];

const BEST_TIME_TAG_OPTIONS = ['오전', '점심', '오후', '저녁', '밤'] as const;
const CANDIDATE_PAGE_SIZE = 50;

interface TagDropdownProps {
  label: string;
  options: ReadonlyArray<string | { value: string; label: string }>;
  values: string[];
  onChange: (values: string[]) => void;
}

function TagDropdown({ label, options, values, onChange }: TagDropdownProps) {
  const normalizedOptions = options.map((option) => (
    typeof option === 'string' ? { value: option, label: option } : option
  ));
  const selectedValues = normalizedOptions.filter((option) => (
    values.includes(option.value) || values.includes(option.label)
  ));

  const toggleOption = (option: string) => {
    const nextValues = new Set(selectedValues.map((item) => item.value));
    if (nextValues.has(option)) nextValues.delete(option);
    else nextValues.add(option);
    onChange(normalizedOptions.map((item) => item.value).filter((item) => nextValues.has(item)));
  };

  return (
    <div className="admin-tag-field">
      <span className="admin-tag-label">{label}</span>
      <details className="admin-tag-dropdown">
        <summary>
          <span className={selectedValues.length ? '' : 'placeholder'}>
            {selectedValues.length ? selectedValues.map((item) => item.label).join(', ') : '선택하세요'}
          </span>
          <span aria-hidden="true" className="admin-tag-chevron">⌄</span>
        </summary>
        <div className="admin-tag-options" role="group" aria-label={`${label} 선택`}>
          {normalizedOptions.map((option) => (
            <label className="admin-tag-option" key={option.value}>
              <input
                type="checkbox"
                checked={selectedValues.some((item) => item.value === option.value)}
                onChange={() => toggleOption(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}

function emptyCandidate(regionKey: RegionKey): PlaceCandidate {
  return {
    provider: 'manual',
    providerPlaceId: '',
    name: '',
    regionKey,
    nearestStation: regionKey === 'seongsu' ? '성수역' : '홍대입구역',
    entityType: 'venue',
    primaryType: 'activity',
    detailType: '보드게임',
    categoryRaw: '놀거리',
    categoryPathRaw: '놀거리 > 보드게임',
    intentTags: [],
    atmosphereTags: [],
    amenityTags: [],
    companionScores: { couple: 0.5, friends: 0.5, family: 0.5, coworkers: 0.5, solo: 0.5 },
    isFranchise: false,
    recommendedPaxMin: 1,
    recommendedPaxMax: 6,
    averageStayMinutes: 90,
    images: [],
    menus: [],
  };
}

function emptyEditorial() {
  return {
    shortDescription: '',
    caution: '',
    bestTimeTags: [] as string[],
    editorialScore: 50,
  };
}

function editorialFromCandidate(editorial?: PlaceEditorial) {
  if (!editorial) return emptyEditorial();
  return {
    shortDescription: editorial.shortDescription || '',
    caution: editorial.caution || '',
    bestTimeTags: Array.isArray(editorial.bestTimeTags) ? editorial.bestTimeTags : [],
    editorialScore: Number(editorial.editorialScore) || 50,
  };
}

function displayAddress(candidate: PlaceCandidate) {
  return candidate.roadAddress || candidate.address || '주소 미등록';
}

function externalProviderLabel(provider: string) {
  return ({
    apify_naver_place: '네이버 플레이스 존재 확인',
    apify_naver_menu: '네이버 플레이스 메뉴',
  } as Record<string, string>)[provider] || '외부 데이터';
}

function formatConfidence(value: number | string | null | undefined) {
  const confidence = Number(value);
  return Number.isFinite(confidence) ? confidence.toFixed(2) : '-';
}

function mainCategoryKeyForCandidate(candidate: PlaceCandidate): PlannerCategoryKey {
  const explicit = getPlannerCategory(candidate.categoryRaw)?.key;
  if (explicit) return explicit;
  if (candidate.primaryType === 'food') return 'food';
  if (candidate.primaryType === 'cafe') return 'cafe';
  if (candidate.primaryType === 'drink') return 'drink';
  if (candidate.primaryType === 'hotplace') return 'walk';
  return PLACE_DETAIL_OPTIONS.culture.includes(candidate.detailType || '') ? 'culture' : 'activity';
}

function kakaoMapUrl(candidate: PlaceCandidate) {
  const providerPlaceId = candidate.providerPlaceId?.trim();
  if (candidate.provider === 'kakao_local' && providerPlaceId) {
    return `https://place.map.kakao.com/${encodeURIComponent(providerPlaceId)}`;
  }

  const latitude = Number(candidate.latitude);
  const longitude = Number(candidate.longitude);
  if (candidate.name.trim() && Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `https://map.kakao.com/link/map/${encodeURIComponent(candidate.name.trim())},${latitude},${longitude}`;
  }

  const searchQuery = [candidate.name, candidate.roadAddress || candidate.address]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(' ');
  return searchQuery ? `https://map.kakao.com/link/search/${encodeURIComponent(searchQuery)}` : null;
}

export default function PlaceAdmin() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem('noplanAdminKey') || '');
  const [adminId, setAdminId] = useState(() => sessionStorage.getItem('noplanAdminId') || '');
  const [unlocked, setUnlocked] = useState(false);
  const [regionKey, setRegionKey] = useState<RegionKey>('hongdae');
  const [status, setStatus] = useState<CandidateStatus>('pending');
  const [hubKey, setHubKey] = useState<SeongsuHubKey>('all');
  const [query, setQuery] = useState('');
  const [targetCount, setTargetCount] = useState(30);
  const [minRating, setMinRating] = useState(3.5);
  const [minReviewCount, setMinReviewCount] = useState(30);
  const [radius, setRadius] = useState(2500);
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>([]);
  const [candidatePage, setCandidatePage] = useState(1);
  const [candidateTotal, setCandidateTotal] = useState(0);
  const [candidateTotalPages, setCandidateTotalPages] = useState(1);
  const [coverage, setCoverage] = useState<PlaceCoverage[]>([]);
  const [selected, setSelected] = useState<PlaceCandidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [editorial, setEditorial] = useState(emptyEditorial);
  const selectedMainCategory: PlannerCategoryKey = selected ? mainCategoryKeyForCandidate(selected) : 'activity';
  const selectedCoreIntentOptions = getCoreIntentOptions(selectedMainCategory).map((option) => ({
    value: option.key,
    label: option.label,
  }));
  const validSelectedIntentTags = selected
    ? [...new Set(selected.intentTags.map((tag) => normalizeCoreIntent(selectedMainCategory, tag)).filter(Boolean))]
    : [];

  const run = useCallback(async <T,>(work: () => Promise<T>, successMessage?: string) => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const result = await work();
      if (successMessage) setNotice(successMessage);
      return result;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '요청을 처리하지 못했습니다.');
      throw caught;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWorkspace = useCallback(async () => {
    const [queue, coverageResult] = await Promise.all([
      listPlaceCandidates(adminKey, adminId || 'team', regionKey, status, candidatePage, CANDIDATE_PAGE_SIZE, hubKey),
      getPlaceCoverage(adminKey, adminId || 'team', regionKey, hubKey),
    ]);
    setCandidates(queue.candidates);
    setCandidatePage(queue.page);
    setCandidateTotal(queue.totalCount);
    setCandidateTotalPages(queue.totalPages);
    setCoverage(coverageResult.coverage);
  }, [adminId, adminKey, candidatePage, hubKey, regionKey, status]);

  useEffect(() => {
    if (!unlocked) return;
    loadWorkspace().catch(() => undefined);
  }, [loadWorkspace, unlocked]);

  const unlock = async () => {
    if (!adminKey || !adminId) {
      setError('팀원 이름과 관리자 키를 입력해 주세요.');
      return;
    }
    await run(async () => {
      await checkAdminAccess(adminKey, adminId);
      sessionStorage.setItem('noplanAdminKey', adminKey);
      sessionStorage.setItem('noplanAdminId', adminId);
      setUnlocked(true);
    }, '관리자 도구에 연결했습니다.').catch(() => undefined);
  };

  const search = async () => {
    if (!query.trim()) return;
    await run(async () => {
      const result = await collectApifyCandidates(adminKey, adminId, {
        regionKey,
        query: query.trim(),
        targetCount,
        minRating,
        minReviewCount,
        radius,
      });
      const [queue, coverageResult] = await Promise.all([
        listPlaceCandidates(adminKey, adminId, regionKey, 'pending', 1, CANDIDATE_PAGE_SIZE, hubKey),
        getPlaceCoverage(adminKey, adminId, regionKey, hubKey),
      ]);
      setStatus('pending');
      setCandidatePage(queue.page);
      setCandidates(queue.candidates);
      setCandidateTotal(queue.totalCount);
      setCandidateTotalPages(queue.totalPages);
      setCoverage(coverageResult.coverage);
      setSelected(null);
      const skippedCount = Object.values(result.skipped).reduce((sum, count) => sum + count, 0);
      setNotice(
        `Apify 수집 완료: 원본 ${result.rawCount}개 중 신규 ${result.inserted}개가 검수함에 들어갔습니다. `
        + `네이버 확인 ${result.naverChecks}건 · 기준 미달·미확인·중복 등 제외 ${skippedCount}개.`,
      );
    }).catch(() => undefined);
  };

  const changeRegion = (nextRegion: RegionKey) => {
    setRegionKey(nextRegion);
    setHubKey('all');
    setRadius(nextRegion === 'seongsu' ? 1800 : 2500);
    setMinReviewCount(nextRegion === 'seongsu' ? 10 : 30);
    setCandidatePage(1);
    setSelectedCandidateIds([]);
    setSelected(null);
    setNotice('');
    setError('');
  };

  const enrichNaverMenu = async () => {
    if (!selected?.id) return;
    const alreadyChecked = selected.externalMatches?.some((match) => match.provider === 'apify_naver_menu');
    if (alreadyChecked && !window.confirm('24시간 캐시를 무시하고 네이버 메뉴를 다시 확인할까요?')) return;
    const force = Boolean(alreadyChecked);
    await run(async () => {
      const result = await enrichCandidateNaverMenu(adminKey, adminId, selected.id!, force);
      const refreshed = await getPlaceCandidate(adminKey, adminId, selected.id!);
      setSelected(refreshed.candidate);
      const messages = {
        matched: `네이버 메뉴 ${result.importedMenuCount || 0}개를 반영했습니다.`,
        no_menu: '네이버 장소는 확인했지만 공개된 메뉴가 없었습니다.',
        not_found: '같은 장소로 확정할 네이버 플레이스를 찾지 못했습니다.',
        review_required: '비슷한 장소가 있어 자동 저장하지 않았습니다. 장소 일치를 확인해 주세요.',
        error: '네이버 메뉴를 불러오지 못했습니다.',
      };
      setNotice(`${messages[result.status]}${result.cached ? ' · 최근 확인 결과 사용' : ''}`);
    }).catch(() => undefined);
  };

  const enrichSelectedNaverMenus = async () => {
    if (!selectedCandidateIds.length) return;
    await run(async () => {
      const result = await enrichCandidateNaverMenus(adminKey, adminId, selectedCandidateIds);
      await loadWorkspace();
      setSelectedCandidateIds([]);
      setNotice(
        `네이버 메뉴 일괄 수집 완료: ${result.summary.total}곳 중 메뉴 확인 ${result.summary.matched}곳 · `
        + `${result.summary.importedMenuCount}개 반영 · 메뉴 없음 ${result.summary.noMenu}곳 · `
        + `미확인 ${result.summary.notFound + result.summary.reviewRequired}곳 · 오류 ${result.summary.error}곳`,
      );
    }).catch(() => undefined);
  };

  const openCandidate = async (candidateId?: number) => {
    if (!candidateId) return;
    await run(async () => {
      const result = await getPlaceCandidate(adminKey, adminId, candidateId);
      setSelected(result.candidate);
      setEditorial(editorialFromCandidate(result.candidate.editorial));
    }).catch(() => undefined);
  };

  const startManualCandidate = () => {
    setSelected(emptyCandidate(regionKey));
    setEditorial(emptyEditorial());
  };

  const saveCandidate = async () => {
    if (!selected) return;
    if (!selected.name || !selected.latitude || !selected.longitude || !selected.primaryType || !selected.detailType) {
      setError('장소명, 좌표, 큰 분류와 상세 분류를 확인해 주세요.');
      return;
    }
    if (!validSelectedIntentTags.length) {
      setError('이 장소의 핵심 목적을 하나 이상 선택해 주세요.');
      return;
    }
    const candidateToSave = { ...selected, intentTags: validSelectedIntentTags };
    await run(async () => {
      if (selected.id) {
        await updatePlaceCandidate(adminKey, adminId, candidateToSave);
        if (selected.status === 'approved') {
          await approvePlaceCandidate(adminKey, adminId, selected.id, {
            ...editorial,
            bestTimeTags: editorial.bestTimeTags,
          });
        }
        const refreshed = await getPlaceCandidate(adminKey, adminId, selected.id);
        setSelected(refreshed.candidate);
        await loadWorkspace();
      } else {
        const result = await createPlaceCandidate(adminKey, adminId, candidateToSave);
        const detail = await getPlaceCandidate(adminKey, adminId, result.candidateId);
        const [queue, coverageResult] = await Promise.all([
          listPlaceCandidates(adminKey, adminId, regionKey, 'pending', 1, CANDIDATE_PAGE_SIZE, hubKey),
          getPlaceCoverage(adminKey, adminId, regionKey, hubKey),
        ]);
        setSelected(detail.candidate);
        setStatus('pending');
        setCandidatePage(queue.page);
        setCandidates(queue.candidates);
        setCandidateTotal(queue.totalCount);
        setCandidateTotalPages(queue.totalPages);
        setCoverage(coverageResult.coverage);
      }
    }, selected.id ? '장소 정보를 저장했습니다.' : '검수 후보로 저장했습니다. 이제 확인 후 승인할 수 있습니다.').catch(() => undefined);
  };

  const approve = async () => {
    if (!selected?.id) return;
    if (!validSelectedIntentTags.length) {
      setError('승인 전에 이 장소의 핵심 목적을 하나 이상 선택해 주세요.');
      return;
    }
    await run(async () => {
      await updatePlaceCandidate(adminKey, adminId, { ...selected, intentTags: validSelectedIntentTags });
      await approvePlaceCandidate(adminKey, adminId, selected.id!, {
        ...editorial,
        bestTimeTags: editorial.bestTimeTags,
      });
      const [queue, coverageResult] = await Promise.all([
        listPlaceCandidates(adminKey, adminId, regionKey, 'approved', 1, CANDIDATE_PAGE_SIZE, hubKey),
        getPlaceCoverage(adminKey, adminId, regionKey, hubKey),
      ]);
      setCandidatePage(queue.page);
      setCandidates(queue.candidates);
      setCandidateTotal(queue.totalCount);
      setCandidateTotalPages(queue.totalPages);
      setCoverage(coverageResult.coverage);
      setSelected(null);
      setStatus('approved');
    }, '사진과 메뉴 없이도 추천 장소로 승인했습니다.').catch(() => undefined);
  };

  const reject = async () => {
    if (!selected?.id) return;
    const reason = window.prompt('제외 사유를 입력해 주세요.', '실제 방문 업장이 아니거나 조건에 맞지 않음');
    if (!reason) return;
    await run(async () => {
      await rejectPlaceCandidate(adminKey, adminId, selected.id!, reason);
      setSelected(null);
      await loadWorkspace();
    }, '후보를 제외했습니다.').catch(() => undefined);
  };

  const updateSelected = <K extends keyof PlaceCandidate>(key: K, value: PlaceCandidate[K]) => {
    setSelected((current) => current ? { ...current, [key]: value } : current);
  };

  const addMenu = () => {
    if (!selected) return;
    const next: PlaceMenuInput = { name: '', price: null, isAvailable: true, source: 'manual' };
    updateSelected('menus', [...(selected.menus || []), next]);
  };

  const uploadImage = async (file?: File) => {
    if (!file || !selected) return;
    await run(async () => {
      const result = await uploadPlaceImage(adminKey, adminId, file);
      const image: PlaceImageInput = {
        imageUrl: result.imageUrl,
        imageType: selected.images?.length ? 'gallery' : 'primary',
        isPrimary: !selected.images?.length,
        source: 'team_upload',
      };
      updateSelected('images', [...(selected.images || []), image]);
    }, '팀 소유 사진을 업로드했습니다.').catch(() => undefined);
  };

  const detailOptions = useMemo(() => selected ? PLACE_DETAIL_OPTIONS[selectedMainCategory] : [], [selected, selectedMainCategory]);
  const selectedKakaoMapUrl = useMemo(() => selected ? kakaoMapUrl(selected) : null, [selected]);

  if (!unlocked) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-panel">
          <div className="admin-brand-mark">NP</div>
          <div><p className="admin-eyebrow">NoPlan operations</p><h1>장소 관리자</h1><p>팀원 정보와 서버 관리자 키로 접속합니다.</p></div>
          <label>팀원 이름<input value={adminId} onChange={(event) => setAdminId(event.target.value)} placeholder="예: 지혁" /></label>
          <label>관리자 키<input type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && unlock()} /></label>
          {error && <p className="admin-alert error">{error}</p>}
          <button className="admin-primary-button" type="button" disabled={loading} onClick={unlock}>관리자 도구 열기</button>
        </section>
      </main>
    );
  }

  return (
    <main className="place-admin-page">
      <header className="place-admin-header">
        <div><p className="admin-eyebrow">NoPlan place catalog</p><h1>장소 등록·검수</h1></div>
        <div className="admin-header-actions">
          <div className="admin-segmented" aria-label="관리 지역">
            {REGION_OPTIONS.map((region) => <button className={regionKey === region.key ? 'active' : ''} key={region.key} type="button" onClick={() => changeRegion(region.key)}>{region.label}</button>)}
          </div>
          <span className="admin-user-chip">{adminId}</span>
          <button className="admin-quiet-button" type="button" onClick={() => { sessionStorage.removeItem('noplanAdminKey'); setUnlocked(false); }}>잠금</button>
        </div>
      </header>

      {(notice || error) && <div className={`admin-alert ${error ? 'error' : 'success'}`}>{error || notice}</div>}

      <section className="admin-coverage-strip" aria-label="승인 장소 커버리지">
        <div><strong>{regionKey === 'seongsu' ? '성수권' : '홍대'} 승인 장소 현황</strong><span>거점·소분류별 목표 30곳</span></div>
        {regionKey === 'seongsu' && <div className="admin-segmented" aria-label="성수권 거점">
          {SEONGSU_HUB_OPTIONS.map((hub) => <button className={hubKey === hub.key ? 'active' : ''} key={hub.key} type="button" onClick={() => { setHubKey(hub.key); setCandidatePage(1); setSelected(null); }}>{hub.label}</button>)}
        </div>}
        <div className="admin-coverage-list">
          {coverage.length ? coverage.map((item) => (
            <span className={item.shortage ? 'shortage' : ''} key={`${item.hubKey || 'region'}-${item.primaryType}-${item.detailType}`}>
              {item.hubLabel ? `${item.hubLabel} · ` : ''}{item.detailType} A {item.tierA || 0} / B {item.tierB || 0} / C {item.tierC || 0} · 승인 {item.active ?? item.count}곳{item.shortage ? ` · ${item.shortageCount || 0}곳 부족` : ''}{item.exhausted ? ' · 검색 소진' : ''}
            </span>
          )) : <span className="shortage">승인된 장소가 아직 없습니다.</span>}
        </div>
      </section>

      <div className="place-admin-workspace">
        <aside className="admin-discovery-panel">
          <section className="admin-panel-block">
            <div className="admin-section-heading">
              <div><span>Apify 후보 수집</span><small>별점·리뷰 기준 통과 장소만 검수함에 저장</small></div>
              <button className="admin-quiet-button" type="button" onClick={startManualCandidate}>직접 등록</button>
            </div>
            <ol className="admin-collection-flow" aria-label="장소 등록 진행 순서"><li><b>1</b>조건 입력</li><li><b>2</b>일괄 수집</li><li><b>3</b>팀 검수</li><li><b>4</b>승인</li></ol>
            <div className="admin-search-row">
              <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && search()} placeholder="보드게임, 방탈출, 윤씨밀방" />
              <button className="admin-primary-button" type="button" disabled={loading} onClick={search}>{loading ? 'Apify 수집 중' : 'Apify 후보 수집'}</button>
            </div>
            <div className="admin-collection-filters">
              <label>수집 반경<select value={radius} onChange={(event) => setRadius(Number(event.target.value))}>{RADIUS_OPTIONS.map((meters) => <option key={meters} value={meters}>{(meters / 1000).toFixed(1)} km</option>)}</select></label>
              <label>목표 후보<input min="1" max="100" type="number" value={targetCount} onChange={(event) => setTargetCount(Number(event.target.value) || 1)} /></label>
              <label>최소 별점<input min="0" max="5" step="0.1" type="number" value={minRating} onChange={(event) => setMinRating(Number(event.target.value) || 0)} /></label>
              <label>최소 리뷰<input min="0" type="number" value={minReviewCount} onChange={(event) => setMinReviewCount(Number(event.target.value) || 0)} /></label>
            </div>
          </section>

          <section className="admin-panel-block queue-block">
            <div className="admin-section-heading"><div><span>검수함</span><small>전체 {candidateTotal}개 · 현재 페이지 {candidates.length}개</small></div></div>
            <div className="admin-status-tabs">
              {STATUS_OPTIONS.map((option) => <button className={status === option.value ? 'active' : ''} key={option.value} type="button" onClick={() => { setStatus(option.value); setCandidatePage(1); setSelectedCandidateIds([]); setSelected(null); }}>{option.label}</button>)}
            </div>
            {regionKey === 'seongsu' && candidates.length > 0 && (
              <div className="admin-bulk-menu-actions">
                <label><input type="checkbox" checked={candidates.every((candidate) => candidate.id && selectedCandidateIds.includes(candidate.id))} onChange={(event) => setSelectedCandidateIds(event.target.checked ? candidates.map((candidate) => candidate.id!).filter(Boolean) : [])} />현재 페이지 전체</label>
                <button type="button" disabled={loading || !selectedCandidateIds.length} onClick={enrichSelectedNaverMenus}>선택한 후보 메뉴 일괄 수집 ({selectedCandidateIds.length})</button>
              </div>
            )}
            <div className="admin-candidate-list">
              {candidates.map((candidate) => (
                <div className={`admin-candidate-select-row ${selected?.id === candidate.id ? 'active' : ''}`} key={candidate.id}>
                  {regionKey === 'seongsu' && <input aria-label={`${candidate.name} 선택`} type="checkbox" checked={Boolean(candidate.id && selectedCandidateIds.includes(candidate.id))} onChange={(event) => setSelectedCandidateIds((ids) => event.target.checked ? [...new Set([...ids, candidate.id!])] : ids.filter((id) => id !== candidate.id))} />}
                  <button className="admin-candidate-row" type="button" onClick={() => openCandidate(candidate.id)}>
                    <PlaceVisual alt={candidate.name} imageUrl={candidate.primaryImageUrl || undefined} type={candidate.primaryType} detailType={candidate.detailType || undefined} />
                    <span><strong>{candidate.qualityTier ? `[${candidate.qualityTier}] ` : ''}{candidate.name}</strong><small>{candidate.detailType || candidate.primaryType} · {candidate.nearestStation || '거점 미확인'} · 별점 {candidate.rating ?? '-'} · 리뷰 {candidate.reviewCount ?? 0} · 메뉴 {candidate.menuCount || 0}{candidate.qualityExceptionReason ? ` · ${candidate.qualityExceptionReason}` : ''}</small></span>
                  </button>
                </div>
              ))}
              {!candidates.length && <p className="admin-empty-copy">이 상태의 장소가 없습니다.</p>}
            </div>
            {candidateTotal > 0 && (
              <div className="admin-candidate-pagination" aria-label="검수함 페이지 이동">
                <button type="button" disabled={loading || candidatePage <= 1} onClick={() => { setSelected(null); setSelectedCandidateIds([]); setCandidatePage((page) => Math.max(1, page - 1)); }}>이전</button>
                <span>{candidatePage} / {candidateTotalPages}</span>
                <button type="button" disabled={loading || candidatePage >= candidateTotalPages} onClick={() => { setSelected(null); setSelectedCandidateIds([]); setCandidatePage((page) => Math.min(candidateTotalPages, page + 1)); }}>다음</button>
              </div>
            )}
          </section>
        </aside>

        <section className="admin-editor-panel">
          {!selected ? (
            <div className="admin-editor-empty"><div className="admin-brand-mark">NP</div><h2>검수할 후보를 선택하세요</h2><p>Apify 수집과 별점·리뷰 필터를 통과한 장소가 왼쪽 검수함에 쌓입니다.</p></div>
          ) : (
            <>
              <div className="admin-editor-toolbar">
                <div><span className={`admin-entity-badge ${selected.entityType !== 'venue' ? 'warning' : ''}`}>{selected.entityType}</span><h2>{selected.name || '새 장소'}</h2><p>{displayAddress(selected)}</p></div>
                <div>
                  {selectedKakaoMapUrl && <a className="admin-secondary-button admin-kakao-map-button" href={selectedKakaoMapUrl} target="_blank" rel="noopener noreferrer">카카오맵에서 보기</a>}
                  {selected.id && selected.regionKey === 'seongsu' && <button className="admin-secondary-button" type="button" disabled={loading} onClick={enrichNaverMenu}>{selected.externalMatches?.some((match) => match.provider === 'apify_naver_menu') ? '네이버 메뉴 다시 확인' : '네이버 메뉴 불러오기'}</button>}
                  {selected.id && <button className="admin-secondary-button" type="button" disabled={loading} onClick={saveCandidate}>저장</button>}
                </div>
              </div>

              <div className="admin-editor-scroll">
                <fieldset className="admin-form-section admin-priority-section">
                  <legend>분류와 핵심 목적 <small>추천에 가장 먼저 사용되는 정보</small></legend>
                  <div className="admin-form-grid two">
                    <label>
                      메인 카테고리
                      <select
                        value={selectedMainCategory}
                        onChange={(event) => {
                          const categoryKey = event.target.value as PlannerCategoryKey;
                          const category = PLANNER_CATEGORIES.find((item) => item.key === categoryKey)!;
                          const detailType = PLACE_DETAIL_OPTIONS[categoryKey][0];
                          setSelected({
                            ...selected,
                            primaryType: CATEGORY_PLACE_TYPE[categoryKey],
                            detailType,
                            categoryRaw: category.label,
                            categoryPathRaw: `${category.label} > ${detailType}`,
                            intentTags: [],
                          });
                        }}
                      >
                        {PLANNER_CATEGORIES.map((category) => (
                          <option key={category.key} value={category.key}>{category.label}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      세부 카테고리
                      <select
                        value={selected.detailType || ''}
                        onChange={(event) => {
                          const detailType = event.target.value;
                          setSelected({
                            ...selected,
                            detailType,
                            categoryPathRaw: `${getPlannerCategory(selectedMainCategory)?.label} > ${detailType}`,
                          });
                        }}
                      >
                        {detailOptions.map((detail) => <option key={detail}>{detail}</option>)}
                      </select>
                    </label>
                  </div>
                  <TagDropdown
                    label="핵심 목적 (복수 선택)"
                    options={selectedCoreIntentOptions}
                    values={validSelectedIntentTags}
                    onChange={(values) => updateSelected('intentTags', values)}
                  />
                  <p className="admin-form-note">이미지나 메뉴가 없어도 이 세 항목과 좌표가 있으면 승인할 수 있습니다.</p>
                </fieldset>

                {!!selected.externalMatches?.length && (
                  <fieldset className="admin-form-section admin-external-match-section">
                    <legend>네이버 장소·메뉴 확인</legend>
                    <div className="admin-external-match-list">
                      {selected.externalMatches.filter((match) => match.provider === 'apify_naver_menu' || match.provider === 'apify_naver_place').map((match) => {
                        const place = match.metadata?.externalPlace;
                        const closed = /폐업|영업종료|closed/i.test(match.metadata?.businessStatus || place?.businessStatus || '');
                        return <article className={closed ? 'is-closed' : ''} key={match.provider}>
                          <div><strong>{externalProviderLabel(match.provider)}</strong><span>{match.status === 'matched' ? `일치 ${Math.round(Number(match.confidence || 0) * 100)}%` : match.status === 'review_required' ? '확인 필요' : match.status === 'no_menu' ? '공개 메뉴 없음' : match.status === 'not_found' ? '일치 장소 없음' : match.status}</span></div>
                          {place && <p>{place.name}<br />{place.roadAddress || place.address || '주소 없음'}{place.phone ? ` · ${place.phone}` : ''}{match.distanceM != null ? ` · ${match.distanceM}m` : ''}</p>}
                          {closed && <p className="admin-closed-warning">폐업 또는 영업종료 정보가 있습니다. 승인 전 반드시 확인하세요.</p>}
                          {match.status === 'review_required' && match.provider === 'apify_naver_menu' && <p>동명이거나 지점이 불명확해 메뉴를 저장하지 않았습니다.</p>}
                        </article>;
                      })}
                    </div>
                  </fieldset>
                )}

                <fieldset className="admin-form-section">
                  <legend>기본 정보</legend>
                  <div className="admin-form-grid three">
                    <label>장소명<input value={selected.name} onChange={(event) => updateSelected('name', event.target.value)} /></label>
                    <label>지점명<input value={selected.branchName || ''} onChange={(event) => updateSelected('branchName', event.target.value)} /></label>
                    <label>실제 업장 여부<select value={selected.entityType} onChange={(event) => updateSelected('entityType', event.target.value)}><option value="venue">실제 방문 업장</option><option value="organization">협회·단체</option><option value="office">사무실·본사</option><option value="public">공공시설</option><option value="unknown">확인 필요</option></select></label>
                    <label className="admin-check-label"><input type="checkbox" checked={selected.isFranchise} onChange={(event) => updateSelected('isFranchise', event.target.checked)} />프랜차이즈</label>
                  </div>
                  <div className="admin-form-grid two">
                    <label>도로명 주소<input value={selected.roadAddress || ''} onChange={(event) => updateSelected('roadAddress', event.target.value)} /></label>
                    <label>전화번호<input readOnly={selected.provider === 'kakao_local'} value={selected.phone || ''} onChange={(event) => updateSelected('phone', event.target.value)} /></label>
                    <label>위도<input readOnly={selected.provider === 'kakao_local'} type="number" value={selected.latitude ?? ''} onChange={(event) => updateSelected('latitude', Number(event.target.value))} /></label>
                    <label>경도<input readOnly={selected.provider === 'kakao_local'} type="number" value={selected.longitude ?? ''} onChange={(event) => updateSelected('longitude', Number(event.target.value))} /></label>
                    <label>가게 인스타그램<input inputMode="url" value={selected.instagramUrl || ''} onChange={(event) => updateSelected('instagramUrl', event.target.value)} placeholder="https://instagram.com/..." /></label>
                    <label>예약 링크<input inputMode="url" value={selected.reservationUrl || ''} onChange={(event) => updateSelected('reservationUrl', event.target.value)} placeholder="https://..." /></label>
                  </div>
                  {selected.provider === 'kakao_local' && <p className="admin-form-note">카카오 장소 ID와 주소·좌표·전화번호가 자동으로 연결되었습니다.</p>}
                </fieldset>

                <fieldset className="admin-form-section">
                  <legend>추천 판단 정보</legend>
                  <div className="admin-form-grid three">
                    <label>평균 체류시간(분)<input type="number" value={selected.averageStayMinutes ?? ''} onChange={(event) => updateSelected('averageStayMinutes', Number(event.target.value))} /></label>
                    <label>최소 인원<input type="number" value={selected.recommendedPaxMin ?? 1} onChange={(event) => updateSelected('recommendedPaxMin', Number(event.target.value))} /></label>
                    <label>최대 인원<input type="number" value={selected.recommendedPaxMax ?? 6} onChange={(event) => updateSelected('recommendedPaxMax', Number(event.target.value))} /></label>
                  </div>
                  <div className="admin-form-grid two">
                    <TagDropdown
                      label="분위기 태그"
                      options={ATMOSPHERE_TAG_OPTIONS}
                      values={selected.atmosphereTags}
                      onChange={(values) => updateSelected('atmosphereTags', values)}
                    />
                    <TagDropdown
                      label="편의 태그"
                      options={AMENITY_TAG_OPTIONS}
                      values={selected.amenityTags}
                      onChange={(values) => updateSelected('amenityTags', values)}
                    />
                    <TagDropdown
                      label="추천 동행"
                      options={COMPANION_OPTIONS}
                      values={COMPANION_OPTIONS.filter((option) => Number(selected.companionScores[option.value] || 0) > 0.5).map((option) => option.value)}
                      onChange={(values) => updateSelected('companionScores', Object.fromEntries(
                        COMPANION_OPTIONS.map((option) => [option.value, values.includes(option.value) ? 1 : 0.5]),
                      ))}
                    />
                  </div>
                </fieldset>

                <fieldset className="admin-form-section">
                  <div className="admin-section-heading"><legend>가게 사진 <small>선택사항 · 팀 소유 자료만</small></legend><label className="admin-file-button">파일 업로드<input type="file" accept="image/*" onChange={(event) => uploadImage(event.target.files?.[0])} /></label></div>
                  <div className="admin-media-grid">
                    {(selected.images || []).map((image, index) => <article className="admin-image-editor" key={`${image.id || 'new'}-${index}`}><div className="admin-image-preview" style={{ backgroundImage: `url(${image.imageUrl})` }} /><div><select value={image.imageType} onChange={(event) => updateSelected('images', selected.images!.map((item, itemIndex) => itemIndex === index ? { ...item, imageType: event.target.value } : item))}><option value="primary">대표</option><option value="exterior">외관</option><option value="interior">내부</option><option value="gallery">기타</option></select><button type="button" onClick={() => updateSelected('images', selected.images!.filter((_, itemIndex) => itemIndex !== index))}>삭제</button></div></article>)}
                    {!selected.images?.length && <p className="admin-empty-copy">지금 등록하지 않아도 승인할 수 있습니다.</p>}
                  </div>
                </fieldset>

                <fieldset className="admin-form-section">
                  <div className="admin-section-heading"><legend>메뉴 <small>직접 확인 또는 네이버 출처</small></legend><button type="button" onClick={addMenu}>메뉴 추가</button></div>
                  <div className="admin-menu-list">
                    {(selected.menus || []).map((menu, index) => { const external = menu.source === 'apify_naver_menu'; const updateMenu = (changes: Partial<PlaceMenuInput>) => updateSelected('menus', selected.menus!.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes, ...(external ? { source: 'manual' } : {}) } : item)); const removeMenu = () => setSelected((current) => current ? { ...current, menus: current.menus!.filter((_, itemIndex) => itemIndex !== index), removedMenuIds: menu.id ? [...new Set([...(current.removedMenuIds || []), menu.id])] : current.removedMenuIds } : current); return <article className="admin-menu-editor compact" key={`${menu.id || 'new'}-${index}`}><input value={menu.name} onChange={(event) => updateMenu({ name: event.target.value })} placeholder="메뉴명" /><input value={menu.priceText ?? menu.price ?? ''} onChange={(event) => { const value = event.target.value; const digits = value.replace(/[\s,원]/g, ''); const numericPrice = /^\d+$/.test(digits) ? Number(digits) : null; updateMenu({ price: numericPrice, priceText: numericPrice === null ? value || null : null }); }} placeholder="가격 또는 가격 문의·변동" />{external ? <span className="admin-menu-source">네이버 플레이스 · 신뢰도 {formatConfidence(menu.matchConfidence)}<small>수정하면 수동 메뉴로 전환 · 최근 확인 {menu.lastVerifiedAt ? new Date(menu.lastVerifiedAt).toLocaleDateString('ko-KR') : '-'}</small></span> : null}<button type="button" onClick={removeMenu}>삭제</button></article>; })}
                    {!selected.menus?.length && <p className="admin-empty-copy">지금 등록하지 않아도 승인할 수 있습니다.</p>}
                  </div>
                </fieldset>

                <fieldset className="admin-form-section">
                  <legend>승인용 편집</legend>
                  <div className="admin-form-grid two">
                    <label>한 줄 소개<input value={editorial.shortDescription} onChange={(event) => setEditorial({ ...editorial, shortDescription: event.target.value })} /></label>
                    <TagDropdown label="추천 시간대" options={BEST_TIME_TAG_OPTIONS} values={editorial.bestTimeTags} onChange={(values) => setEditorial({ ...editorial, bestTimeTags: values })} />
                    <label>주의사항<textarea rows={3} value={editorial.caution} onChange={(event) => setEditorial({ ...editorial, caution: event.target.value })} /></label>
                  </div>
                </fieldset>
              </div>

              <footer className="admin-editor-footer">
                {selected.id && <button className="admin-danger-button" type="button" onClick={reject}>제외</button>}
                <span />
                <button className={selected.id ? 'admin-secondary-button' : 'admin-primary-button'} type="button" disabled={loading} onClick={saveCandidate}>{selected.id ? '저장' : '검수 후보로 저장'}</button>
                {selected.id && <button className="admin-primary-button" type="button" disabled={loading} onClick={approve}>추천 장소로 승인</button>}
              </footer>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
