'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, ArrowLeft, ShoppingBag, UserRound, LogOut, Package, ChevronDown, X, Plus, Minus, Trash2, Check, CheckCircle2, MapPin, Search, Eye, EyeOff, ShieldCheck, Mail, ExternalLink, RefreshCw, Sun, Mountain, Wind, Snowflake, Loader2, ClipboardList } from 'lucide-react';
import { regions, regionNotes } from './catalogue';
import { useI18n, LanguageSwitch } from './i18n-provider';
import { formatDate, formatMoney } from '../lib/i18n';
type Product = {
    id: string;
    sku: string;
    name: string;
    description: string;
    image: string;
    region: string;
    price: number;
    availableQuantity: number;
    category: string;
    variants: {
        id: string;
        size: string;
        availableQuantity: number;
    }[];
};
type Line = {
    product: Product;
    size: string;
    quantity: number;
};
type Profile = {
    id: string;
    name: string;
    company: string;
    email: string;
    region: string;
};
type OrderItem = {
    id: string;
    name: string;
    sku: string;
    image: string;
    size: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
};
type Order = {
    id: string;
    orderNumber: string;
    region: string;
    totalAmount: number;
    createdAt: string;
    status: string;
    itemCount: number;
    items: OrderItem[];
    confirmedAt?: string;
    email?: {
        recipient: string;
        subject: string;
        html: string;
        confirmationUrl: string;
        status: string;
        lastError?: string;
    };
};
const date = formatDate;
async function api(action: string, body?: any) { const r = await fetch('/api/portal' + (body ? '' : '?' + action), body ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept-Language': document.documentElement.lang }, body: JSON.stringify({ action, ...body }) } : { cache: 'no-store',headers:{'Accept-Language':document.documentElement.lang} }); const d: any = await r.json(); if (!r.ok)
    throw Object.assign(new Error(d.error || 'Не удалось выполнить запрос'), { status: r.status }); return d; }
function Logo() { return <span className="logo"><img src="/cci-logo.png" alt="CCI"/></span>; }
function Status({ value }: {
    value: string;
}) { const { tr, locale } = useI18n(); return <span className={'status ' + (value === 'Получен поставщиком' ? 'received' : '')}><span />{tr(value)}</span>; }
function Quantity({ value, max, onChange }: {
    value: number;
    max: number;
    onChange: (v: number) => void;
}) { const { tr, locale } = useI18n(); return <div className="quantity"><button aria-label={tr("Уменьшить количество")} disabled={value <= 1} onClick={() => onChange(value - 1)}><Minus size={15}/></button><input aria-label={tr("Количество")} type="number" min="1" max={max} value={value} onChange={e => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= 1 && n <= max)
    onChange(n); }}/><button aria-label={tr("Увеличить количество")} disabled={value >= max} onClick={() => onChange(value + 1)}><Plus size={15}/></button></div>; }
function Modal({ children, onClose, wide = false }: {
    children: React.ReactNode;
    onClose: () => void;
    wide?: boolean;
}) { const { tr, locale } = useI18n(); const el = useRef<HTMLDivElement>(null); const closeRef = useRef(onClose); closeRef.current = onClose; useEffect(() => { const prev = document.activeElement as HTMLElement; const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; el.current?.focus(); const key = (e: KeyboardEvent) => { if (e.key === 'Escape')
    closeRef.current(); if (e.key === 'Tab') {
    const nodes = el.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select,[tabindex="0"]');
    if (!nodes?.length)
        return;
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    }
    else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
} }; document.addEventListener('keydown', key); return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); prev?.focus(); }; }, []); return <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget)
    onClose(); }}><div className={'modal ' + (wide ? 'wide' : '')} role="dialog" aria-modal="true" tabIndex={-1} ref={el}><button className="close icon-btn" aria-label={tr("Закрыть окно")} onClick={onClose}><X size={20}/></button>{children}</div></div>; }
