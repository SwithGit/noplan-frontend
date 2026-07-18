import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  approvePlaceCandidate,
  checkAdminAccess,
  collectApifyCandidates,
  createPlaceCandidate,
  getPlaceCandidate,
  getPlaceCoverage,
  listPlaceCandidates,
  rejectPlaceCandidate,
  updatePlaceCandidate,
  uploadPlaceImage,
  type CandidateStatus,
  type PlaceCandidate,
  type PlaceCoverage,
  type PlaceImageInput,
  type PlaceMenuInput,
  type PlaceType,
  type RegionKey,
} from '../../api/adminPlacesApi';
import { PlaceVisual } from '../../components/ui/PlaceVisual';

const REGION_OPTIONS: Array<{ key: RegionKey; label: string }> = [
  { key: 'hongdae', label: '홍대입구역' },
];

const TYPE_OPTIONS: Array<{ value: PlaceType; label: string }> = [
  { value: 'food', label: '음식점' },
  { value: 'cafe', label: '카페·디저트' },
  { value: 'activity', label: '놀거리·문화' },
  { value: 'drink', label: '술·야간' },
  { value: 'hotplace', label: '산책·구경' },
];

const DETAIL_OPTIONS: Record<PlaceType, string[]> = {
  food: ['해산물', '고기', '한식', '일식', '중식', '양식', '분식', '기타 음식'],
  cafe: ['커피', '디저트', '베이커리', '브런치', '기타 카페'],
  activity: ['공방/체험', '방탈출', '보드게임', '볼링', '노래방', '오락실', '스포츠', '전시', '영화', '공연', '팝업', '미술관/박물관'],
  drink: ['펍', '포차', '와인/칵테일', '이자카야', '기타 술집'],
  hotplace: ['산책', '공원', '야경', '쇼핑몰', '시장/상권', '기타 명소'],
};

const STATUS_OPTIONS: Array<{ value: CandidateStatus; label: string }> = [
  { value: 'pending', label: '검수 대기' },
  { value: 'approved', label: '승인됨' },
  { value: 'rejected', label: '제외됨' },
];

const INTENT_TAG_OPTIONS = [
  '데이트/로맨스',
  '편한 모임',
  '회식/단체',
  '자기계발',
  '경험/체험',
  '감정/무드',
] as const;

const ATMOSPHERE_TAG_OPTIONS = [
  '조용한',
  '활기찬',
  '깔끔한',
  '이색적인',
  '인스타 감성',
] as const;

interface TagDropdownProps {
  label: string;
  options: readonly string[];
  values: string[];
  onChange: (values: string[]) => void;
}

