import { useEffect, useSyncExternalStore } from 'react';
import { apiJson } from '../api/client';
import { useLocale, type Locale } from './locale';
import { t } from './translate';

export type PublicSource = {kind:'event'|'course';id:string|number};
type Result={locale:string;status:string;items:{source:string;text:string}[]};
const cache=new Map<string,Result>(),pending=new Set<string>(),listeners=new Set<()=>void>(),queue=new Map<string,{source:PublicSource;locale:Locale}>();
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
const keyOf=(source:PublicSource,locale:Locale)=>`${locale}:${source.kind}:${source.id}`;
function pump(){
 while(pending.size<2&&queue.size){const [key,request]=queue.entries().next().value!;queue.delete(key);pending.add(key);
 const {source,locale}=request;const url=source.kind==='event'?`/api/events/${encodeURIComponent(source.id)}/translations`:`/api/course/explore/public-translations/${encodeURIComponent(source.id)}`;
 void apiJson<Result>(`${url}?locale=${locale}`).then(result=>cache.set(key,result)).catch(()=>cache.set(key,{locale,status:'unavailable',items:[]})).finally(()=>{pending.delete(key);if(cache.size>500)cache.delete(cache.keys().next().value!);listeners.forEach(l=>l());pump();});
 }
}
export function usePublicTranslation(source?:PublicSource){
 const locale=useLocale(),key=source?keyOf(source,locale):`${locale}:unscoped`;
 const result=useSyncExternalStore(subscribe,()=>cache.get(key),()=>undefined);
 useEffect(()=>{if(!source||locale==='ko'||cache.has(key)||pending.has(key)||queue.has(key))return;queue.set(key,{source,locale});pump();},[key,locale,source]);
 const text=(value:string):string=>locale==='ko'?value:result?.items.find(item=>item.source===value)?.text||(value.includes(' → ')?value.split(' → ').map(text).join(' → '):t(value));
 return {status:locale==='ko'?'original':result?.status||'loading',text};
}
