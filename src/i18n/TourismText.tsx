import { useEffect, useSyncExternalStore } from 'react';
import { apiJson } from '../api/client';
import { useLocale, type Locale } from './locale';

type Translation = { contentId: string; locale: Locale; localizedName: string; localizedAddress: string };
type Place = { contentId?: string; tourism?: {contentId: string}; name?: string; address?: string; locale?: string; localizedName?: string; localizedAddress?: string };
const cache = new Map<string, Translation | null>();
const listeners = new Set<() => void>();
const queued = new Map<Locale, Set<string>>();
const inFlight = new Set<string>();
const expires = new Map<string, number>();
let timer: ReturnType<typeof setTimeout> | undefined;
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
function enqueue(locale: Locale, id: string) {
  const key=`${locale}:${id}`;
  if (inFlight.has(key) || (expires.get(key) || 0)>Date.now()) return;
  inFlight.add(key);
  const ids=queued.get(locale)||new Set<string>(); ids.add(id); queued.set(locale,ids);
  if (timer) return;
  timer=setTimeout(() => {
    timer=undefined;
    for(const [language, ids] of queued) {
      queued.delete(language);
      const list=[...ids];
      for(let offset=0;offset<list.length;offset+=100) {
        const batch=list.slice(offset,offset+100);
        void apiJson<{items:Translation[];status:string}>(`/api/tourism/translations?locale=${language}&ids=${batch.join(',')}`)
          .then(result => {
            for(const id of batch) { const key=`${language}:${id}`; cache.set(key,result.items.find(item=>item.contentId===id)||null); expires.set(key,Date.now()+(result.status==='unavailable'?60000:1800000)); }
          }).catch(() => { for(const id of batch){cache.set(`${language}:${id}`,null);expires.set(`${language}:${id}`,Date.now()+60000);} })
          .finally(() => { for(const id of batch)inFlight.delete(`${language}:${id}`); listeners.forEach(listener=>listener()); });
      }
    }
  },40);
}
export function TourismText({place,field='name'}:{place:Place;field?:'name'|'address'}) {
  const locale=useLocale(), id=place.contentId||place.tourism?.contentId;
  const key=`${locale}:${id}`;
  const translation=useSyncExternalStore(subscribe,()=>cache.get(key),()=>undefined);
  useEffect(()=>{if(locale!=='ko'&&id&&/^\d{1,20}$/.test(id)&&place.locale!==locale)enqueue(locale,id);},[locale,id,place.locale]);
  const localized=field==='name'?(place.locale===locale?place.localizedName:translation?.localizedName):(place.locale===locale?place.localizedAddress:translation?.localizedAddress);
  return <>{locale!=='ko'&&localized?localized:place[field]}</>;
}
