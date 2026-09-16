import { useSyncExternalStore } from 'react';
const subscribe=(callback:()=>void)=>{const query=window.matchMedia('(min-width: 1024px)');query.addEventListener('change',callback);return()=>query.removeEventListener('change',callback);};
export function useDesktop(){return useSyncExternalStore(subscribe,()=>window.matchMedia('(min-width: 1024px)').matches,()=>false);}
