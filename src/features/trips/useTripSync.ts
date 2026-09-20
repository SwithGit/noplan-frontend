import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../api/client';
import { getTrip, pollTrip, saveTrip } from '../../api/tripsApi';
import { draftWithBaseline, mergeTripDocuments, sameDocument } from './mergeTrip';
import { resetChangedTravel, type TripDocument, type TripRecord } from './tripModel';

interface SyncState {
  trip: TripRecord | null; remote: TripRecord | null; loading: boolean; saving: boolean;
  conflict: boolean; notice: string; blocked: boolean; autoError: boolean; connected: boolean;
}
export function useTripSync(id: string, userId: string | undefined, seed: TripRecord | null, paused: boolean, onRemoteChange: () => void) {
  const [state, setState] = useState<SyncState>({ trip: seed, remote: null, loading: Boolean(userId), saving: false, conflict: false, notice: '', blocked: false, autoError: false, connected: true });
  const current = useRef(state), busy = useRef(false), alive = useRef(true), pause = useRef(paused);
  useEffect(() => { pause.current = paused; }, [paused]);
  const update = useCallback((patch: Partial<SyncState>) => {
    if (!alive.current) return;
    current.current = { ...current.current, ...patch };
    setState(current.current);
  }, []);
  const reconcile = useCallback((incoming: TripRecord) => {
    const { trip, remote, conflict } = current.current;
    if (!trip) { update({ trip: incoming, remote: incoming, conflict: false }); return; }
    if (conflict) { update({ remote: incoming }); return; }
    if (incoming.version === trip.version) {
      update({ remote: incoming, trip: { ...trip, collaboration: incoming.collaboration, baseDocument: incoming.document } });
      return;
    }
    const base = remote?.version === trip.version ? remote.document : trip.baseDocument;
    const merged = base ? mergeTripDocuments(base, trip.document, incoming.document)
      : sameDocument(trip.document, incoming.document) ? incoming.document : null;
    if (!merged) {
      update({ remote: incoming, trip: { ...trip, baseDocument: base }, conflict: true, notice: '같은 항목을 서로 다르게 수정했어요. 충돌 해결에서 반영할 내용을 선택해 주세요.' });
      return;
    }
    onRemoteChange();
    update({ remote: incoming, trip: { ...incoming, document: resetChangedTravel(incoming.document, merged), baseDocument: incoming.document }, notice: '친구의 변경사항을 반영했어요.' });
  }, [onRemoteChange, update]);
  const reportError = useCallback((cause: unknown, forSave = false) => {
    const denied = cause instanceof ApiError && [401, 403, 404].includes(cause.status);
    update({ connected: false, blocked: denied, ...(forSave ? { autoError: true } : {}), notice: denied
      ? '로그인이 만료되었거나 공동 편집 권한이 변경됐어요. 내 작업본은 이 브라우저에 남아 있어요.'
      : cause instanceof Error ? `${cause.message} 내 작업본은 유지됩니다.` : '연결이 끊겼어요. 내 작업본은 유지됩니다.' });
  }, [update]);
  useEffect(() => {
    alive.current = true;
    if (!userId) return () => { alive.current = false; };
    let cancelled = false;
    busy.current = true;
    getTrip(id).then(incoming => {
      if (!cancelled) { reconcile(incoming); update({ loading: false }); }
    }).catch(cause => {
      if (cancelled) return;
      if (!(seed?.version === 0 && cause instanceof ApiError && cause.status === 404)) reportError(cause);
      update({ loading: false });
    }).finally(() => { if (!cancelled) busy.current = false; });
    return () => { cancelled = true; alive.current = false; };
  }, [id, userId, seed, reconcile, reportError, update]);
  const refresh = useCallback(async () => {
    const s = current.current;
    if (!userId || !s.trip?.version || s.loading || busy.current || pause.current || s.blocked) return;
    busy.current = true;
    try {
      const incoming = await pollTrip(id, s.trip.version);
      if (!alive.current || pause.current) return;
      update({ connected: true });
      if (incoming.trip) reconcile(incoming.trip);
      else if (current.current.trip) update({ trip: { ...current.current.trip, collaboration: incoming.collaboration } });
    } catch (cause) { reportError(cause); }
    finally { busy.current = false; }
  }, [id, userId, reconcile, reportError, update]);
  useEffect(() => {
    if (!userId) return;
    const tick = () => { if (document.visibilityState === 'visible') void refresh(); };
    const timer = window.setInterval(tick, 3000);
    window.addEventListener('online', tick); window.addEventListener('focus', tick);
    return () => { window.clearInterval(timer); window.removeEventListener('online', tick); window.removeEventListener('focus', tick); };
  }, [userId, refresh]);
  const save = useCallback(async () => {
    if (!userId) { update({ notice: '로그인 후 계정에 저장하면 친구와 함께 편집할 수 있어요.' }); return false; }
    if (busy.current || current.current.loading || current.current.conflict || current.current.blocked || !current.current.trip) return false;
    busy.current = true; update({ saving: true, autoError: false });
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const trip = current.current.trip!;
        try {
          const result = await saveTrip(trip);
          update({ trip: { ...result, baseDocument: result.document }, remote: result, connected: true, notice: result.collaboration?.enabled ? '' : '계정에 저장했어요.', conflict: false });
          return true;
        } catch (cause) {
          if (!(cause instanceof ApiError && cause.status === 409)) throw cause;
          reconcile(await getTrip(id));
          if (current.current.conflict) return false;
        }
      }
      update({ autoError: true, notice: '친구가 계속 수정 중이에요. 잠시 후 다시 저장해 주세요.' });
      return false;
    } catch (cause) { reportError(cause, true); return false; }
    finally { busy.current = false; update({ saving: false }); }
  }, [id, userId, reconcile, reportError, update]);
  const dirty = Boolean(state.trip && (!state.remote || !sameDocument(state.trip.document, state.remote.document)));
  useEffect(() => {
    if (!state.trip?.collaboration?.enabled || !dirty || paused || state.loading || state.saving || state.conflict || state.blocked || state.autoError) return;
    const attempt = () => {
      if (busy.current) { timer = window.setTimeout(attempt, 300); return; }
      void save();
    };
    let timer = window.setTimeout(attempt, 800);
    return () => window.clearTimeout(timer);
  }, [state.trip, state.loading, state.saving, state.conflict, state.blocked, state.autoError, paused, dirty, save]);
  const setTrip = useCallback((trip: TripRecord) => {
    if (current.current.saving || current.current.loading) return;
    update({ trip: draftWithBaseline(trip, current.current.remote), autoError: false });
  }, [update]);
  const openLatest = useCallback(async () => {
    if (busy.current || !window.confirm('현재 작업본을 최신 저장 내용으로 바꿀까요? 작업본을 남기려면 먼저 새 여행으로 복사해 주세요.')) return;
    busy.current = true; update({ saving: true });
    try {
      const incoming = await getTrip(id);
      onRemoteChange(); update({ trip: incoming, remote: incoming, conflict: false, blocked: false, autoError: false, connected: true, notice: '최신 일정을 열었어요.' });
    } catch (cause) { reportError(cause); }
    finally { busy.current = false; update({ saving: false }); }
  }, [id, onRemoteChange, reportError, update]);
  const resolveConflict = (document: TripDocument, remoteVersion: number) => {
    const latest = current.current.remote;
    if (!latest || latest.version !== remoteVersion || current.current.saving || current.current.blocked) throw new Error('친구가 일정을 다시 수정했어요. 최신 내용을 확인해 주세요.');
    onRemoteChange();
    update({ trip: { ...latest, document: resetChangedTravel(latest.document, document), baseDocument: latest.document }, conflict: false, autoError: false, notice: '선택한 수정 내용을 반영했어요.' });
  };
  return { ...state, dirty, setTrip, save, openLatest, resolveConflict, setNotice: (notice: string) => update({ notice }) };
}
