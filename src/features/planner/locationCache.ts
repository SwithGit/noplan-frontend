import type { CurrentPosition } from '../../types/noplan';
export type ResolvedLocation = CurrentPosition & {address:string;label:string;capturedAt:number};
// Reuse a recent fix across screens; concurrent requests share the same GPS lookup.
export function createLocationResolver(locate:()=>Promise<ResolvedLocation>, initial:CurrentPosition|null = null, now=Date.now) {
  let cached=initial, pending:Promise<ResolvedLocation>|null=null;
  return async ():Promise<ResolvedLocation> => {
    if(cached?.address && cached.label && cached.capturedAt && now()>=cached.capturedAt && now()-cached.capturedAt<10*60*1000)
      return cached as ResolvedLocation;
    if(!pending)pending=locate().then(value=>{cached=value;return value;}).finally(()=>{pending=null;});
    return pending;
  };
}
