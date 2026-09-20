import type { TripDocument, TripRecord } from './tripModel';

export function draftWithBaseline(trip: TripRecord, remote: TripRecord | null): TripRecord {
  // A newer remote version is not the base of a conflicted local draft.
  return { ...trip, baseDocument: remote?.version === trip.version ? remote.document : trip.baseDocument };
}

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
export function sameDocument(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((value, index) => sameDocument(value, b[index]));
  if (object(a) && object(b)) {
    const keys = Object.keys(a).filter(key => a[key] !== undefined), other = Object.keys(b).filter(key => b[key] !== undefined);
    return keys.length === other.length && keys.every(key => sameDocument(a[key], b[key]));
  }
  return false;
}

// A three-way merge preserves independent edits. Ambiguous changes never win silently.
export function mergeTripDocuments(base: TripDocument, local: TripDocument, remote: TripDocument): TripDocument | null {
  const result = resolveTripMerge(base, local, remote);
  return result.conflicts.length ? null : result.document;
}
export interface TripMergeConflict { key: string; path: string[]; local: unknown; remote: unknown }

// A block has one official anchor; combining two alternative choices is not an edit.
const anchor = (block: Record<string, unknown>) => Array.isArray(block.places)
  ? block.places.filter(p => object(p) && object(p.tourism)).map(p => p.tourism.contentId).sort().join(',') : '';
const validBlock = (block: Record<string, unknown>) => !Array.isArray(block.places) || (
  block.places.length <= 15 && block.places.filter(p => object(p) && p.tourism).length <= 1
  && !block.places.some((p, i) => i > 0 && object(p) && p.tourism)
);
const validBlocks = (blocks: unknown[]) => {
  if (blocks.length > 12) return false;
  const timed = blocks.filter((b): b is Record<string, unknown> => object(b) && typeof b.startTime === 'string' && typeof b.endTime === 'string')
    .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
  return !timed.some((b, i) => String(b.endTime) <= String(b.startTime) || i > 0 && String(b.startTime) < String(timed[i - 1].endTime));
};
export function tripMergeIssue(document: TripDocument): string {
  if (document.days.some(day => day.blocks.some(block => !validBlock(block as unknown as Record<string, unknown>)))) return '한 구간에는 중심 장소를 하나만 유지해 주세요. 다른 쪽 일정을 선택해 주세요.';
  if (document.days.some(day => !validBlocks(day.blocks))) return '일정 시간이 겹쳐 저장할 수 없어요. 다른 쪽 일정을 선택해 주세요.';
  return '';
}
export function resolveTripMerge(base: TripDocument, local: TripDocument, remote: TripDocument, choices: Record<string, 'local' | 'remote'> = {}) {
  const conflicts: TripMergeConflict[] = [];
  const repair = Boolean(tripMergeIssue(local) || tripMergeIssue(remote));
  function choose(l: unknown, r: unknown, path: string[]) {
    const key = JSON.stringify(path);
    if (choices[key]) return choices[key] === 'local' ? l : r;
    conflicts.push({ key, path, local: l, remote: r });
    return l;
  }
  function merge(b: unknown, l: unknown, r: unknown, path: string[]): unknown {
    const blockPath = path.length === 4 && path[0] === 'days' && path[2] === 'blocks';
    const blocksPath = path.length === 3 && path[0] === 'days' && path[2] === 'blocks';
    if (blockPath && object(l) && object(r)) {
      // Also recover drafts already corrupted by the old merger, even if the
      // remote version has not changed since that failed save.
      if (!validBlock(l) || !validBlock(r)) return choose(l, r, path);
      if (object(b) && anchor(l) !== anchor(r) && anchor(l) !== anchor(b) && anchor(r) !== anchor(b)) return choose(l, r, path);
    }
    if (blocksPath && Array.isArray(l) && Array.isArray(r) && (!validBlocks(l) || !validBlocks(r))) return choose(l, r, path);
    if (!(repair && (object(l) || Array.isArray(l)))) {
      if (sameDocument(l, r) || sameDocument(b, r)) return l;
      if (sameDocument(b, l)) return r;
    }
    if (Array.isArray(b) && Array.isArray(l) && Array.isArray(r)
      && [...b, ...l, ...r].every(item => object(item) && typeof item.id === 'string')) {
      const byId = (list: Record<string, unknown>[]) => new Map(list.map(item => [String(item.id), item]));
      const bm = byId(b), lm = byId(l), rm = byId(r);
      if (blocksPath && b.length && [...bm.keys()].every(id => !lm.has(id) && !rm.has(id)) && l.length && r.length) {
        // Nopi regenerates block IDs. Two replacements of one day are competing
        // plans, not independent additions to concatenate.
        return choose(l, r, path);
      }
      const checkpoint = conflicts.length;
      const finish = (values: unknown[]) => {
        if (blocksPath && !validBlocks(values)) { conflicts.length = checkpoint; return choose(l, r, path); }
        return values;
      };
      const merged = new Map<string, unknown>();
      for (const id of new Set([...bm.keys(), ...lm.keys(), ...rm.keys()])) {
        const value = merge(bm.get(id), lm.get(id), rm.get(id), [...path, id]);
        if (value !== undefined) merged.set(id, value);
      }
      const ids = (list: Record<string, unknown>[]) => list.map(item => String(item.id)).filter(id => merged.has(id));
      const bi = ids(b), li = ids(l), ri = ids(r);
      const sequences = sameDocument(bi, li) ? [ri] : sameDocument(bi, ri) ? [li] : [li, ri];
      const edges = new Map([...merged.keys()].map(id => [id, new Set<string>()]));
      const degrees = new Map([...merged.keys()].map(id => [id, 0]));
      for (const sequence of sequences) for (let i = 1; i < sequence.length; i++) {
        const from = sequence[i - 1], to = sequence[i];
        if (!edges.get(from)!.has(to)) { edges.get(from)!.add(to); degrees.set(to, degrees.get(to)! + 1); }
      }
      const order = [...new Set([...ri, ...li])];
      const result: unknown[] = [];
      while (result.length < merged.size) {
        const next = order.find(id => degrees.get(id) === 0);
        if (!next) {
          const chosen = choose(li, ri, [...path, '@order']) as string[];
          return finish([...new Set([...chosen, ...merged.keys()])].map(id => merged.get(id)));
        }
        result.push(merged.get(next)); degrees.set(next, -1);
        for (const to of edges.get(next)!) degrees.set(to, degrees.get(to)! - 1);
      }
      return finish(result);
    }
    if (object(b) && object(l) && object(r)) {
      const checkpoint = conflicts.length;
      const result: Record<string, unknown> = {};
      for (const key of new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)])) {
        const value = merge(b[key], l[key], r[key], [...path, key]);
        if (value !== undefined) result[key] = value;
      }
      if (blockPath && !validBlock(result)) { conflicts.length = checkpoint; return choose(l, r, path); }
      return result;
    }
    return choose(l, r, path);
  }
  const document = merge(base, local, remote, []) as TripDocument;
  return { document, conflicts };
}
