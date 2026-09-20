import { getLocale, type Locale } from './locale';
import { messages } from './messages';
import { mobileMessages } from './mobileMessages';
import { siteMessages } from './siteMessages';
import { reviewedMessages } from './reviewedMessages';
import { travelMessages } from './travelMessages';
import { sharingMessages } from './sharingMessages';

const templates: Record<string, readonly [string,string,string]> = {
  '{0} 이내의 실제 경로로 연결하기 어려워요. 거리를 넓히지 않았어요. 다른 권역을 선택하거나 장소를 직접 담아 주세요.': ['We could not connect a route within {0}. The limit was kept. Try another area or add places yourself.', '无法在{0}以内连接实际路线，距离限制保持不变。请选择其他地区或手动添加地点。', '{0}以内の実際の経路で接続できませんでした。制限は維持しています。別のエリアを選ぶか、場所を直接追加してください。'],
  '{0}와 함께': ['With {0}', '与{0}同行', '{0}と一緒'],
  '{0}과 함께': ['With {0}', '与{0}同行', '{0}と一緒'],
  '{0}박 {1}일의 새로운 발견': ['{1} days, {0} nights of discovery', '{0}晚{1}天的新发现', '{0}泊{1}日の新しい発見'],
  '{0}박 {1}일': ['{1} days / {0} nights', '{0}晚{1}天', '{0}泊{1}日'],
  '{0}곳 · {1}페이지': ['{0} places · page {1}', '{0}处 · 第{1}页', '{0}か所 · {1}ページ'],
  '{0}곳': ['{0} places', '{0}处', '{0}か所'],
  '{0}분': ['{0} min', '{0}分钟', '{0}分'],
  '{0}시간': ['{0} hours', '{0}小时', '{0}時間'],
  '{0}시간 {1}분': ['{0} hr {1} min', '{0}小时{1}分钟', '{0}時間{1}分'],
  '{0}대': ['{0}s', '{0}多岁', '{0}代'],
  '10대 이하': ['Under 20', '20岁以下', '20歳未満'],
  '70대 이상': ['70 and above', '70岁及以上', '70代以上'],
  '{0} 전체': ['All of {0}', '{0}全域', '{0}全域'],
  '‘{0}’ 둘러보기': ['Explore {0}', '探索{0}', '「{0}」を探す'],
  '{0} 관광지 전체 · 이름으로 검색해 보세요': ['Search attractions in {0}', '搜索{0}的景点名称', '{0}の観光地を名前で検索'],
  '자동 코스는 장소 사이 실제 이동 {0} 이내로 연결해요.': ['Automatic routes keep each leg within {0} of actual travel.', '自动路线按实际移动距离连接，每段不超过{0}。', '自動コースは各区間の実際の移動距離を{0}以内に収めます。'],
  '{0}에서 보내는 하루': ['A day in {0}', '在{0}的一天', '{0}で過ごす一日'],
  '{0}에서 보내는 {1}일': ['{1} days in {0}', '在{0}的{1}天', '{0}で過ごす{1}日間'],
};
const patterns=Object.entries({...Object.fromEntries(Object.entries(siteMessages).filter(([key])=>/\{\d+\}/.test(key))),...templates,...Object.fromEntries(Object.entries(reviewedMessages).filter(([key])=>/\{\d+\}/.test(key)))}).sort(([a],[b])=>b.replace(/\{\d+\}/g,'').length-a.replace(/\{\d+\}/g,'').length).map(([key,values])=>({
  regex:new RegExp('^'+key.split(/(\{\d+\})/).map((part,i,parts)=>/^\{\d+\}$/.test(part)? (/^(대|분|시간|곳|박|일|페이지)(?:\s|$)/.test(parts[i+1] || '') ? '(\\d+(?:\\.\\d+)?)' : '(.+?)'):part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('')+'$'),values,
}));

export function translate<T>(value: T, locale: Locale = getLocale()): T {
  if (locale === 'ko' || typeof value !== 'string') return value;
  const text = value.trim().replace(/\s+/g,' ');
  const index = locale === 'en' ? 0 : locale === 'zh-CN' ? 1 : 2;
  const translation = (sharingMessages[text] || travelMessages[text] || reviewedMessages[text] || messages[text] || mobileMessages[text] || siteMessages[text])?.[index];
  if (translation) return (value.match(/^\s*/)?.[0]+translation+value.match(/\s*$/)?.[0]) as T;
  for(const pattern of patterns) {
    const match=pattern.regex.exec(text);
    if(match) return (value.match(/^\s*/)?.[0] + pattern.values[index].replace(/\{(\d+)\}/g,(_,n)=>translate(match[Number(n)+1],locale)) + value.match(/\s*$/)?.[0]) as T;
  }
  return value;
}
export const t = translate;
