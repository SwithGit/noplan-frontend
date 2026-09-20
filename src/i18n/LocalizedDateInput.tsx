import type { InputHTMLAttributes } from 'react';
import { useLocale } from './locale';
// Browser-native empty date hints follow OS language, independently of page lang.
// Keep the native calendar and keyboard behavior; localize the empty visual hint.
export function LocalizedDateInput(props:InputHTMLAttributes<HTMLInputElement>){
 const locale=useLocale(),empty=!props.value&&locale!=='ko';
 const hint=locale==='en'?'YYYY-MM-DD':locale==='ja'?'年 / 月 / 日':'年 / 月 / 日';
 return <span className={`localized-date ${empty?'is-empty':''}`} data-placeholder={hint}>
   <input {...props} type="date" lang={locale}/>
 </span>;
}
