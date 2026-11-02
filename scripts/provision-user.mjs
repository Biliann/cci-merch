// Accept one JSON object on stdin: {name,company,email,password,region}.
// Emits SQL with a salted password hash; never emits the plaintext password.
import { webcrypto, randomUUID, randomBytes } from 'node:crypto';
let input='';for await(const chunk of process.stdin)input+=chunk;
const user=JSON.parse(input);
for(const field of ['name','company','email','password'])if(!user[field])throw new Error('Required field: '+field);
if(user.password.length<12)throw new Error('Use a password of at least 12 characters');
const salt=randomBytes(32).toString('hex');
const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(user.password),'PBKDF2',false,['deriveBits']);
const bits=await webcrypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',iterations:100000,salt:new TextEncoder().encode(salt)},key,256);
const hash=salt+':'+Buffer.from(bits).toString('hex');
const q=v=>v==null?'NULL':"'"+String(v).replaceAll("'","''")+"'";
console.log('INSERT INTO users(id,name,company,email,passwordHash,role,region) VALUES ('+[randomUUID(),user.name,user.company,user.email.trim().toLowerCase(),hash,'distributor',user.region||null].map(q).join(',')+');');
