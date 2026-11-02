'use client';

import { Loader2, MapPin } from 'lucide-react';
import { useI18n } from '../app/i18n-provider';
import type { LocationStatus } from '../hooks/use-store-location';

const messages: Record<LocationStatus, string> = {
  idle: 'Определим ближайший магазин по вашему местоположению.',
  locating: 'Разрешите доступ к геолокации в браузере. Мы откроем каталог вашего региона.',
  located: 'Магазин выбран по вашему местоположению. Регион можно изменить вручную.',
  denied: 'Доступ к геолокации запрещён. Выберите регион вручную или разрешите доступ в настройках браузера.',
  timeout: 'Не удалось дождаться местоположения. Повторите попытку или выберите регион вручную.',
  unavailable: 'Местоположение сейчас недоступно. Повторите попытку или выберите регион вручную.',
  outside: 'Не удалось подобрать магазин в Казахстане. Выберите регион вручную.',
  unsupported: 'Браузер не поддерживает геолокацию. Выберите регион вручную.',
  insecure: 'Для геолокации откройте сайт по HTTPS или выберите регион вручную.',
};

export function StoreLocation({ status, onLocate, onManual }: {
  status: LocationStatus;
  onLocate: () => void;
  onManual?: () => void;
}) {
  const { tr } = useI18n();
  const locating = status === 'locating';
  return <section className="store-location" aria-label={tr('Выбор магазина')} aria-busy={locating}>
    <span className="store-location-icon">{locating ? <Loader2 size={21} className="spin" /> : <MapPin size={21} />}</span>
    <div className="store-location-copy" role="status" aria-live="polite">
      <h3>{tr(locating ? 'Определяем ваш регион…' : status === 'located' ? 'Ваш магазин найден' : 'Магазин рядом с вами')}</h3>
      <p>{tr(messages[status])}</p>
    </div>
    <div className="store-location-actions">
      {!locating && status !== 'unsupported' && status !== 'insecure' && <button className="btn secondary" onClick={onLocate}>
        <MapPin size={15} />{tr(status === 'located' ? 'Обновить местоположение' : 'Определить регион')}
      </button>}
      {locating && onManual && <button className="text-link" onClick={onManual}>{tr('Выбрать вручную')}</button>}
    </div>
  </section>;
}
