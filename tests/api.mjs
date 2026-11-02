// Integration tests run the actual route handlers against an isolated D1 database.
// No preview server, production data, email provider or live credentials are used.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wranglerRequire('miniflare');
const root=process.cwd(),temp=path.join(root,'.sites-runtime','api-tests');
await fs.mkdir(temp,{recursive:true});
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-05-15',d1Databases:{DB:'test-db'}});
const database=await mf.getD1Database('DB');
globalThis.__cciTestEnv={DB:database};
try{
 for(const f of (await fs.readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){
  const sql=await fs.readFile('drizzle/'+f,'utf8');for(const s of sql.split('--> statement-breakpoint').filter(s=>s.trim()))await database.prepare(s).run();
 }
 await fs.writeFile(path.join(temp,'env.mjs'),'export const env=globalThis.__cciTestEnv;');
 await fs.writeFile(path.join(temp,'catalogue.mjs'),ts.transpileModule(await fs.readFile('app/catalogue.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
 for (const moduleName of ['translations','i18n','order-email']) {
  const moduleSource=(await fs.readFile('lib/'+moduleName+'.ts','utf8')).replaceAll("'./translations'","'./translations.mjs'").replaceAll("'./i18n'","'./i18n.mjs'");
  await fs.writeFile(path.join(temp,moduleName+'.mjs'),ts.transpileModule(moduleSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
 }
 let source=await fs.readFile('app/api/portal/route.ts','utf8');source=source.replace("'../../../lib/i18n'","'./i18n.mjs'").replace("'../../../lib/order-email'","'./order-email.mjs'");source=source.replace("'cloudflare:workers'","'./env.mjs'").replace("'../../catalogue'","'./catalogue.mjs'");
 await fs.writeFile(path.join(temp,'route.mjs'),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
 const route=await import(pathToFileURL(path.join(temp,'route.mjs')));
 let checks=0;
 async function call(method,action,body={},cookie='',locale='ru'){
  const request=new Request('https://cci.test/api/portal'+(method==='GET'?'?'+action:''),{method,headers:{'Content-Type':'application/json',cookie,origin:'https://cci.test','accept-language':locale},...(method==='POST'?{body:JSON.stringify({action,...body})}:{})});
  const response=await route[method](request);return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
 }
 const ok=(condition,message)=>{assert.ok(condition,message);checks++;console.log('PASS '+message)};
 ok((await call('GET','action=orders')).status===401,'Unauthenticated data access rejected');
 ok((await call('POST','login',{email:'distributor1@demo.com',password:'wrong'})).status===401,'Wrong password rejected');
 const login=await call('POST','login',{email:'distributor1@demo.com',password:'demo123'});ok(login.status===200&&login.cookie,'Demo distributor login');const c=login.cookie;
 ok((await call('GET','action=session',{},c)).data.user.email==='distributor1@demo.com','Session persisted in D1');
 const catalogues=[];
 for(const r of ['Юг','Север','Запад','Восток']){const x=await call('GET','action=catalogue&region='+encodeURIComponent(r),{},c);ok(x.status===200&&x.data.products.length===8&&x.data.products.every(p=>p.region===r),'Regional filtering: '+r);catalogues.push(x.data.products)}
 const tee=catalogues[0][0],cap=catalogues[0][2];
 const checkout=(items,key=crypto.randomUUID())=>call('POST','checkout',{items,key},c);
 const line=(p,q=1,size='')=>({productId:p.id,quantity:q,size});
 for(const q of [0,-1,1.5,999999])ok((await checkout([line(tee,q,'L')])).status===400,'Invalid quantity rejected: '+q);
 ok((await checkout([line(tee,1)])).status===400,'Size is required');
 ok((await checkout([line(tee,1,'L'),line(catalogues[1][2],1)])).status===400,'Mixed regions rejected');
 const key=crypto.randomUUID(),items=[line(tee,3,'L'),line(cap,2)];const created=await checkout(items,key);ok(created.status===201,'Order created');const order=created.data;
 ok(order.totalAmount===20500&&order.items.length===2,'Server calculates exact prices and totals');
 ok(order.status==='Отправлен поставщику'&&order.orderNumber.startsWith('ORD-'),'Initial order status and unique number');
 const duplicate=await checkout(items,key);ok(duplicate.status===200&&duplicate.data.id===order.id,'Idempotent checkout prevents duplicates');
 const remaining=(await call('GET','action=catalogue&region='+encodeURIComponent('Юг'),{},c)).data.products;
 ok(remaining[0].availableQuantity===tee.availableQuantity-3&&remaining[0].variants.find(v=>v.size==='L').availableQuantity===33,'Product and variant stock decremented once');
 ok((await call('GET','action=orders',{},c)).data.orders.length===1,'Order history saved');
 const second=await call('POST','login',{email:'distributor2@demo.com',password:'demo123'});ok((await call('GET','action=orders',{},second.cookie)).data.orders.length===0,'Second user cannot see first user history');
 ok((await call('GET','action=order&id='+order.id,{},second.cookie)).status===404,'Cross-user order detail blocked');
 ok(order.email.status==='preview'&&order.email.html.includes('Подтвердить получение заказа'),'Email preview saved without an API key');
 const token=new URL(order.email.confirmationUrl).searchParams.get('supplier');const supplier=await call('GET','action=supplier&token='+token);ok(supplier.status===200&&supplier.data.status==='Отправлен поставщику','Supplier GET opens summary without confirming');
 ok((await call('POST','supplierConfirm',{token:'bad'})).status===404,'Invalid confirmation token rejected');
 ok((await call('POST','supplierConfirm',{token})).status===200,'Supplier confirmation works without distributor session');
 ok((await call('GET','action=order&id='+order.id,{},c)).data.status==='Получен поставщиком','Distributor sees updated status');
 ok((await call('POST','supplierConfirm',{token})).status===200,'Supplier confirmation is idempotent');
 // Competing requests both pass the initial read; CHECK constraints must reject one atomic batch.
 const bottle=catalogues[0][4];await database.prepare('UPDATE products SET availableQuantity=1 WHERE id=?').bind(bottle.id).run();
 const before=(await call('GET','action=orders',{},c)).data.orders.length;
 const competing=await Promise.all([checkout([line(bottle)]),checkout([line(bottle)])]);ok(competing.filter(x=>x.status===201).length===1&&competing.some(x=>x.status===409||x.status===400),'Concurrent checkouts cannot oversell');
 const after=(await call('GET','action=orders',{},c)).data.orders.length;ok(after===before+1,'Failed stock transaction creates no partial order');
 const localizedError=await call('POST','login',{email:'distributor1@demo.com',password:'wrong'},'','kk');
 ok(localizedError.status===401&&localizedError.data.error==='Электрондық пошта немесе құпиясөз қате','Kazakh validation error preserves HTTP status');
 const kkOrder=await call('POST','checkout',{items:[line(catalogues[0][5],2)],key:crypto.randomUUID()},c,'kk');
 ok(kkOrder.status===201&&kkOrder.data.region==='Юг'&&kkOrder.data.status==='Отправлен поставщику','Kazakh checkout preserves canonical region and status');
 ok(kkOrder.data.totalAmount===5600&&kkOrder.data.items[0].sku==='CC-S-006','Kazakh checkout preserves SKU and price calculation');
 ok(kkOrder.data.email.subject.startsWith('Жаңа тапсырыс')&&kkOrder.data.email.html.includes('Тапсырысты қабылдауды растау')&&kkOrder.data.email.html.includes('lang="kk"'),'Supplier email localized in Kazakh');
 const kkUrl=new URL(kkOrder.data.email.confirmationUrl);
 ok(kkUrl.searchParams.get('lang')==='kk','Supplier link retains checkout language');
 ok((await call('POST','supplierConfirm',{token:kkUrl.searchParams.get('supplier')},'','kk')).status===200,'Kazakh supplier confirmation succeeds');
 const {translate,formatDate}=await import(pathToFileURL(path.join(temp,'i18n.mjs')));
 ok(translate('kk','Получен поставщиком')==='Жеткізуші қабылдады'&&translate('ru','Получен поставщиком')==='Получен поставщиком','Both status labels map from one canonical status');
 ok(formatDate('2026-10-28T22:00:00Z','kk')==='2026 жылғы 29 қазан'&&formatDate('2026-10-28T22:00:00Z','ru')==='29 октября 2026','Dates use the correct language and Almaty timezone');
 const {kazakh}=await import(pathToFileURL(path.join(temp,'translations.mjs')));
 const ui=ts.createSourceFile('page.tsx',await fs.readFile('app/page.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const missing=new Set();
 function audit(node){if(ts.isCallExpression(node)&&node.expression.getText(ui)==='tr'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])){const key=node.arguments[0].text.trim();if(!Object.hasOwn(kazakh,key))missing.add(key)}ts.forEachChild(node,audit)}audit(ui);
 ok(missing.size===0,'Every static UI translation has a Kazakh entry: '+[...missing].join(', '));
 await call('POST','logout',{},c);ok((await call('GET','action=session',{},c)).status===401,'Logout invalidates session');
 console.log(`\n${checks} integration checks passed.`);
}finally{await mf.dispose();delete globalThis.__cciTestEnv}
