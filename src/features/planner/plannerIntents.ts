export type PlannerCategoryKey = 'food' | 'cafe' | 'activity' | 'culture' | 'walk' | 'drink';

export interface PlannerIntentOption {
  key: string;
  label: string;
  patterns: RegExp[];
}

export interface PlannerCategoryDefinition {
  key: PlannerCategoryKey;
  label: string;
  aliases: string[];
  patterns: RegExp[];
  intents: PlannerIntentOption[];
}

const intent = (key: string, label: string, ...patterns: RegExp[]): PlannerIntentOption => ({ key, label, patterns });

export const PLANNER_CATEGORIES: PlannerCategoryDefinition[] = [
  {
    key: 'food', label: '맛집', aliases: ['음식점', '식사'], patterns: [/맛집|밥|식사|음식|한식|일식|중식|양식|분식|고기|해산물/],
    intents: [
      intent('hearty_meal', '든든한 식사', /든든|배부르게|푸짐|한\s*끼/),
      intent('light_meal', '가벼운 식사', /가볍게\s*(?:먹|식사)|간단(?:히|하게)?\s*(?:먹|식사)|빠르게\s*먹/),
      intent('food_tour', '맛집 탐방', /맛집\s*(?:탐방|투어)|유명\s*(?:메뉴|맛집)|먹방/),
      intent('local_food', '현지 음식', /현지|로컬\s*(?:음식|맛집)|노포|지역\s*(?:음식|맛)/),
      intent('value', '가성비', /가성비|저렴|가격\s*대비/),
      intent('special_meal', '특별한 식사', /특별한\s*식사|기념일|고급\s*(?:식사|다이닝)|오마카세|파인다이닝/),
      intent('healthy_meal', '건강식', /건강식|샐러드|포케|비건|저칼로리/),
      intent('group_meal', '모임 식사', /모임\s*식사|회식|단체\s*(?:식사|모임)|여럿이\s*먹/),
    ],
  },
  {
    key: 'cafe', label: '카페/디저트', aliases: ['카페', '디저트'], patterns: [/카페|커피|디저트|케이크|베이커리|브런치/],
    intents: [
      intent('coffee', '커피', /커피|원두|로스터리|핸드드립|에스프레소/),
      intent('dessert', '디저트', /디저트|케이크|베이커리|빵|구움과자|아이스크림/),
      intent('conversation', '대화', /대화|이야기|얘기|수다|담소/),
      intent('work', '작업', /작업|노트북|업무|공부/),
      intent('rest', '휴식', /휴식|쉬고|쉬기|편하게\s*쉬/),
      intent('space', '공간 구경', /공간\s*구경|인테리어|건축|공간이\s*(?:예쁜|멋진)/),
      intent('photo', '사진', /사진|포토존|촬영/),
      intent('takeaway', '테이크아웃', /테이크아웃|포장/),
      intent('unique_experience', '이색 경험', /이색\s*(?:경험|체험)|특별한\s*카페|테마\s*카페/),
    ],
  },
  {
    key: 'activity', label: '놀거리', aliases: ['놀이', '체험'], patterns: [/놀거리|놀기|체험|방탈출|보드게임|볼링|노래방|오락실|공방|스포츠/],
    intents: [
      intent('making', '만들기', /만들기|공방|도자기|향수|반지|공예|제작/),
      intent('games', '게임·경쟁·놀이', /게임|경쟁|놀이|방탈출|보드게임|오락실|노래방|pc방/i),
      intent('sports', '스포츠', /스포츠|운동|볼링|클라이밍|탁구|당구/),
      intent('learning', '배우기', /배우기|수업|클래스|교육|레슨/),
      intent('healing', '힐링', /힐링|명상|마사지|요가|심리/),
      intent('unique_experience', '이색 경험', /이색\s*(?:경험|체험)|색다른\s*(?:경험|체험)/),
      intent('memory_making', '추억 만들기', /추억|특별한\s*경험|기억에\s*남/),
      intent('recording', '기록·촬영', /기록|촬영|셀프사진|영상/),
    ],
  },
  {
    key: 'culture', label: '문화/전시', aliases: ['문화', '전시'], patterns: [/문화|전시|미술관|박물관|공연|영화|팝업|서점|독서/],
    intents: [
      intent('art_appreciation', '작품 감상', /작품\s*감상|미술|사진전|미디어아트|전시\s*보/),
      intent('performance', '공연 관람', /공연|연극|뮤지컬|콘서트|라이브/),
      intent('movie', '영화 관람', /영화|독립영화/),
      intent('history_learning', '역사·학습', /역사|학습|박물관|기념관|유적/),
      intent('inspiration', '영감·창작', /영감|창작|아이디어|예술적\s*자극/),
      intent('reading', '독서', /독서|책|서점|북카페/),
      intent('popup_event', '팝업·행사', /팝업|행사|이벤트/),
      intent('photo_space', '사진·공간', /사진|공간|건축|촬영/),
    ],
  },
  {
    key: 'walk', label: '산책/구경', aliases: ['산책', '구경'], patterns: [/산책|걷|공원|야경|전망|구경|골목|동네|랜드마크|시장|상권/],
    intents: [
      intent('light_walk', '가벼운 산책', /가벼운\s*산책|부담\s*없이\s*걷|잠깐\s*걷/),
      intent('nature', '자연 감상', /자연|공원|숲|하천|계절\s*풍경/),
      intent('night_view', '전망·야경', /야경|전망|노을/),
      intent('photo', '사진', /사진|포토존|촬영/),
      intent('history_tour', '역사 탐방', /역사\s*탐방|문화재|고궁|오래된\s*골목/),
      intent('neighborhood_tour', '동네 탐방', /동네\s*탐방|골목\s*구경|상권\s*구경|동네\s*구경/),
      intent('landmark', '랜드마크', /랜드마크|대표\s*장소|명소/),
      intent('rest', '휴식', /휴식|쉬고|쉬기|벤치|쉼터/),
    ],
  },
  {
    key: 'drink', label: '술/야간', aliases: ['술', '술집', '야간'], patterns: [/술|술집|포차|펍|맥주|와인|칵테일|이자카야|심야/],
    intents: [
      intent('casual_drink', '가볍게 한잔', /가볍게\s*(?:한잔|술)|한잔만|짧게\s*마시/),
      intent('conversation', '대화', /대화|이야기|얘기|수다|조용히\s*마시/),
      intent('social_gathering', '친목·모임', /친목|모임|회식|동료|친구들과\s*마시/),
      intent('date', '데이트', /데이트|연인|커플|분위기\s*있는\s*술/),
      intent('drink_exploration', '술 탐방', /술\s*탐방|와인|위스키|전통주|수제맥주/),
      intent('food_and_drink', '음식과 술', /안주|음식과\s*술|술과\s*음식/),
      intent('music_performance', '음악·공연', /음악|공연|lp|재즈|라이브/i),
      intent('late_night', '늦은 시간', /늦은\s*시간|심야|새벽|밤늦게/),
    ],
  },
];

