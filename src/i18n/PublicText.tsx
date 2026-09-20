import { useLocale } from './locale';
import { t } from './translate';
import { usePublicTranslation, type PublicSource } from './usePublicTranslation';
export function PublicText({source,text}:{source:PublicSource;text:string}){
 const translated=usePublicTranslation(source);
 return <span title={translated.status==='translated'?text:undefined}>{translated.text(text)}</span>;
}
export function PublicTranslationNote({source}:{source:PublicSource}){
 const locale=useLocale(),result=usePublicTranslation(source);
 if(locale==='ko')return null;
 return <small className="public-translation-note" role="status">{t(result.status==='translated'?'자동 번역 · 정확한 내용은 공식 원문을 확인해 주세요.':result.status==='loading'?'콘텐츠를 번역하고 있어요…':'번역을 불러오지 못해 원문을 표시하고 있어요.')}</small>;
}
