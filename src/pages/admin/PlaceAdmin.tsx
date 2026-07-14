import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  approvePlaceCandidate,
  checkAdminAccess,
  collectApifyCandidates,
  createPlaceCandidate,
  getPlaceCandidate,
  listPlaceCandidates,
  rejectPlaceCandidate,
  updatePlaceCandidate,
  uploadPlaceImage,
  type CandidateStatus,
  type PlaceCandidate,
  type PlaceImageInput,
  type PlaceMenuInput,
  type PlaceType,
  type RegionKey,
} from '../../api/adminPlacesApi';

const REGION_OPTIONS: Array<{ key: RegionKey; label: string }> = [
  { key: 'hongdae', label: '홍대입구역' },
  { key: 'seongsu', label: '성수역' },
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

function emptyCandidate(regionKey: RegionKey): PlaceCandidate {
  return {
    provider: 'manual',
    providerPlaceId: '',
    name: '',
    regionKey,
    nearestStation: regionKey === 'hongdae' ? '홍대입구역' : '성수역',
    entityType: 'venue',
    primaryType: 'food',
    detailType: '한식',
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

function commaText(values?: string[]) {
  return Array.isArray(values) ? values.join(', ') : '';
}

function commaValues(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function displayAddress(candidate: PlaceCandidate) {
  return candidate.roadAddress || candidate.address || '주소 미등록';
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
  const [selected, setSelected] = useState<PlaceCandidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [editorial, setEditorial] = useState({
    shortDescription: '',
    reviewSummary: '',
    recommendationReason: '',
    caution: '',
    bestTimeTags: '',
    editorialScore: 50,
  });

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

  const loadQueue = useCallback(async () => {
    const result = await listPlaceCandidates(adminKey, adminId || 'team', regionKey, status);
    setCandidates(result.candidates);
  }, [adminId, adminKey, regionKey, status]);

  useEffect(() => {
    if (!unlocked) return;
    loadQueue().catch(() => undefined);
  }, [loadQueue, unlocked]);

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
      setStatus('pending');
      setSelected(null);
      const queue = await listPlaceCandidates(adminKey, adminId, regionKey, 'pending');
      setCandidates(queue.candidates);
      const targetMessage = result.exhausted
        ? `조건에 맞는 신규 후보가 ${result.acceptedCount}개뿐입니다.`
        : `목표 ${result.targetCount}개를 모두 채웠습니다.`;
      const menuMessage = result.menuCollectionWarning
        ? '메뉴 보강은 실패해 장소 정보만 저장했습니다.'
        : `신규 메뉴 보강 ${Math.max(0, result.menuEnrichedCount - result.menuBackfilledCount)}곳 · 기존 후보 메뉴 보강 ${result.menuBackfilledCount}곳 완료.`;
      setNotice(`Apify 수집 완료: 원본 ${result.rawCount}개 확인 · ${targetMessage} ${menuMessage} 기존 중복 ${result.skipped.duplicate}개 제외.`);
    }).catch(() => undefined);
  };

  const openCandidate = async (candidateId?: number) => {
    if (!candidateId) return;
    await run(async () => {
      const result = await getPlaceCandidate(adminKey, adminId, candidateId);
      setSelected(result.candidate);
    }).catch(() => undefined);
  };

  const saveCandidate = async () => {
    if (!selected) return;
    await run(async () => {
      if (selected.id) await updatePlaceCandidate(adminKey, adminId, selected);
      else {
        const result = await createPlaceCandidate(adminKey, adminId, selected);
        const detail = await getPlaceCandidate(adminKey, adminId, result.candidateId);
        setSelected(detail.candidate);
        setStatus('pending');
      }
      await loadQueue();
    }, selected.id ? '장소 정보를 저장했습니다.' : '상세 정보가 포함된 검수 후보로 등록했습니다.').catch(() => undefined);
  };

  const approve = async () => {
    if (!selected?.id) return;
    await run(async () => {
      await updatePlaceCandidate(adminKey, adminId, selected);
      await approvePlaceCandidate(adminKey, adminId, selected.id!, {
        ...editorial,
        bestTimeTags: commaValues(editorial.bestTimeTags),
      });
      setSelected(null);
      setStatus('approved');
    }, '추천 장소로 승인했습니다.').catch(() => undefined);
  };

  const reject = async () => {
    if (!selected?.id) return;
    const reason = window.prompt('제외 사유를 입력해 주세요.', '실제 방문 업장이 아니거나 조건에 맞지 않음');
    if (!reason) return;
    await run(async () => {
      await rejectPlaceCandidate(adminKey, adminId, selected.id!, reason);
      setSelected(null);
      await loadQueue();
    }, '후보를 제외했습니다.').catch(() => undefined);
  };

  const updateSelected = <K extends keyof PlaceCandidate>(key: K, value: PlaceCandidate[K]) => {
    setSelected((current) => current ? { ...current, [key]: value } : current);
  };

  const addImageUrl = () => {
    if (!selected) return;
    const next: PlaceImageInput = {
      imageUrl: '',
      imageType: selected.images?.length ? 'gallery' : 'primary',
      isPrimary: !selected.images?.length,
      source: 'manual',
    };
    updateSelected('images', [...(selected.images || []), next]);
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
    }, '사진을 업로드했습니다.').catch(() => undefined);
  };

  const detailOptions = useMemo(
    () => selected ? DETAIL_OPTIONS[selected.primaryType] : [],
    [selected],
  );

  if (!unlocked) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-panel">
          <div className="admin-brand-mark">NP</div>
          <div>
            <p className="admin-eyebrow">NoPlan operations</p>
            <h1>장소 관리자</h1>
            <p>팀원 정보와 서버에 설정한 관리자 키로 접속합니다.</p>
          </div>
          <label>
            팀원 이름
            <input value={adminId} onChange={(event) => setAdminId(event.target.value)} placeholder="예: 지혁" />
          </label>
          <label>
            관리자 키
            <input type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && unlock()} />
          </label>
          {error && <p className="admin-alert error">{error}</p>}
          <button className="admin-primary-button" type="button" disabled={loading} onClick={unlock}>
            관리자 도구 열기
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="place-admin-page">
      <header className="place-admin-header">
        <div>
          <p className="admin-eyebrow">NoPlan place catalog</p>
          <h1>장소 수집·검수</h1>
        </div>
        <div className="admin-header-actions">
          <div className="admin-segmented" aria-label="관리 지역">
            {REGION_OPTIONS.map((region) => (
              <button className={regionKey === region.key ? 'active' : ''} key={region.key} type="button" onClick={() => {
                setRegionKey(region.key);
                setSelected(null);
              }}>
                {region.label}
              </button>
            ))}
          </div>
          <span className="admin-user-chip">{adminId}</span>
          <button className="admin-quiet-button" type="button" onClick={() => {
            sessionStorage.removeItem('noplanAdminKey');
            setUnlocked(false);
          }}>잠금</button>
        </div>
      </header>

      {(notice || error) && (
        <div className={`admin-alert ${error ? 'error' : 'success'}`}>{error || notice}</div>
      )}

      <div className="place-admin-workspace">
        <aside className="admin-discovery-panel">
          <section className="admin-panel-block">
            <div className="admin-section-heading">
              <div><span>장소 찾기</span><small>Apify 조건 일괄 수집</small></div>
              <button className="admin-quiet-button" type="button" onClick={() => setSelected(emptyCandidate(regionKey))}>직접 등록</button>
            </div>
            <ol className="admin-collection-flow" aria-label="장소 등록 진행 순서">
              <li><b>1</b>조건 입력</li><li><b>2</b>일괄 수집</li><li><b>3</b>분류</li><li><b>4</b>승인</li>
            </ol>
            <div className="admin-search-row">
              <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && search()} placeholder="예: 보드게임, 해산물, 공방" />
              <button className="admin-primary-button" type="button" disabled={loading} onClick={search}>{loading ? '수집 중' : 'Apify 후보 수집'}</button>
            </div>
            <div className="admin-collection-filters">
              <label>목표 후보<input type="number" min="1" max="100" value={targetCount} onChange={(event) => setTargetCount(Number(event.target.value))} /></label>
              <label>최소 별점<input type="number" min="0" max="5" step="0.1" value={minRating} onChange={(event) => setMinRating(Number(event.target.value))} /></label>
              <label>최소 리뷰<input type="number" min="0" value={minReviewCount} onChange={(event) => setMinReviewCount(Number(event.target.value))} /></label>
            </div>
          </section>

          <section className="admin-panel-block queue-block">
            <div className="admin-section-heading"><div><span>검수함</span><small>{candidates.length}개 장소</small></div></div>
            <div className="admin-status-tabs">
              {STATUS_OPTIONS.map((option) => (
                <button className={status === option.value ? 'active' : ''} key={option.value} type="button" onClick={() => setStatus(option.value)}>{option.label}</button>
              ))}
            </div>
            <div className="admin-candidate-list">
              {candidates.map((candidate) => (
                <button className={`admin-candidate-row ${selected?.id === candidate.id ? 'active' : ''}`} key={candidate.id} type="button" onClick={() => openCandidate(candidate.id)}>
                  <span className="admin-candidate-thumb" style={candidate.primaryImageUrl ? { backgroundImage: `url(${candidate.primaryImageUrl})` } : undefined} />
                  <span>
                    <strong>{candidate.name}</strong>
                    <small>{candidate.detailType || candidate.primaryType} · 사진 {candidate.imageCount || 0} · 메뉴 {candidate.menuCount || 0}</small>
                  </span>
                </button>
              ))}
              {!candidates.length && <p className="admin-empty-copy">이 상태의 장소가 없습니다.</p>}
            </div>
          </section>
        </aside>

        <section className="admin-editor-panel">
          {!selected ? (
            <div className="admin-editor-empty">
              <div className="admin-brand-mark">NP</div>
              <h2>검수할 장소를 선택하세요</h2>
              <p>왼쪽에서 검색하거나 검수함의 장소를 열면 상세 정보가 표시됩니다.</p>
            </div>
          ) : (
            <>
              <div className="admin-editor-toolbar">
                <div>
                  <span className={`admin-entity-badge ${selected.entityType !== 'venue' ? 'warning' : ''}`}>{selected.entityType}</span>
                  <h2>{selected.name || '새 장소'}</h2>
                  <p>{displayAddress(selected)}</p>
                </div>
                <div>
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
                    <label>큰 분류<select value={selected.primaryType} onChange={(event) => {
                      const primaryType = event.target.value as PlaceType;
                      setSelected({ ...selected, primaryType, detailType: DETAIL_OPTIONS[primaryType][0] });
                    }}>{TYPE_OPTIONS.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
                    <label>상세 분류<select value={selected.detailType || ''} onChange={(event) => updateSelected('detailType', event.target.value)}>{detailOptions.map((detail) => <option key={detail}>{detail}</option>)}</select></label>
                    <label className="admin-check-label"><input type="checkbox" checked={selected.isFranchise} onChange={(event) => updateSelected('isFranchise', event.target.checked)} />프랜차이즈</label>
                  </div>
                  <div className="admin-form-grid two">
                    <label>도로명 주소<input value={selected.roadAddress || ''} onChange={(event) => updateSelected('roadAddress', event.target.value)} /></label>
                    <label>전화번호<input value={selected.phone || ''} onChange={(event) => updateSelected('phone', event.target.value)} /></label>
                    <label>위도<input type="number" value={selected.latitude ?? ''} onChange={(event) => updateSelected('latitude', Number(event.target.value))} /></label>
                    <label>경도<input type="number" value={selected.longitude ?? ''} onChange={(event) => updateSelected('longitude', Number(event.target.value))} /></label>
                  </div>
                </fieldset>

                <fieldset className="admin-form-section">
                  <legend>추천 판단 정보</legend>
                  <div className="admin-form-grid three">
                    <label>평점<input type="number" step="0.1" value={selected.rating ?? ''} onChange={(event) => updateSelected('rating', Number(event.target.value))} /></label>
                    <label>리뷰 수<input type="number" value={selected.reviewCount ?? ''} onChange={(event) => updateSelected('reviewCount', Number(event.target.value))} /></label>
                    <label>평균 체류시간(분)<input type="number" value={selected.averageStayMinutes ?? ''} onChange={(event) => updateSelected('averageStayMinutes', Number(event.target.value))} /></label>
                    <label>1인 평균 비용<input type="number" value={selected.priceAverage ?? ''} onChange={(event) => updateSelected('priceAverage', Number(event.target.value))} /></label>
                    <label>최소 인원<input type="number" value={selected.recommendedPaxMin ?? 1} onChange={(event) => updateSelected('recommendedPaxMin', Number(event.target.value))} /></label>
                    <label>최대 인원<input type="number" value={selected.recommendedPaxMax ?? 6} onChange={(event) => updateSelected('recommendedPaxMax', Number(event.target.value))} /></label>
                  </div>
                  <label>영업시간<textarea rows={3} value={selected.businessHoursRaw || ''} onChange={(event) => updateSelected('businessHoursRaw', event.target.value)} /></label>
                  <div className="admin-form-grid three">
                    <label>목적 태그<input value={commaText(selected.intentTags)} onChange={(event) => updateSelected('intentTags', commaValues(event.target.value))} placeholder="데이트, 해산물, 식사" /></label>
                    <label>분위기 태그<input value={commaText(selected.atmosphereTags)} onChange={(event) => updateSelected('atmosphereTags', commaValues(event.target.value))} placeholder="조용한, 사진 예쁜" /></label>
                    <label>편의 태그<input value={commaText(selected.amenityTags)} onChange={(event) => updateSelected('amenityTags', commaValues(event.target.value))} placeholder="예약, 주차, 단체석" /></label>
                  </div>
                </fieldset>

                <fieldset className="admin-form-section">
                  <div className="admin-section-heading"><legend>가게 사진</legend><div className="admin-inline-actions"><label className="admin-file-button">파일 업로드<input type="file" accept="image/*" onChange={(event) => uploadImage(event.target.files?.[0])} /></label><button type="button" onClick={addImageUrl}>URL 추가</button></div></div>
                  <div className="admin-media-grid">
                    {(selected.images || []).map((image, index) => (
                      <article className="admin-image-editor" key={`${image.id || 'new'}-${index}`}>
                        <div className="admin-image-preview" style={image.imageUrl ? { backgroundImage: `url(${image.imageUrl})` } : undefined} />
                        <input value={image.imageUrl} onChange={(event) => updateSelected('images', selected.images!.map((item, itemIndex) => itemIndex === index ? { ...item, imageUrl: event.target.value } : item))} placeholder="https://..." />
                        <div><select value={image.imageType} onChange={(event) => updateSelected('images', selected.images!.map((item, itemIndex) => itemIndex === index ? { ...item, imageType: event.target.value } : item))}><option value="primary">대표</option><option value="exterior">외관</option><option value="interior">내부</option><option value="food">음식</option><option value="menu_board">메뉴판</option><option value="gallery">기타</option></select><button type="button" onClick={() => updateSelected('images', selected.images!.filter((_, itemIndex) => itemIndex !== index))}>삭제</button></div>
                      </article>
                    ))}
                    {!selected.images?.length && <p className="admin-empty-copy">승인하려면 사진을 한 장 이상 등록해야 합니다.</p>}
                  </div>
                </fieldset>

                <fieldset className="admin-form-section">
                  <div className="admin-section-heading"><legend>메뉴</legend><button type="button" onClick={addMenu}>메뉴 추가</button></div>
                  <div className="admin-menu-list">
                    {(selected.menus || []).map((menu, index) => (
                      <article className="admin-menu-editor" key={`${menu.id || 'new'}-${index}`}>
                        <input value={menu.name} onChange={(event) => updateSelected('menus', selected.menus!.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} placeholder="메뉴명" />
                        <input type="number" value={menu.price ?? ''} onChange={(event) => updateSelected('menus', selected.menus!.map((item, itemIndex) => itemIndex === index ? { ...item, price: Number(event.target.value) } : item))} placeholder="가격" />
                        <input value={menu.imageUrl || ''} onChange={(event) => updateSelected('menus', selected.menus!.map((item, itemIndex) => itemIndex === index ? { ...item, imageUrl: event.target.value } : item))} placeholder="메뉴 사진 URL" />
                        <label className="admin-check-label"><input type="checkbox" checked={Boolean(menu.isSignature)} onChange={(event) => updateSelected('menus', selected.menus!.map((item, itemIndex) => itemIndex === index ? { ...item, isSignature: event.target.checked } : item))} />대표</label>
                        <button type="button" onClick={() => updateSelected('menus', selected.menus!.filter((_, itemIndex) => itemIndex !== index))}>삭제</button>
                      </article>
                    ))}
                    {!selected.menus?.length && <p className="admin-empty-copy">메뉴 정보가 아직 없습니다.</p>}
                  </div>
                </fieldset>

                <fieldset className="admin-form-section">
                  <legend>승인용 편집</legend>
                  <div className="admin-form-grid two">
                    <label>한 줄 소개<input value={editorial.shortDescription} onChange={(event) => setEditorial({ ...editorial, shortDescription: event.target.value })} /></label>
                    <label>추천 시간대<input value={editorial.bestTimeTags} onChange={(event) => setEditorial({ ...editorial, bestTimeTags: event.target.value })} placeholder="점심, 오후, 저녁" /></label>
                    <label>추천 이유<textarea rows={3} value={editorial.recommendationReason} onChange={(event) => setEditorial({ ...editorial, recommendationReason: event.target.value })} /></label>
                    <label>주의사항<textarea rows={3} value={editorial.caution} onChange={(event) => setEditorial({ ...editorial, caution: event.target.value })} /></label>
                  </div>
                  <label>리뷰 요약<textarea rows={3} value={editorial.reviewSummary} onChange={(event) => setEditorial({ ...editorial, reviewSummary: event.target.value })} /></label>
                </fieldset>
              </div>

              <footer className="admin-editor-footer">
                {selected.id && <button className="admin-danger-button" type="button" onClick={reject}>제외</button>}
                <span />
                <button className={selected.id ? 'admin-secondary-button' : 'admin-primary-button'} type="button" disabled={loading} onClick={saveCandidate}>{selected.id ? '저장' : '후보 등록'}</button>
                {selected.id && <button className="admin-primary-button" type="button" disabled={loading} onClick={approve}>추천 장소로 승인</button>}
              </footer>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
