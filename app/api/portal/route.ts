import { env } from 'cloudflare:workers';
import { merchandise, regions } from '../../catalogue';
import { requestLocale, translate } from '../../../lib/i18n';
import { buildOrderEmail } from '../../../lib/order-email';
export const dynamic='force-dynamic';
const cfg=()=>env as Cloudflare.Env & Record<string,string|undefined>;
const db=()=>{if(!env.DB)throw new Error('Database is unavailable');return env.DB};
const json=(v:unknown,status=200,headers:Record<string,string>={})=>Response.json(v,{status,headers:{'Cache-Control':'no-store',...headers}});
const fail=(s:string,status=400)=>{throw Object.assign(new Error(s),{status})};
const hex=(a:ArrayBuffer)=>Array.from(new Uint8Array(a)).map(x=>x.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
const hash=async(s:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
async function password(s:string,salt:string){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(s),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',iterations:100000,salt:new TextEncoder().encode(salt)},k,256))}
const escaped=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const demo=()=>cfg().DEMO_MODE!=='false';
async function seed(){
 if(!demo())return;
 const exists=await db().prepare('SELECT id FROM users WHERE id=?').bind('demo-1').first();if(exists)return;
 const salt=random();const pw=salt+':'+await password('demo123',salt);const statements=[];
 for(let i=1;i<=2;i++)statements.push(db().prepare('INSERT OR IGNORE INTO users(id,name,company,email,passwordHash,role,region) VALUES (?,?,?,?,?,?,?)').bind('demo-'+i,i===1?'Александр Смирнов':'Дана Омарова',i===1?'ТОО «Алматы Дистрибьюшн»':'ТОО «Север Трейд»',`distributor${i}@demo.com`,pw,'distributor',regions[i-1]));
 for(let r=0;r<4;r++){
  const sid='supplier-'+r;statements.push(db().prepare('INSERT OR IGNORE INTO suppliers(id,name,region,email) VALUES (?,?,?,?)').bind(sid,'Поставщик — '+regions[r],regions[r],['south','north','west','east'][r]+'@example.com'));
  for(let i=0;i<merchandise.length;i++){const m=merchandise[i],id=`${r}-${m.key}`;statements.push(db().prepare('INSERT OR IGNORE INTO products(id,sku,name,description,image,region,price,availableQuantity,supplierId,category) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,`CC-${['S','N','W','E'][r]}-${String(i+1).padStart(3,'0')}`,m.name,m.description,`/products/${m.key}.svg`,regions[r],m.price,m.stock,sid,m.category));
   for(const size of m.sizes||[])statements.push(db().prepare('INSERT OR IGNORE INTO variants(id,productId,size,availableQuantity) VALUES (?,?,?,?)').bind(id+'-'+size,id,size,m.stock/5));
  }
 }
 await db().batch(statements);
}
async function user(req:Request){const token=req.headers.get('cookie')?.match(/(?:^|;\s*)cci_session=([^;]+)/)?.[1];if(!token)fail('Войдите в кабинет',401);const row=await db().prepare('SELECT u.id,u.name,u.company,u.email,u.region FROM users u JOIN sessions s ON s.userId=u.id WHERE s.id=? AND s.expiresAt>?').bind(await hash(token!),Date.now()).first();if(!row)fail('Сессия истекла. Войдите снова',401);return row!}
async function orderView(id:string,uid:string){const o:any=await db().prepare('SELECT id,orderNumber,userId,region,totalAmount,status,createdAt,confirmedAt FROM orders WHERE id=? AND userId=?').bind(id,uid).first();if(!o)fail('Заказ не найден',404);const items=(await db().prepare('SELECT * FROM orderItems WHERE orderId=?').bind(id).all()).results;let email=null;if(cfg().EMAIL_PREVIEW!=='false'&&demo())email=await db().prepare('SELECT recipient,subject,html,confirmationUrl,status,lastError FROM outbox WHERE orderId=?').bind(id).first();return {...o,items,email}}
async function sendEmail(orderId:string){const c=cfg();const mail=await db().prepare('SELECT * FROM outbox WHERE orderId=?').bind(orderId).first<any>();if(!mail||mail.status==='sent'||!c.RESEND_API_KEY)return;
 try{if(!c.EMAIL_FROM)throw new Error('EMAIL_FROM не настроен');const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${c.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':orderId},body:JSON.stringify({from:c.EMAIL_FROM,to:[mail.recipient],subject:mail.subject,html:mail.html}),signal:AbortSignal.timeout(10000)});if(!res.ok)throw new Error('Ошибка email API: '+res.status);await db().prepare('UPDATE outbox SET status=?,sentAt=?,lastError=NULL WHERE orderId=?').bind('sent',new Date().toISOString(),orderId).run()}
 catch(e){await db().prepare('UPDATE outbox SET status=?,lastError=? WHERE orderId=?').bind('failed',String(e),orderId).run()}}
export async function GET(req:Request){try{await seed();const url=new URL(req.url),action=url.searchParams.get('action')||'session';
 if(action==='config')return json({demo:demo()});
 if(action==='supplier'){const token=url.searchParams.get('token')||'';if(!/^[a-f0-9]{64}$/.test(token))fail('Недействительная ссылка',404);const o=await db().prepare('SELECT id,orderNumber,region,totalAmount,status,createdAt,confirmedAt FROM orders WHERE confirmationHash=?').bind(await hash(token)).first<any>();if(!o)fail('Ссылка не найдена',404);const items=(await db().prepare('SELECT name,sku,size,quantity,unitPrice,totalPrice FROM orderItems WHERE orderId=?').bind(o.id).all()).results;return json({...o,items})}
 const u=await user(req);
 if(action==='session')return json({user:u,demo:demo()});
 if(action==='catalogue'){const region=url.searchParams.get('region');if(!regions.includes(region!))fail('Регион не найден');const products=(await db().prepare('SELECT * FROM products WHERE region=? ORDER BY sku').bind(region).all()).results;const variants=(await db().prepare('SELECT v.* FROM variants v JOIN products p ON p.id=v.productId WHERE p.region=?').bind(region).all()).results;return json({products:products.map(p=>({...p,variants:variants.filter(v=>v.productId===p.id)}))})}
 if(action==='regions')return json({regions:(await db().prepare('SELECT region,count(*) as count FROM products GROUP BY region').all()).results});
 if(action==='orders'){const list=(await db().prepare('SELECT o.id,o.orderNumber,o.region,o.totalAmount,o.status,o.createdAt,(SELECT SUM(quantity) FROM orderItems WHERE orderId=o.id) AS itemCount FROM orders o WHERE userId=? ORDER BY createdAt DESC').bind(u.id).all()).results;return json({orders:list})}
 if(action==='order')return json(await orderView(url.searchParams.get('id')||'',String(u.id)));
 fail('Не найдено',404);
 }catch(e:any){return json({error:translate(requestLocale(req),e.status?e.message:'Не удалось загрузить данные. Попробуйте ещё раз.')},e.status||500)}}
export async function POST(req:Request){try{
 const url=new URL(req.url);const origin=req.headers.get('origin');if(origin&&origin!==url.origin)fail('Недопустимый источник запроса',403);
 if(Number(req.headers.get('content-length')||0)>25000)fail('Слишком большой запрос',413);
 const b=await req.json() as any;await seed();
 if(b.action==='login'){
  const email=String(b.email||'').trim().toLowerCase();const a=await db().prepare('SELECT * FROM attempts WHERE email=?').bind(email).first<any>();if(a&&a.count>=8&&Date.now()-a.updatedAt<900000)fail('Слишком много попыток. Попробуйте через 15 минут',429);
  const u=await db().prepare('SELECT * FROM users WHERE email=?').bind(email).first<any>();const salt=u?.passwordHash.split(':')[0]||'dummy';const input=await password(String(b.password||''),salt);if(!u||(!demo()&&u.id.startsWith('demo-'))||input!==u.passwordHash.split(':')[1]){await db().prepare('INSERT INTO attempts(email,count,updatedAt) VALUES (?,1,?) ON CONFLICT(email) DO UPDATE SET count=CASE WHEN updatedAt<? THEN 1 ELSE count+1 END,updatedAt=excluded.updatedAt').bind(email,Date.now(),Date.now()-900000).run();fail('Неверный email или пароль',401)}
  const token=random();await db().batch([db().prepare('DELETE FROM attempts WHERE email=?').bind(email),db().prepare('INSERT INTO sessions(id,userId,expiresAt) VALUES (?,?,?)').bind(await hash(token),u.id,Date.now()+86400000)]);return json({ok:true},200,{'Set-Cookie':`cci_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${url.protocol==='https:'?'; Secure':''}`});
 }
 if(b.action==='logout'){const token=req.headers.get('cookie')?.match(/(?:^|;\s*)cci_session=([^;]+)/)?.[1];if(token)await db().prepare('DELETE FROM sessions WHERE id=?').bind(await hash(token)).run();return json({ok:true},200,{'Set-Cookie':'cci_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'})}
 if(b.action==='supplierConfirm'){if(!/^[a-f0-9]{64}$/.test(b.token||''))fail('Недействительная ссылка',404);const o=await db().prepare('SELECT id FROM orders WHERE confirmationHash=?').bind(await hash(b.token)).first();if(!o)return json({error:translate(requestLocale(req),'Ссылка не найдена')},404);await db().prepare("UPDATE orders SET status='Получен поставщиком',confirmedAt=? WHERE id=? AND confirmedAt IS NULL").bind(new Date().toISOString(),o.id).run();return json({ok:true})}
 const u=await user(req);
 if(b.action==='retryEmail'){const o=await orderView(b.id,String(u.id));await sendEmail(String(o.id));return json(await orderView(String(o.id),String(u.id)))}
 if(b.action!=='checkout')fail('Неизвестное действие');
 if(!Array.isArray(b.items)||!b.items.length||b.items.length>40)fail('Проверьте состав заказа');
 if(typeof b.key!=='string'||b.key.length<16||b.key.length>100)fail('Некорректный ключ заказа');
 const duplicate=await db().prepare('SELECT id FROM orders WHERE userId=? AND idempotencyKey=?').bind(u.id,b.key).first();if(duplicate)return json(await orderView(String(duplicate.id),String(u.id)));
 const lines:any[]=[];const seen=new Set();let region='';let total=0;
 for(const item of b.items){if(!Number.isSafeInteger(item.quantity)||item.quantity<1)fail('Количество должно быть целым числом от 1');const p=await db().prepare('SELECT * FROM products WHERE id=?').bind(String(item.productId)).first<any>();if(!p)fail('Товар не найден');if(region&&region!==p.region)fail('В одном заказе могут быть товары только одного региона');region=p.region;
 const variants=(await db().prepare('SELECT * FROM variants WHERE productId=?').bind(p.id).all()).results;const v=variants.find(v=>v.size===item.size);if(variants.length&&!v)fail('Выберите размер');const size=v?String(v.size):null,key=p.id+':'+size;if(seen.has(key))fail('Объедините одинаковые позиции');seen.add(key);if(item.quantity>Number(v?.availableQuantity??p.availableQuantity))fail('Недостаточно товара: '+p.name);total+=p.price*item.quantity;lines.push({...p,size,variantId:v?.id,quantity:item.quantity});
 }
 const id=crypto.randomUUID(),number='ORD-'+new Date().getFullYear()+'-'+id.replaceAll('-','').slice(0,12).toUpperCase(),token=random(),createdAt=new Date().toISOString();
 const supplier=await db().prepare('SELECT * FROM suppliers WHERE region=?').bind(region).first<any>();const idx=regions.indexOf(region);const recipient=cfg()[['SUPPLIER_SOUTH_EMAIL','SUPPLIER_NORTH_EMAIL','SUPPLIER_WEST_EMAIL','SUPPLIER_EAST_EMAIL'][idx]]||supplier.email;
 const language=requestLocale(req);const base=cfg().APP_URL||url.origin;const confirmationUrl=base.replace(/\/$/,'')+'/?supplier='+token+'&lang='+language;
 const {subject,html}=buildOrderEmail(language,{number,region,user:{name:String(u.name),company:String(u.company),email:String(u.email)},lines,total,confirmationUrl});
 const stmts=[db().prepare('INSERT INTO orders(id,orderNumber,userId,region,totalAmount,status,createdAt,confirmationHash,idempotencyKey) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,number,u.id,region,total,'Отправлен поставщику',createdAt,await hash(token),b.key)];
 for(const l of lines){stmts.push(db().prepare('UPDATE products SET availableQuantity=availableQuantity-? WHERE id=?').bind(l.quantity,l.id));if(l.variantId)stmts.push(db().prepare('UPDATE variants SET availableQuantity=availableQuantity-? WHERE id=?').bind(l.quantity,l.variantId));stmts.push(db().prepare('INSERT INTO orderItems(id,orderId,productId,name,sku,image,size,quantity,unitPrice,totalPrice) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,l.id,l.name,l.sku,l.image,l.size,l.quantity,l.price,l.quantity*l.price))}
 stmts.push(db().prepare('INSERT INTO outbox(id,orderId,recipient,subject,html,confirmationUrl,status) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(),id,recipient,subject,html,confirmationUrl,cfg().RESEND_API_KEY?'pending':'preview'));
 try{await db().batch(stmts)}catch{const existing=await db().prepare('SELECT id FROM orders WHERE userId=? AND idempotencyKey=?').bind(u.id,b.key).first();if(existing)return json(await orderView(String(existing.id),String(u.id)));fail('Остатки изменились. Обновите каталог и проверьте количество',409)}
 await sendEmail(id);return json(await orderView(id,String(u.id)),201);
 }catch(e:any){return json({error:translate(requestLocale(req),e.status?e.message:'Не удалось выполнить действие. Попробуйте ещё раз.')},e.status||500)}}
