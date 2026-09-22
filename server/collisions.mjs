import {isNpcCollision} from '../shared/collisionPolicy.mjs';
const id=value=>typeof value==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(value);
const text=value=>typeof value==='string'&&value.trim().length>0&&value.length<=180;
const date=value=>typeof value==='string'&&value.length<=40&&Number.isFinite(Date.parse(value));
const profile=p=>p&&['wheelchair','walking'].includes(p.mode)&&[['widthCm',45,130],['lengthCm',70,180],['heightCm',55,150],['seatHeightCm',30,80],['armrestHeightCm',45,120]].every(([k,min,max])=>Number.isFinite(p[k])&&p[k]>=min&&p[k]<=max)&&p.seatHeightCm<p.armrestHeightCm&&p.armrestHeightCm<=p.heightCm;
const cleanProfile=p=>Object.fromEntries(['mode','widthCm','lengthCm','heightCm','seatHeightCm','armrestHeightCm'].map(k=>[k,p[k]]));
const point=p=>p&&[1,2].includes(p.floor)&&Number.isFinite(p.x)&&Math.abs(p.x)<=12.1&&Number.isFinite(p.z)&&p.z>=-20.1&&p.z<=(p.floor===1?14.1:7.1)&&Number.isFinite(p.y)&&p.y>=0&&p.y<=3.2;

export async function collisionRoute({req,url,user,getDb,commit,body,reply}){
  if(url.pathname==='/api/collision-history'&&req.method==='GET'){
    if(user.role!=='manager'){reply(403,{error:'Only managers can view collision history.'});return true;}
    const db=getDb();reply(200,{runs:db.collisionRuns,collisions:db.collisions});return true;
  }
  if(url.pathname!=='/api/collision-runs'||req.method!=='POST')return false;
  const input=await body();
  const db=getDb();
  if(!id(input.id)||!date(input.startedAt)||!profile(input.profile)||!Array.isArray(input.events)||input.events.length>15||typeof input.finish!=='boolean'){
    reply(400,{error:'Invalid simulator session or collision batch.'});return true;
  }
  const existing=db.collisionRuns.find(r=>r.id===input.id);
  if(existing&&existing.authorId!==user.id){reply(403,{error:'This simulator session belongs to another user.'});return true;}
  if(input.events.some(e=>!e||!id(e.id)||!id(e.objectId)||!text(e.objectName)||!date(e.occurredAt)||!point(e.position)||!profile(e.profile)||e.profile.mode!=='wheelchair'||!point(e.playerPose)||!Number.isFinite(e.playerPose.yaw)||Math.abs(e.playerPose.yaw)>Math.PI+.01||e.position.floor!==e.playerPose.floor||!['object','wall','boundary','colleague'].includes(e.kind)||!['manual','auto'].includes(e.movement)||!['rotation','translation'].includes(e.action))){
    reply(400,{error:'Invalid collision data.'});return true;
  }
  const known=new Map(db.collisions.map(e=>[e.id,e]));
  if(input.events.some(e=>known.has(e.id)&&known.get(e.id).runId!==input.id)){
    reply(409,{error:'A collision ID belongs to a different session.'});return true;
  }
  const receivedAt=new Date().toISOString(),fresh=[];
  for(const e of input.events){
    if(isNpcCollision(e)||known.has(e.id))continue;
    const saved={id:e.id,runId:input.id,authorId:user.id,receivedAt,occurredAt:e.occurredAt,objectId:e.objectId,objectName:e.objectName.trim(),kind:e.kind,movement:e.movement,action:e.action,
      position:{floor:e.position.floor,x:e.position.x,y:e.position.y,z:e.position.z},
      playerPose:{floor:e.playerPose.floor,x:e.playerPose.x,y:e.playerPose.y,z:e.playerPose.z,yaw:e.playerPose.yaw},profile:cleanProfile(e.profile)};
    fresh.push(saved);known.set(saved.id,saved);
  }
  if((!existing&&db.collisionRuns.length>=2000)||db.collisions.length+fresh.length>20000){reply(409,{error:'The demo collision store is full. Contact a manager.'});return true;}
  const run=existing??{id:input.id,authorId:user.id,authorName:user.name,authorEmail:user.email,startedAt:input.startedAt,profile:cleanProfile(input.profile),mapVersion:'office-v1-two-floors',endedAt:null};
  const updated={...run,lastSeenAt:receivedAt,endedAt:run.endedAt??(input.finish?receivedAt:null)};
  commit({...db,collisionRuns:existing?db.collisionRuns.map(r=>r.id===run.id?updated:r):[updated,...db.collisionRuns],collisions:[...db.collisions,...fresh]});
  // Acknowledge discarded legacy NPC events too, so older clients clear their queue.
  reply(200,{accepted:input.events.map(e=>e.id)});return true;
}
