import { kazakh } from './translations';
export type Locale = 'ru' | 'kk';
export const localeTag = (locale: Locale) => locale === 'kk' ? 'kk-KZ' : 'ru-RU';
/** Database values remain canonical. Only display copy is localized. Unknown user content passes through. */
export function translate(locale: Locale, value: string): string {
  if (locale === 'ru') return value;
  const key = value.trim();
  const translated = kazakh[key as keyof typeof kazakh];
  if (translated) return value.replace(key, translated);
  // Validation messages with a product name retain their dynamic data.
  for (const prefix of ['Недостаточно товара:', 'В заказе уже есть этот товар. Доступно:']) {
    if (value.startsWith(prefix)) return translate(locale, prefix) + translate(locale, value.slice(prefix.length)).replace(/ шт\.$/, ' дана');
  }
  return value;
}
export function requestLocale(req: Request): Locale {
  const url = new URL(req.url);
  const language = url.searchParams.get('lang') || req.headers.get('cookie')?.match(/(?:^|;\s*)cci_locale=(ru|kk)(?:;|$)/)?.[1] || req.headers.get('accept-language') || '';
  return language.toLowerCase().startsWith('kk') ? 'kk' : 'ru';
}
/** Use Kazakhstan's grouped tenge amounts in both languages, including browsers with partial ICU data. */
export const formatMoney = (amount:number) => new Intl.NumberFormat('ru-RU').format(amount)+' ₸';
const months = {
  ru:['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'],
  kk:['қаңтар','ақпан','наурыз','сәуір','мамыр','маусым','шілде','тамыз','қыркүйек','қазан','қараша','желтоқсан']
};
export function formatDate(value:string,locale:Locale):string{
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Almaty',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date(value));
 const part=(type:string)=>parts.find(p=>p.type===type)?.value||'';
 const day=Number(part('day')),month=months[locale][Number(part('month'))-1],year=part('year');
 return locale==='kk'?`${year} жылғы ${day} ${month}`:`${day} ${month} ${year}`;
}