export const ATMOSPHERE_OPTIONS = [
  { key: 'quiet', label: '조용한', pattern: /조용|차분/ },
  { key: 'lively', label: '활기찬', pattern: /활기|신나는|북적/ },
  { key: 'cozy', label: '아늑한', pattern: /아늑|포근/ },
  { key: 'clean', label: '깔끔한', pattern: /깔끔|정돈/ },
  { key: 'unique', label: '이색적인', pattern: /이색|독특|색다른/ },
  { key: 'instagrammable', label: '인스타 감성', pattern: /인스타|감성적|감성\s*(?:있는|좋은)/ },
] as const;

const normalize = (value: unknown) => String(value || '').trim().toLowerCase().replace(/\s+/g, '');

export function getPlannerCategory(value: unknown) {
  const normalized = normalize(value);
  return PLANNER_CATEGORIES.find((category) => (
    normalize(category.key) === normalized
    || normalize(category.label) === normalized
    || category.aliases.some((alias) => normalize(alias) === normalized)
  ));
}

export function categoryKeyFromLabel(value: unknown): PlannerCategoryKey | '' {
  return getPlannerCategory(value)?.key || '';
}

export function categoryLabelFromKey(value: unknown) {
  return getPlannerCategory(value)?.label || '';
}

export function getCoreIntentOptions(category: unknown) {
  return getPlannerCategory(category)?.intents || [];
}

export function normalizeCoreIntent(category: unknown, value: unknown) {
  const normalized = normalize(value);
  return getCoreIntentOptions(category).find((option) => (
    normalize(option.key) === normalized || normalize(option.label) === normalized
  ))?.key || '';
}

export function getCoreIntentLabel(category: unknown, value: unknown) {
  const key = normalizeCoreIntent(category, value);
  return getCoreIntentOptions(category).find((option) => option.key === key)?.label || '';
}

export function inferMainCategoryFromText(text: string): PlannerCategoryKey | '' {
  return PLANNER_CATEGORIES.find((category) => category.patterns.some((pattern) => pattern.test(text)))?.key || '';
}

export function inferCoreIntentFromText(text: string, category: unknown) {
  return getCoreIntentOptions(category).find((option) => option.patterns.some((pattern) => pattern.test(text)))?.key || '';
}

export function inferAtmosphereTags(text: string) {
  return ATMOSPHERE_OPTIONS.filter((option) => option.pattern.test(text)).map((option) => option.key);
}

export function needsCoreIntentQuestion(mainCategory: unknown, coreIntent: unknown, coreIntentSkipped = false) {
  return Boolean(getPlannerCategory(mainCategory) && !normalizeCoreIntent(mainCategory, coreIntent) && !coreIntentSkipped);
}
