import { translate, formatMoney, type Locale } from './i18n';
type EmailLine = {name:string;sku:string;size:string|null;quantity:number;price:number};
type EmailOrder = {number:string;region:string;user:{name:string;company:string;email:string};lines:EmailLine[];total:number;confirmationUrl:string};
const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
/** The persisted email is a snapshot in the checkout language; retries resend exactly that snapshot. */
export function buildOrderEmail(locale:Locale,order:EmailOrder){
 const t=(s:string)=>escapeHtml(translate(locale,s));
 const amount=formatMoney;
 const subject=translate(locale,'Новый заказ')+' '+order.number;
 const html=`<!doctype html><html lang="${locale}"><body><div style="font-family:Arial;color:#222;max-width:640px"><h1>${escapeHtml(subject)}</h1><p>${t('Дистрибьютор:')} ${escapeHtml(order.user.name)}<br>${escapeHtml(order.user.company)}<br>${escapeHtml(order.user.email)}</p><p>${t('Регион:')} ${t(order.region)}</p>${order.lines.map(l=>`<div style="border-bottom:1px solid #ddd;padding:12px 0"><b>${t(l.name)}</b><br>SKU: ${escapeHtml(l.sku)}${l.size?'<br>'+t('Размер:')+' '+escapeHtml(l.size):''}<br>${t('Количество:')} ${l.quantity}<br>${t('Цена:')} ${amount(l.price)}<br>${t('Сумма:')} ${amount(l.price*l.quantity)}</div>`).join('')}<p>${t('Всего товаров:')} ${order.lines.reduce((a,l)=>a+l.quantity,0)}</p><h2>${t('Общая сумма:')} ${amount(order.total)}</h2><a style="display:inline-block;padding:16px;background:#e7192d;color:white;text-decoration:none" href="${escapeHtml(order.confirmationUrl)}">${t('Подтвердить получение заказа')}</a><p>${t('Ссылка открывает страницу проверки. Получение подтверждается отдельной кнопкой.')}</p></div></body></html>`;
 return {subject,html};
}