export default function Home() {
    const { tr, locale } = useI18n();
    const money = formatMoney;
    const [user, setUser] = useState<Profile | null>(null), [loading, setLoading] = useState(true), [page, setPage] = useState('home'), [region, setRegion] = useState('Юг'), [products, setProducts] = useState<Product[]>([]), [counts, setCounts] = useState<Record<string, number>>({}), [fetching, setFetching] = useState(false), [cart, setCart] = useState<Line[]>([]), [orders, setOrders] = useState<Order[]>([]), [detail, setDetail] = useState<Order | null>(null), [product, setProduct] = useState<Product | null>(null), [size, setSize] = useState(''), [qty, setQty] = useState(1), [confirm, setConfirm] = useState(false), [submitting, setSubmitting] = useState(false), [success, setSuccess] = useState<Order | null>(null), [error, setError] = useState(''), [toast, setToast] = useState(''), [search, setSearch] = useState(''), [category, setCategory] = useState('Все товары'), [supplierToken, setSupplierToken] = useState(''), [supplierOrder, setSupplierOrder] = useState<Order | null>(null), [emailOpen, setEmailOpen] = useState(false), [key, setKey] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState(''), [showPass, setShowPass] = useState(false), [demoMode, setDemoMode] = useState(false);
    const total = cart.reduce((n, l) => n + l.product.price * l.quantity, 0), itemCount = cart.reduce((n, l) => n + l.quantity, 0);
    const acceptUser = (u: Profile) => { setUser(u); try {
        const saved = JSON.parse(localStorage.getItem('cci-cart-' + u.id) || '[]');
        setCart(Array.isArray(saved) ? saved : []);
    }
    catch {
        setCart([]);
    } };
    useEffect(() => { api('action=config').then(d => { setDemoMode(d.demo); if (d.demo) {
        setEmail(v => v || 'distributor1@demo.com');
        setPassword(v => v || 'demo123');
    } }).catch(() => { }); const token = new URLSearchParams(window.location.search).get('supplier'); if (token) {
        setSupplierToken(token);
        api('action=supplier&token=' + encodeURIComponent(token)).then(setSupplierOrder).catch(e => setError(tr(e.message))).finally(() => setLoading(false));
        return;
    } api('action=session').then(d => { acceptUser(d.user); setDemoMode(d.demo); }).catch(e => { if (e.status !== 401)
        setError(e.message); }).finally(() => setLoading(false)); }, []);
    useEffect(() => { if (user) {
        localStorage.setItem('cci-cart-' + user.id, JSON.stringify(cart));
        setKey(Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join(''));
    } }, [cart, user]);
    useEffect(() => { if (!user)
        return; api('action=regions').then(d => setCounts(Object.fromEntries(d.regions.map((r: any) => [r.region, r.count])))).catch(e => setError(e.message)); }, [user]);
    useEffect(() => { if (!toast)
        return; const t = setTimeout(() => setToast(''), 3500); return () => clearTimeout(t); }, [toast]);
    useEffect(() => { if (!user || page !== 'orders')
        return; const t = setInterval(() => { api('action=orders').then(d => setOrders(d.orders)).catch(() => { }); if (detail)
        api('action=order&id=' + detail.id).then(setDetail).catch(() => { }); }, 12000); return () => clearInterval(t); }, [user, page, detail?.id]);
    const go = (p: string) => { setPage(p); setError(''); setDetail(null); setEmailOpen(false); window.scrollTo({ top: 0 }); };
    async function catalogue(r: string) { go('catalogue'); setRegion(r); setSearch(''); setCategory('Все товары'); setProducts([]); setFetching(true); try {
        setProducts((await api('action=catalogue&region=' + encodeURIComponent(r))).products);
    }
    catch (e: any) {
        setError(e.message);
    }
    finally {
        setFetching(false);
    } }
    async function myOrders() { go('orders'); setFetching(true); try {
        setOrders((await api('action=orders')).orders);
    }
    catch (e: any) {
        setError(e.message);
    }
    finally {
        setFetching(false);
    } }
    async function openOrder(id: string) { setFetching(true); try {
        setDetail(await api('action=order&id=' + id));
        setEmailOpen(false);
    }
    catch (e: any) {
        setError(e.message);
    }
    finally {
        setFetching(false);
    } }
    async function signIn(loginEmail: string, loginPassword: string) { setSubmitting(true); setError(''); try {
        await api('login', { email: loginEmail.trim().toLowerCase(), password: loginPassword });
        let d;
        try {
            d = await api('action=session');
        }
        catch (e: any) {
            if (e.status === 401)
                throw new Error('Браузер не сохранил сессию. Откройте портал в отдельной вкладке и повторите вход.');
            throw e;
        }
        acceptUser(d.user);
        setDemoMode(d.demo);
        go('home');
    }
    catch (e: any) {
        setError(e.message);
    }
    finally {
        setSubmitting(false);
    } }
    async function login(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); const form = new FormData(e.currentTarget); await signIn(String(form.get('email') || ''), String(form.get('password') || '')); }
    async function logout() { try {
        await api('logout', {});
        setUser(null);
        setCart([]);
        setOrders([]);
        setSuccess(null);
        go('home');
    }
    catch (e: any) {
        setError(e.message);
    } }
    const openProduct = (p: Product) => { setProduct(p); setSize(p.variants.find(v => v.availableQuantity > 0)?.size || ''); setQty(1); };
    const limit = (p: Product, s: string) => p.variants.length ? (p.variants.find(v => v.size === s)?.availableQuantity || 0) : p.availableQuantity;
    const add = () => { if (!product)
        return; if (cart.length && cart[0].product.region !== product.region) {
        setToast('Оформите текущий заказ перед выбором другого региона');
        return;
    } const old = cart.find(l => l.product.id === product.id && l.size === size); const amount = qty + (old?.quantity || 0); if (amount > limit(product, size)) {
        setToast('В заказе уже есть этот товар. Доступно: ' + limit(product, size) + ' шт.');
        return;
    } setCart(old ? cart.map(l => l === old ? { ...l, quantity: amount } : l) : [...cart, { product, size, quantity: qty }]); setProduct(null); setToast('Товар добавлен в заказ'); };
    const updateLine = (i: number, n: number) => setCart(cart.map((l, j) => i === j ? { ...l, quantity: n } : l));
    async function checkout() { setSubmitting(true); setError(''); try {
        const o = await api('checkout', { key, items: cart.map(l => ({ productId: l.product.id, size: l.size, quantity: l.quantity })) });
        setSuccess(o);
        setCart([]);
        setConfirm(false);
        go('success');
    }
    catch (e: any) {
        setError(e.message);
        setConfirm(false);
    }
    finally {
        setSubmitting(false);
    } }
    async function supplierConfirm() { setSubmitting(true); setError(''); try {
        await api('supplierConfirm', { token: supplierToken });
        setSupplierOrder(await api('action=supplier&token=' + supplierToken));
    }
    catch (e: any) {
        setError(e.message);
    }
    finally {
        setSubmitting(false);
    } }
    const filtered = products.filter(p => (category === 'Все товары' || p.category === category) && (!search || (tr(p.name) + ' ' + p.name + ' ' + p.sku).toLowerCase().includes(search.toLowerCase())));
    const regionIcons = [Sun, Snowflake, Wind, Mountain];
    if (loading)
        return <div className="loading-screen"><Logo /><Loader2 className="spin" size={26}/><p>{tr("Загружаем портал…")}</p></div>;
    if (supplierToken)
        return <div className="supplier-page"><header className="public-header"><Logo /><span>{tr("Подтверждение поставщика")}</span><LanguageSwitch /></header><main className="supplier-card">{error && <div className="error">{tr(error)}</div>}{supplierOrder ? <><div className="success-icon">{supplierOrder.confirmedAt ? <CheckCircle2 /> : <Package />}</div><p className="eyebrow">{tr("ЗАКАЗ ДИСТРИБЬЮТОРА")}</p><h1>{supplierOrder.orderNumber}</h1><p className="muted">{tr("Регион: ")}{tr(supplierOrder.region)} · {date(supplierOrder.createdAt, locale)}</p><Status value={supplierOrder.status}/><div className="supplier-items">{supplierOrder.items.map((l, i) => <div key={i}><span>{tr(l.name)}<small>{l.sku}{l.size ? ' · ' + l.size : ''} · {l.quantity}{tr(" шт.")}</small></span><b>{money(l.totalPrice)}</b></div>)}</div><div className="total"><span>{tr("Общая сумма")}</span><b>{money(supplierOrder.totalAmount)}</b></div>{supplierOrder.confirmedAt ? <p className="confirmation-done"><Check size={18}/>{tr(" Получение подтверждено. Статус обновлён у дистрибьютора.")}</p> : <><p className="muted small">{tr("Подтвердите, что вы получили информацию о заказе. Дистрибьютор увидит обновлённый статус.")}</p><button className="btn full" onClick={supplierConfirm} disabled={submitting}>{submitting ? <Loader2 className="spin" size={18}/> : <Check size={18}/>}{tr("Подтвердить получение заказа")}</button></>}</> : <h2>{tr("Заказ недоступен")}</h2>}</main><Footer /></div>;
    if (!user)
        return <div className="login-page"><header className="public-header"><Logo /><span>{tr("Портал дистрибьюторов")}</span><LanguageSwitch /><span className="header-country">{tr("Казахстан ")}<span className="dot"/></span></header><main className="login-grid"><section className="login-form-wrap"><p className="eyebrow">COCA-COLA İÇECEK</p><h1>{tr("Фирменный Мерч от CCI")}</h1><p className="muted login-sub">{tr("Только для Дистрибьюторов")}</p><form onSubmit={login}><label>{tr("Электронная почта")}<input name="email" type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.kz"/></label><label>{tr("Пароль")}<div className="password-field"><input name="password" type={showPass ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder={tr("Введите пароль")}/><button type="button" aria-label={showPass ? tr('Скрыть пароль') : tr('Показать пароль')} onClick={() => setShowPass(!showPass)}>{showPass ? <EyeOff size={19}/> : <Eye size={19}/>}</button></div></label>{error && <div role="alert" className="error">{tr(error)}</div>}<button className="btn full" disabled={submitting}>{submitting ? <Loader2 size={18} className="spin"/> : null}{tr("Войти ")}<ArrowRight size={18}/></button></form><div className="restricted"><ShieldCheck size={18}/><span>{tr("Доступ только для авторизованных дистрибьюторов.")}<br />{tr("Аккаунт предоставляется вашей компанией.")}</span></div>{demoMode && <details className="demo-accounts" open><summary>{tr("Демо-доступ ")}<span>{tr("ДЛЯ ТЕСТИРОВАНИЯ")}</span><ChevronDown size={15}/></summary><div><button disabled={submitting} onClick={() => signIn('distributor1@demo.com', 'demo123')}>{tr("Войти как дистрибьютор 1 ")}<ArrowRight size={14}/></button><button disabled={submitting} onClick={() => signIn('distributor2@demo.com', 'demo123')}>{tr("Войти как дистрибьютор 2 ")}<ArrowRight size={14}/></button><small>{tr("Пароль для обоих аккаунтов: ")}<b>demo123</b></small></div></details>}</section><section className="login-visual"><div className="visual-copy"><span className="tiny-tag">{tr("ФИРМЕННЫЙ МЕРЧ")}</span><h2>{tr("Один портал.")}<br />{tr("Четыре региона.")}</h2><p>{tr("Выберите регион и соберите свой заказ.")}</p></div><div className="product-collage"><div className="collage-circle"/><img className="collage-tee" src="/products/tee.svg" alt={tr("Футболка Coca-Cola")}/><img className="collage-bottle" src="/products/bottle.svg" alt={tr("Термобутылка Coca-Cola")}/><img className="collage-cap" src="/products/cap.svg" alt={tr("Бейсболка Coca-Cola")}/></div><div className="visual-bottom"><span>{tr("Один портал. Четыре региона.")}</span><span>CCI KAZAKHSTAN ↗</span></div></section></main><Footer /></div>;
    return <div className="app"><header className="header"><div className="header-inner"><button className="brand-button" onClick={() => go('home')} aria-label={tr("На главную")}><Logo /></button><span className="brand-divider"/><span className="portal-name">{tr("Портал мерча")}<span>{tr("Для дистрибьюторов")}</span></span><nav><button className={page === 'orders' ? 'active' : ''} onClick={myOrders}><ClipboardList size={18}/><span>{tr("Мои заказы")}</span></button><button className={page === 'account' ? 'active' : ''} onClick={() => { go('account'); api('action=orders').then(d => setOrders(d.orders)).catch(e => setError(e.message)); }}><UserRound size={18}/><span>{tr("Кабинет")}</span></button><button className={'cart-nav ' + (page === 'cart' ? 'active' : '')} onClick={() => go('cart')}><ShoppingBag size={18}/><span>{tr("Заказ")}</span><b>{itemCount}</b></button></nav><LanguageSwitch /><div className="user-header"><span className="avatar">{user.name.split(' ').map(s => s[0]).join('')}</span><span>{user.name}<small>{user.email}</small></span><button className="icon-btn" title={tr("Выйти")} aria-label={tr("Выйти")} onClick={logout}><LogOut size={18}/></button></div></div></header><main className="main">{error && <div className="error" role="alert">{tr(error)}<button aria-label={tr("Скрыть ошибку")} onClick={() => setError('')}><X size={16}/></button></div>}
 {page === 'home' && <><div className="breadcrumb">{tr("Главная ")}<span>/</span>{tr(" Каталог мерча")}</div><section className="home-banner"><div><span className="eyebrow">{tr("ВМЕСТЕ С COCA-COLA")}</span><h1>{tr("Всё для вашей команды.")}</h1><p>{tr("Фирменный мерч для бизнеса — в одном месте.")}<br />{tr("Выберите регион и соберите свой заказ.")}</p><span className="banner-label"><span className="dot"/>{tr(" Коллекция 2026")}</span></div><div className="banner-art"><span className="banner-circle"/><img src="/products/shopper.svg" alt="" className="banner-shopper"/><img src="/products/tee.svg" alt="" className="banner-tee"/><img src="/products/bottle.svg" alt="" className="banner-bottle"/></div></section><div className="section-heading"><div><h2>{tr("Выберите регион")}</h2><p>{tr("Каталог и поставщик зависят от региона заказа.")}</p></div><span className="subtle">{tr("04 региона ")}<span className="red-slash">/</span>{tr(" Казахстан")}</span></div><section className="region-grid">{regions.map((r, i) => { const Icon = regionIcons[i]; return <button className="region-card" key={r} onClick={() => catalogue(r)}><div className="region-top"><span className="region-icon"><Icon size={27} strokeWidth={1.35}/></span><span className="region-number">0{i + 1}</span></div><h3>{tr(r)}</h3><p>{tr(regionNotes[i])}</p><div className="region-bottom"><span>{counts[r] ?? '—'}{tr(" SKU в каталоге")}</span><ArrowUpRight size={21}/></div></button>; })}</section><div className="how-heading"><h3>{tr("От выбора до подтверждения")}</h3><span>{tr("Три простых шага")}</span></div><section className="steps">{[['01', 'Выберите мерч', 'Откройте каталог вашего региона.'], ['02', 'Соберите заказ', 'Укажите размеры и количество.'], ['03', 'Получите подтверждение', 'Поставщик подтвердит получение.']].map(([n, t, d]) => <div key={n}><span>{n}</span><div><h4>{tr(t)}</h4><p>{tr(d)}</p></div></div>)}</section></>}
 {page === 'catalogue' && <><div className="breadcrumb"><button onClick={() => go('home')}>{tr("Главная")}</button><span>/</span>{tr("Мерч — ")}{tr(region)}</div><div className="catalogue-title"><div><span className="eyebrow">{tr("РЕГИОНАЛЬНЫЙ КАТАЛОГ")}</span><h1>{tr("Мерч — ")}{tr(region)}<span className="count-pill">{products.length} SKU</span></h1><p className="muted">{tr("Фирменные вещи для вашей команды и партнёров.")}</p></div><label className="region-select"><MapPin size={16}/><select aria-label={tr("Выберите регион")} value={region} onChange={e => catalogue(e.target.value)}>{regions.map(r => <option key={r} value={r}>{tr(r)}</option>)}</select><ChevronDown size={15}/></label></div><div className="catalogue-toolbar"><div className="tabs">{['Все товары', 'Одежда', 'Аксессуары', 'Канцелярия'].map(c => <button key={c} className={category === c ? 'selected' : ''} onClick={() => setCategory(c)}>{tr(c)}</button>)}</div><div className="search"><Search size={17}/><input aria-label={tr("Поиск по названию или SKU")} placeholder={tr("Название или SKU")} value={search} onChange={e => setSearch(e.target.value)}/>{search && <button aria-label={tr("Очистить поиск")} onClick={() => setSearch('')}><X size={15}/></button>}</div></div><div className="catalogue-meta"><span>{tr("Доступно SKU: ")}<b>{products.length}</b>{filtered.length !== products.length ? tr(' · Найдено: ') + filtered.length : ''}</span><span><span className="green-dot"/>{tr(" Остатки обновляются при заказе")}</span></div>{fetching ? <Loading /> : filtered.length ? <div className="product-grid">{filtered.map(p => <article className="product-card" key={p.id}><button className="product-image" onClick={() => openProduct(p)} aria-label={tr('Подробнее: ') + tr(p.name)}><span className="category-tag">{tr(p.category)}</span><img src={p.image} alt={tr(p.name)}/></button><div className="product-info"><span className="sku">{p.sku}</span><h3><button onClick={() => openProduct(p)}>{tr(p.name)}</button></h3><p>{tr(p.description)}</p><div className="card-variants">{p.variants.length ? p.variants.map(v => <span className={!v.availableQuantity ? 'out' : ''} key={v.id}>{v.size}</span>) : <span className="one-size">{tr("Единый размер")}</span>}</div><div className="price-row"><b>{money(p.price)}</b><span>{tr("/ шт.")}</span></div><div className="stock">{p.availableQuantity > 0 ? <><span className="green-dot"/>{tr("В наличии: ")}{p.availableQuantity}{tr(" шт.")}</> : <span>{tr("Нет в наличии")}</span>}</div><button className="btn product-btn" disabled={!p.availableQuantity} onClick={() => openProduct(p)}>{tr("Заказать ")}<Plus size={17}/></button></div></article>)}</div> : <Empty icon={<Search />} title={tr("Товары не найдены")} text={tr("Попробуйте другое название или категорию.")}/>}<div className="catalogue-note"><ShieldCheck size={18}/><span>{tr("Товары доступны только для дистрибьюторов. Изображения — иллюстрации для демонстрации.")}</span></div></>}
 {page === 'cart' && <><Breadcrumb onHome={() => go('home')} current={tr("Заказ")}/><div className="page-title"><div><span className="eyebrow">{tr("ПРОВЕРЬТЕ ПЕРЕД ОТПРАВКОЙ")}</span><h1>{tr("Ваш заказ ")}<span className="count-pill">{itemCount}{tr(" шт.")}</span></h1></div>{cart.length > 0 && <span className="region-caption"><MapPin size={16}/>{tr("Регион: ")}{tr(cart[0].product.region)}</span>}</div>{cart.length ? <div className="cart-layout"><section className="cart-lines">{cart.map((l, i) => <article className="cart-line" key={l.product.id + l.size}><img src={l.product.image} alt={tr(l.product.name)}/><div className="cart-description"><span className="sku">{l.product.sku}</span><h3>{tr(l.product.name)}</h3><p>{l.size ? tr('Размер: ') + l.size : tr('Единый размер')}</p><small>{money(l.product.price)}{tr(" / шт.")}</small></div><Quantity value={l.quantity} max={limit(l.product, l.size)} onChange={n => updateLine(i, n)}/><b>{money(l.quantity * l.product.price)}</b><button className="icon-btn delete" aria-label={tr('Удалить ') + tr(l.product.name)} onClick={() => setCart(cart.filter((_, j) => j !== i))}><Trash2 size={18}/></button></article>)}<button className="text-link" onClick={() => catalogue(cart[0].product.region)}><ArrowLeft size={16}/>{tr(" Продолжить выбор")}</button></section><aside className="order-summary"><h3>{tr("Состав заказа")}</h3><div><span>{tr("Регион")}</span><b>{tr(cart[0].product.region)}</b></div><div><span>{tr("Позиций")}</span><b>{cart.length}</b></div><div><span>{tr("Количество товаров")}</span><b>{itemCount}{tr(" шт.")}</b></div><div className="total"><span>{tr("Общая сумма")}</span><b>{money(total)}</b></div><button className="btn full" onClick={() => setConfirm(true)}>{tr("Оформить заказ ")}<ArrowRight size={18}/></button><p><ShieldCheck size={16}/>{tr("Перед отправкой вы сможете подтвердить заказ.")}</p></aside></div> : <Empty icon={<ShoppingBag />} title={tr("Ваш заказ пока пуст")} text={tr("Выберите регион и добавьте фирменный мерч.")}><button className="btn" onClick={() => go('home')}>{tr("Выбрать регион ")}<ArrowRight size={17}/></button></Empty>}</>}
 {page === 'success' && success && <section className="success-page"><div className="success-icon"><Check size={32}/></div><span className="eyebrow">{tr("ВСЁ ГОТОВО")}</span><h1>{tr("Заказ успешно отправлен")}</h1><p className="muted">{tr("Заказ сохранён. Поставщик сможет подтвердить его получение.")}</p><div className="success-details"><div><span>{tr("Номер заказа")}</span><b>{success.orderNumber}</b></div><div><span>{tr("Регион")}</span><b>{tr(success.region)}</b></div><div><span>{tr("Общая сумма")}</span><b>{money(success.totalAmount)}</b></div><Status value={success.status}/></div>{success.email && success.email.status !== 'sent' && <div className="email-notice"><Mail size={18}/><span>{success.email.status === 'preview' ? tr('Демо-режим: письмо сохранено как предпросмотр.') : tr('Письмо пока не доставлено. Его можно отправить повторно.')}<small>{tr("Откройте заказ в истории, чтобы проверить письмо и ссылку поставщика.")}</small></span></div>}<button className="btn" onClick={async () => { await myOrders(); await openOrder(success.id); }}>{tr("Перейти к моим заказам ")}<ArrowRight size={18}/></button></section>}
 {page === 'orders' && <><Breadcrumb onHome={() => go('home')} current={tr("Мои заказы")}/>{detail ? <><button className="text-link back-link" onClick={() => { setDetail(null); setEmailOpen(false); }}><ArrowLeft size={16}/>{tr("Все заказы")}</button><div className="page-title"><div><span className="eyebrow">{tr("ДЕТАЛИ ЗАКАЗА")}</span><h1>{detail.orderNumber}</h1><p className="muted">{date(detail.createdAt, locale)}{tr(" · Регион: ")}{tr(detail.region)}</p></div><Status value={detail.status}/></div><div className="order-detail-panel">{detail.items.map(l => <div className="detail-line" key={l.id}><img src={l.image} alt=""/><div><span className="sku">{l.sku}</span><h3>{tr(l.name)}</h3><p>{l.size ? tr('Размер: ') + l.size + ' · ' : ''}{l.quantity}{tr(" шт. × ")}{money(l.unitPrice)}</p></div><b>{money(l.totalPrice)}</b></div>)}<div className="detail-total"><span>{detail.items.reduce((n, l) => n + l.quantity, 0)}{tr(" товаров")}</span><strong>{tr("Общая сумма: ")}{money(detail.totalAmount)}</strong></div></div>{detail.confirmedAt && <p className="confirmation-done"><CheckCircle2 size={18}/>{tr("Получено поставщиком: ")}{date(detail.confirmedAt, locale)}</p>}{detail.email && <section className="email-preview"><div className="email-heading"><div className="email-icon"><Mail size={21}/></div><div><h3>{tr("Уведомление поставщику")}</h3><p>{detail.email.status === 'sent' ? tr('Письмо отправлено') : detail.email.status === 'preview' ? tr('Демо-режим · реальное письмо не отправлялось') : tr('Письмо ожидает отправки')} · {detail.email.recipient}</p></div><button className="btn secondary small-btn" onClick={() => setEmailOpen(!emailOpen)}>{emailOpen ? tr('Скрыть письмо') : tr('Открыть письмо')}<ChevronDown size={15}/></button></div>{emailOpen && <div className="email-body"><p className="preview-label">{tr("ПРЕДПРОСМОТР ПИСЬМА ПОСТАВЩИКУ")}</p><iframe title={tr("Письмо поставщику")} sandbox="" srcDoc={detail.email.html}/><label>{tr("Защищённая ссылка для подтверждения")}<input readOnly value={detail.email.confirmationUrl}/></label><a className="btn" href={detail.email.confirmationUrl} target="_blank" rel="noreferrer">{tr("Проверить подтверждение поставщика ")}<ExternalLink size={16}/></a>{detail.email.status === 'failed' && <button className="btn secondary" disabled={submitting} onClick={async () => { setSubmitting(true); try {
        setDetail(await api('retryEmail', { id: detail.id }));
    }
    catch (e: any) {
        setError(e.message);
    }
    finally {
        setSubmitting(false);
    } }}>{tr("Повторить отправку")}</button>}<p className="small muted">{tr("Откройте ссылку, подтвердите получение и обновите статус заказа.")}</p><button className="text-link" onClick={() => openOrder(detail.id)}><RefreshCw size={15}/>{tr(" Обновить статус")}</button></div>}</section>}</> : <><div className="page-title"><div><span className="eyebrow">{tr("ИСТОРИЯ ЗАКАЗОВ")}</span><h1>{tr("Мои заказы ")}<span className="count-pill">{orders.length}</span></h1><p className="muted">{tr("Все ваши заказы и подтверждения поставщиков.")}</p></div><button className="btn secondary" onClick={myOrders}><RefreshCw size={16}/>{tr("Обновить")}</button></div>{fetching ? <Loading /> : orders.length ? <div className="orders-table"><div className="orders-head"><span>{tr("Номер и дата")}</span><span>{tr("Регион")}</span><span>{tr("Товары")}</span><span>{tr("Сумма")}</span><span>{tr("Статус")}</span><span /></div>{orders.map(o => <button className="order-row" key={o.id} onClick={() => openOrder(o.id)}><span><b>{o.orderNumber}</b><small>{date(o.createdAt, locale)}</small></span><span>{tr(o.region)}</span><span>{o.itemCount}{tr(" шт.")}</span><b>{money(o.totalAmount)}</b><Status value={o.status}/><ArrowUpRight size={18}/></button>)}</div> : <Empty icon={<Package />} title={tr("У вас пока нет заказов")} text={tr("Здесь появятся ваши заказы и статусы их получения.")}><button className="btn" onClick={() => go('home')}>{tr("Перейти в каталог ")}<ArrowRight size={17}/></button></Empty>}</>}</>}
 {page === 'account' && <><Breadcrumb onHome={() => go('home')} current={tr("Кабинет")}/><div className="page-title"><div><span className="eyebrow">{tr("ПРОФИЛЬ ДИСТРИБЬЮТОРА")}</span><h1>{tr("Личный кабинет")}</h1><p className="muted">{tr("Ваши данные и информация о компании.")}</p></div></div><section className="account-card"><div className="account-top"><span className="avatar large">{user.name.split(' ').map(s => s[0]).join('')}</span><div><h2>{user.name}</h2><span className="account-role">{tr("Авторизованный дистрибьютор")}</span></div><ShieldCheck size={25}/></div><div className="account-fields">{[['Имя', user.name], ['Компания', user.company], ['Электронная почта', user.email], ['Основной регион', user.region], ['Количество заказов', String(orders.length)]].map(([k, v]) => <div key={k}><span>{tr(k)}</span><b>{tr(v)}</b></div>)}</div><div className="account-bottom"><span>{tr("Данные аккаунта обновляются через вашу компанию.")}</span><button className="btn secondary" onClick={logout}><LogOut size={17}/>{tr("Выйти")}</button></div></section></>}
 </main><Footer />{toast && <div className="toast" role="status"><CheckCircle2 size={19}/>{tr(toast)}<button aria-label={tr("Закрыть уведомление")} onClick={() => setToast('')}><X size={16}/></button></div>}
 {product && <Modal wide onClose={() => setProduct(null)}><div className="product-modal"><div className="modal-product-image"><img src={product.image} alt={tr(product.name)}/><span>{tr("Демонстрационное изображение")}</span></div><div className="product-modal-info"><span className="eyebrow">{tr("МЕРЧ — ")}{tr(product.region).toUpperCase()}</span><h2>{tr(product.name)}</h2><span className="sku">{tr("Артикул: ")}{product.sku}</span><p className="muted">{tr(product.description)}</p><div className="modal-price">{money(product.price)}<span>{tr("/ шт.")}</span></div>{product.variants.length > 0 && <div className="size-picker"><label>{tr("Размер ")}<b>{size}</b></label><div>{product.variants.map(v => <button key={v.id} disabled={!v.availableQuantity} className={size === v.size ? 'chosen' : ''} onClick={() => { setSize(v.size); setQty(1); }}>{v.size}</button>)}</div></div>}<div className="quantity-row"><div><label>{tr("Количество")}</label><Quantity value={qty} max={limit(product, size)} onChange={setQty}/></div><span className="stock"><span className="green-dot"/>{tr("Доступно: ")}{limit(product, size)}{tr(" шт.")}</span></div><div className="total"><span>{tr("Итого")}</span><b>{money(product.price * qty)}</b></div><button className="btn full" disabled={!limit(product, size)} onClick={add}><ShoppingBag size={18}/>{tr("Добавить в заказ")}</button><p className="modal-helper">{tr("Товары одного региона оформляются вместе.")}</p></div></div></Modal>}
 {confirm && <Modal onClose={() => { if (!submitting)
        setConfirm(false); }}><div className="confirm-icon"><ClipboardList size={26}/></div><h2>{tr("Подтверждение заказа")}</h2><p className="muted">{tr("Пожалуйста, проверьте заказ перед отправкой. После подтверждения он будет передан поставщику региона ")}<b>{tr(cart[0]?.product.region)}</b>.</p><div className="confirm-summary"><div><span>{tr("Товаров")}</span><b>{itemCount}{tr(" шт.")}</b></div><div><span>{tr("Общая сумма")}</span><strong>{money(total)}</strong></div></div><p className="small muted">{tr("Отправляя заказ, вы подтверждаете выбранные SKU, размеры и количество.")}</p><div className="modal-actions"><button className="btn secondary" disabled={submitting} onClick={() => setConfirm(false)}>{tr("Отмена")}</button><button className="btn" disabled={submitting} onClick={checkout}>{submitting ? <Loader2 className="spin" size={17}/> : <Check size={17}/>}{tr("Подтвердить заказ")}</button></div></Modal>}
 </div>;
}
function Breadcrumb({ onHome, current }: {
    onHome: () => void;
    current: string;
}) { const { tr, locale } = useI18n(); return <div className="breadcrumb"><button onClick={onHome}>{tr("Главная")}</button><span>/</span>{tr(current)}</div>; }
function Footer() { const { tr, locale } = useI18n(); return <footer className="footer"><span>{tr("© 2026 Coca-Cola İçecek. Портал дистрибьюторов.")}</span><div><span>{tr("Казахстан")}</span><span className="footer-dot"/><span>{locale === "kk" ? "Қазақша" : "Русский"}</span></div></footer>; }
function Loading() { const { tr, locale } = useI18n(); return <div className="content-loading"><Loader2 className="spin" size={24}/><span>{tr("Загружаем данные…")}</span></div>; }
function Empty({ icon, title, text, children }: {
    icon: React.ReactNode;
    title: string;
    text: string;
    children?: React.ReactNode;
}) { const { tr, locale } = useI18n(); return <div className="empty"><div>{icon}</div><h2>{tr(title)}</h2><p>{tr(text)}</p>{children}</div>; }
