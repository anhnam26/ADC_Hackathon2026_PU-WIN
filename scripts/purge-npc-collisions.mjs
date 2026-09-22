import {readdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {resolve} from 'node:path';
import {isNpcCollision} from '../shared/collisionPolicy.mjs';

// Offline maintenance for the existing local demo stores; never prints user data.
const directory=resolve('data');
for(const entry of readdirSync(directory,{withFileTypes:true})){
  if(!entry.isFile()||!entry.name.endsWith('.json'))continue;
  const file=resolve(directory,entry.name),db=JSON.parse(readFileSync(file,'utf8'));
  if(!Array.isArray(db.collisions))continue;
  const collisions=db.collisions.filter(event=>!isNpcCollision(event)),removed=db.collisions.length-collisions.length;
  if(removed){const temp=file+'.npc-cleanup.tmp';writeFileSync(temp,JSON.stringify({...db,collisions},null,2),{mode:0o600});renameSync(temp,file);}
  console.log(`${entry.name}: removed ${removed} NPC collisions; retained ${collisions.length} non-person collisions. Other data preserved.`);
}
