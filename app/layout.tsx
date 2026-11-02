import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from './i18n-provider';
export const metadata:Metadata={title:'CCI — Портал мерча',description:'Заказ фирменного мерча для дистрибьюторов Coca-Cola',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru"><body><I18nProvider>{children}</I18nProvider></body></html>}