function TagDropdown({ label, options, values, onChange }: TagDropdownProps) {
  const selectedValues = options.filter((option) => values.includes(option));

  const toggleOption = (option: string) => {
    const nextValues = new Set(selectedValues);
    if (nextValues.has(option)) nextValues.delete(option);
    else nextValues.add(option);
    onChange(options.filter((item) => nextValues.has(item)));
  };

  return (
    <div className="admin-tag-field">
      <span className="admin-tag-label">{label}</span>
      <details className="admin-tag-dropdown">
        <summary>
          <span className={selectedValues.length ? '' : 'placeholder'}>
            {selectedValues.length ? selectedValues.join(', ') : '선택하세요'}
          </span>
          <span aria-hidden="true" className="admin-tag-chevron">⌄</span>
        </summary>
        <div className="admin-tag-options" role="group" aria-label={`${label} 선택`}>
          {options.map((option) => (
            <label className="admin-tag-option" key={option}>
              <input
                type="checkbox"
                checked={selectedValues.includes(option)}
                onChange={() => toggleOption(option)}
              />
              <span>{option}</span>
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
    nearestStation: '홍대입구역',
    entityType: 'venue',
    primaryType: 'activity',
    detailType: '보드게임',
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

function commaValues(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function emptyEditorial() {
  return {
    shortDescription: '',
    caution: '',
    bestTimeTags: '',
    editorialScore: 50,
  };
}

function displayAddress(candidate: PlaceCandidate) {
  return candidate.roadAddress || candidate.address || '주소 미등록';
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
  const [query, setQuery] = useState('');
  const [targetCount, setTargetCount] = useState(30);
  const [minRating, setMinRating] = useState(3.5);
  const [minReviewCount, setMinReviewCount] = useState(30);
  const [candidates, setCandidates] = useState<PlaceCandidate[]>([]);
  const [coverage, setCoverage] = useState<PlaceCoverage[]>([]);
  const [selected, setSelected] = useState<PlaceCandidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [editorial, setEditorial] = useState(emptyEditorial);

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
      listPlaceCandidates(adminKey, adminId || 'team', regionKey, status),
      getPlaceCoverage(adminKey, adminId || 'team', regionKey),
    ]);
    setCandidates(queue.candidates);
    setCoverage(coverageResult.coverage);
  }, [adminId, adminKey, regionKey, status]);

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
      });
      const [queue, coverageResult] = await Promise.all([
        listPlaceCandidates(adminKey, adminId, regionKey, 'pending'),
        getPlaceCoverage(adminKey, adminId, regionKey),
      ]);
      setStatus('pending');
      setCandidates(queue.candidates);
      setCoverage(coverageResult.coverage);
      setSelected(null);
      const skippedCount = Object.values(result.skipped).reduce((sum, count) => sum + count, 0);
      setNotice(
        `Apify 수집 완료: 원본 ${result.rawCount}개 중 신규 ${result.inserted}개가 검수함에 들어갔습니다. `
        + `기준 미달·중복 등 제외 ${skippedCount}개.`,
      );
    }).catch(() => undefined);
  };

  const openCandidate = async (candidateId?: number) => {
    if (!candidateId) return;
    await run(async () => {
      const result = await getPlaceCandidate(adminKey, adminId, candidateId);
      setSelected(result.candidate);
      setEditorial(emptyEditorial());
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
    await run(async () => {
      if (selected.id) {
        await updatePlaceCandidate(adminKey, adminId, selected);
        await loadWorkspace();
      } else {
        const result = await createPlaceCandidate(adminKey, adminId, selected);
        const detail = await getPlaceCandidate(adminKey, adminId, result.candidateId);
        const [queue, coverageResult] = await Promise.all([
          listPlaceCandidates(adminKey, adminId, regionKey, 'pending'),
          getPlaceCoverage(adminKey, adminId, regionKey),
        ]);
        setSelected(detail.candidate);
        setStatus('pending');
        setCandidates(queue.candidates);
        setCoverage(coverageResult.coverage);
      }
    }, selected.id ? '장소 정보를 저장했습니다.' : '검수 후보로 저장했습니다. 이제 확인 후 승인할 수 있습니다.').catch(() => undefined);
  };

  const approve = async () => {
    if (!selected?.id) return;
    await run(async () => {
      await updatePlaceCandidate(adminKey, adminId, selected);
      await approvePlaceCandidate(adminKey, adminId, selected.id!, {
        ...editorial,
        bestTimeTags: commaValues(editorial.bestTimeTags),
      });
      const [queue, coverageResult] = await Promise.all([
        listPlaceCandidates(adminKey, adminId, regionKey, 'approved'),
        getPlaceCoverage(adminKey, adminId, regionKey),
      ]);
      setCandidates(queue.candidates);
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

  const detailOptions = useMemo(() => selected ? DETAIL_OPTIONS[selected.primaryType] : [], [selected]);
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
            {REGION_OPTIONS.map((region) => <button className={regionKey === region.key ? 'active' : ''} key={region.key} type="button" onClick={() => setRegionKey(region.key)}>{region.label}</button>)}
          </div>
          <span className="admin-user-chip">{adminId}</span>
          <button className="admin-quiet-button" type="button" onClick={() => { sessionStorage.removeItem('noplanAdminKey'); setUnlocked(false); }}>잠금</button>
        </div>
      </header>

      {(notice || error) && <div className={`admin-alert ${error ? 'error' : 'success'}`}>{error || notice}</div>}

      <section className="admin-coverage-strip" aria-label="승인 장소 커버리지">
        <div><strong>홍대 승인 장소 현황</strong><span>상세 분류별 최소 3곳 권장</span></div>
        <div className="admin-coverage-list">
          {coverage.length ? coverage.map((item) => (
            <span className={item.shortage ? 'shortage' : ''} key={`${item.primaryType}-${item.detailType}`}>
              {item.detailType} {item.count}곳{item.shortage ? ' · 후보 부족' : ''}
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
              <label>목표 후보<input min="1" max="100" type="number" value={targetCount} onChange={(event) => setTargetCount(Number(event.target.value) || 1)} /></label>
              <label>최소 별점<input min="0" max="5" step="0.1" type="number" value={minRating} onChange={(event) => setMinRating(Number(event.target.value) || 0)} /></label>
              <label>최소 리뷰<input min="0" type="number" value={minReviewCount} onChange={(event) => setMinReviewCount(Number(event.target.value) || 0)} /></label>
            </div>
          </section>

          <section className="admin-panel-block queue-block">
            <div className="admin-section-heading"><div><span>검수함</span><small>{candidates.length}개 장소</small></div></div>
            <div className="admin-status-tabs">
              {STATUS_OPTIONS.map((option) => <button className={status === option.value ? 'active' : ''} key={option.value} type="button" onClick={() => setStatus(option.value)}>{option.label}</button>)}
            </div>
            <div className="admin-candidate-list">
              {candidates.map((candidate) => (
                <button className={`admin-candidate-row ${selected?.id === candidate.id ? 'active' : ''}`} key={candidate.id} type="button" onClick={() => openCandidate(candidate.id)}>
                  <PlaceVisual alt={candidate.name} imageUrl={candidate.primaryImageUrl || undefined} type={candidate.primaryType} detailType={candidate.detailType || undefined} />
                  <span><strong>{candidate.name}</strong><small>{candidate.detailType || candidate.primaryType} · 별점 {candidate.rating ?? '-'} · 리뷰 {candidate.reviewCount ?? 0} · 사진 {candidate.imageCount || 0} · 메뉴 {candidate.menuCount || 0}</small></span>
                </button>
              ))}
              {!candidates.length && <p className="admin-empty-copy">이 상태의 장소가 없습니다.</p>}
            </div>
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
                  {selected.id && <button className="admin-secondary-button" type="button" disabled={loading} onClick={saveCandidate}>저장</button>}
                </div>
              </div>

              <div className="admin-editor-scroll">
                <fieldset className="admin-form-section">
                  <legend>기본 정보</legend>
                  <div className="admin-form-grid three">
                    <label>장소명<input value={selected.name} onChange={(event) => updateSelected('name', event.target.value)} /></label>
                    <label>지점명<input value={selected.branchName || ''} onChange={(event) => updateSelected('branchName', event.target.value)} /></label>
                    <label>실제 업장 여부<select value={selected.entityType} onChange={(event) => updateSelected('entityType', event.target.value)}><option value="venue">실제 방문 업장</option><option value="organization">협회·단체</option><option value="office">사무실·본사</option><option value="public">공공시설</option><option value="unknown">확인 필요</option></select></label>
                    <label>큰 분류<select value={selected.primaryType} onChange={(event) => { const primaryType = event.target.value as PlaceType; setSelected({ ...selected, primaryType, detailType: DETAIL_OPTIONS[primaryType][0] }); }}>{TYPE_OPTIONS.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
                    <label>상세 분류<select value={selected.detailType || ''} onChange={(event) => updateSelected('detailType', event.target.value)}>{detailOptions.map((detail) => <option key={detail}>{detail}</option>)}</select></label>
                    <label className="admin-check-label"><input type="checkbox" checked={selected.isFranchise} onChange={(event) => updateSelected('isFranchise', event.target.checked)} />프랜차이즈</label>
                  </div>
                  <div className="admin-form-grid two">
                    <label>도로명 주소<input readOnly={selected.provider === 'kakao_local'} value={selected.roadAddress || ''} onChange={(event) => updateSelected('roadAddress', event.target.value)} /></label>
                    <label>전화번호<input readOnly={selected.provider === 'kakao_local'} value={selected.phone || ''} onChange={(event) => updateSelected('phone', event.target.value)} /></label>
                    <label>위도<input readOnly={selected.provider === 'kakao_local'} type="number" value={selected.latitude ?? ''} onChange={(event) => updateSelected('latitude', Number(event.target.value))} /></label>
                    <label>경도<input readOnly={selected.provider === 'kakao_local'} type="number" value={selected.longitude ?? ''} onChange={(event) => updateSelected('longitude', Number(event.target.value))} /></label>
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
                      label="목적 태그"
                      options={INTENT_TAG_OPTIONS}
                      values={selected.intentTags}
                      onChange={(values) => updateSelected('intentTags', values)}
                    />
                    <TagDropdown
                      label="분위기 태그"
                      options={ATMOSPHERE_TAG_OPTIONS}
                      values={selected.atmosphereTags}
                      onChange={(values) => updateSelected('atmosphereTags', values)}
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
                  <div className="admin-section-heading"><legend>메뉴 <small>선택사항 · 직접 확인한 정보만</small></legend><button type="button" onClick={addMenu}>메뉴 추가</button></div>
                  <div className="admin-menu-list">
                    {(selected.menus || []).map((menu, index) => <article className="admin-menu-editor compact" key={`${menu.id || 'new'}-${index}`}><input value={menu.name} onChange={(event) => updateSelected('menus', selected.menus!.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="메뉴명" /><input type="number" value={menu.price ?? ''} onChange={(event) => updateSelected('menus', selected.menus!.map((item, itemIndex) => itemIndex === index ? { ...item, price: Number(event.target.value) } : item))} placeholder="가격" /><button type="button" onClick={() => updateSelected('menus', selected.menus!.filter((_, itemIndex) => itemIndex !== index))}>삭제</button></article>)}
                    {!selected.menus?.length && <p className="admin-empty-copy">지금 등록하지 않아도 승인할 수 있습니다.</p>}
                  </div>
                </fieldset>

                <fieldset className="admin-form-section">
                  <legend>승인용 편집</legend>
                  <div className="admin-form-grid two">
                    <label>한 줄 소개<input value={editorial.shortDescription} onChange={(event) => setEditorial({ ...editorial, shortDescription: event.target.value })} /></label>
                    <label>추천 시간대<input value={editorial.bestTimeTags} onChange={(event) => setEditorial({ ...editorial, bestTimeTags: event.target.value })} placeholder="점심, 오후, 저녁" /></label>
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
