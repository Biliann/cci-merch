'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { translate, type Locale } from '../lib/i18n';
type I18n = { locale: Locale; setLocale: (locale: Locale) => void; tr: (value: string) => string };
const Context = createContext<I18n | null>(null);
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, updateLocale] = useState<Locale>('ru');
  const setLocale = useCallback((next: Locale) => {
    updateLocale(next);
    try { localStorage.setItem('cci-language', next); } catch { /* Storage can be unavailable in private browsing. */ }
    document.cookie = `cci_locale=${next}; Path=/; SameSite=Lax; Max-Age=31536000${location.protocol === 'https:' ? '; Secure' : ''}`;
    document.documentElement.lang = next;
    document.title = next === 'kk' ? 'CCI — Мерч порталы' : 'CCI — Портал мерча';
  }, []);
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem('cci-language'); } catch {}
    const requested = new URLSearchParams(location.search).get('lang');
    setLocale(requested === 'kk' || requested === 'ru' ? requested : saved === 'kk' ? 'kk' : 'ru');
  }, [setLocale]);
  const tr = useCallback((value: string) => translate(locale, value), [locale]);
  return <Context.Provider value={{locale,setLocale,tr}}>{children}</Context.Provider>;
}
export function useI18n() { const context = useContext(Context); if (!context) throw new Error('Missing I18nProvider'); return context; }
export function LanguageSwitch() {
  const {locale,setLocale,tr} = useI18n();
  return <div className="language-switch" role="group" aria-label={tr('Язык')}>
    <button type="button" lang="ru" aria-pressed={locale==='ru'} onClick={()=>setLocale('ru')}>РУС</button>
    <button type="button" lang="kk" aria-pressed={locale==='kk'} onClick={()=>setLocale('kk')}>ҚАЗ</button>
  </div>;
}
