import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const migrations=readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort();
// Run each migration once on a fresh database. Later upgrades use Wrangler migrations.
for(const file of migrations){const result=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--file','drizzle/'+file],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1)}
