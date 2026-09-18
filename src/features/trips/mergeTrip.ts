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
  let conflict = false;
  function merge(b: unknown, l: unknown, r: unknown): unknown {
    if (sameDocument(l, r) || sameDocument(b, r)) return l;
    if (sameDocument(b, l)) return r;
    if (Array.isArray(b) && Array.isArray(l) && Array.isArray(r)
      && [...b, ...l, ...r].every(item => object(item) && typeof item.id === 'string')) {
      const byId = (list: Record<string, unknown>[]) => new Map(list.map(item => [String(item.id), item]));
      const bm = byId(b), lm = byId(l), rm = byId(r);
      const merged = new Map<string, unknown>();
      for (const id of new Set([...bm.keys(), ...lm.keys(), ...rm.keys()])) {
        const value = merge(bm.get(id), lm.get(id), rm.get(id));
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
        if (!next) { conflict = true; return l; }
        result.push(merged.get(next)); degrees.set(next, -1);
        for (const to of edges.get(next)!) degrees.set(to, degrees.get(to)! - 1);
      }
      return result;
    }
    if (object(b) && object(l) && object(r)) {
      const result: Record<string, unknown> = {};
      for (const key of new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)])) {
        const value = merge(b[key], l[key], r[key]);
        if (value !== undefined) result[key] = value;
      }
      return result;
    }
    conflict = true;
    return l;
  }
  const document = merge(base, local, remote) as TripDocument;
  return conflict ? null : document;
}
