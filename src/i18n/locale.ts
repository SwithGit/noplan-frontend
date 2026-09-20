import { useSyncExternalStore } from 'react';

export const locales = ['ko', 'zh-CN', 'ja', 'en'] as const;
export type Locale = typeof locales[number];
export const localeNames: Record<Locale, string> = { ko: '한국어', 'zh-CN': '中文（简体）', ja: '日本語', en: 'English' };
const listeners = new Set<() => void>();
const key = 'noplan.locale';
export function validLocale(value: unknown): value is Locale { return locales.includes(value as Locale); }
function initialLocale(): Locale {
  try { const saved = localStorage.getItem(key); return validLocale(saved) ? saved : 'ko'; } catch { return 'ko'; }
}
let current = initialLocale();
export const getLocale = () => current;
export function setLocale(locale: Locale) {
  if (!validLocale(locale) || current === locale) return;
  current = locale;
  document.documentElement.lang = locale;
  document.title = 'NoPlan | ' + ({ko:'우리다운 여행',en:'Travel your own way','zh-CN':'属于自己的旅行',ja:'私たちらしい旅'})[locale];
  try { localStorage.setItem(key, locale); } catch { /* Still works for this session. */ }
  listeners.forEach(listener => listener());
}
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useLocale() { return useSyncExternalStore(subscribe, getLocale, () => 'ko' as Locale); }
document.documentElement.lang = current;
document.title = 'NoPlan | ' + ({ko:'우리다운 여행',en:'Travel your own way','zh-CN':'属于自己的旅行',ja:'私たちらしい旅'})[current];
window.addEventListener('storage', event => {
  if (event.key === key && validLocale(event.newValue)) setLocale(event.newValue);
});
