import {randomUUID} from 'node:crypto';
import catalog from '../src/data/mission-points.json' with {type:'json'};

export async function missionRoute({req,url,user,getDb,commit,body,reply}){
  if(!url.pathname.startsWith('/api/missions')&&!url.pathname.startsWith('/api/mission-attempts'))return false;
  const db=getDb(),missions=db.missions??[],attempts=db.missionAttempts??[];
  const visible=m=>user.role==='manager'||m.assigneeId==='all'||m.assigneeId===user.id;
  if(url.pathname==='/api/missions/assignees'&&req.method==='GET'){
    if(user.role!=='manager'){reply(403,{error:'Only managers can assign missions.'});return true;}
    reply(200,{users:db.users.filter(u=>u.role==='employee').map(({id,name,email})=>({id,name,email}))});return true;
  }
  if(url.pathname==='/api/missions'&&req.method==='GET'){
    reply(200,{missions:missions.filter(visible),attempts:attempts.filter(a=>user.role==='manager'||a.userId===user.id)});return true;
  }
  if(url.pathname==='/api/missions'&&req.method==='POST'){
    if(user.role!=='manager'){reply(403,{error:'Only managers can assign missions.'});return true;}
    const input=await body();
    if(typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>100||!catalog.starts.some(s=>s.id===input.startId)||!Array.isArray(input.stops)||input.stops.length<1||input.stops.length>12||input.stops.some((s,i)=>!catalog.destinations.includes(s)||(i>0&&s===input.stops[i-1]))||(input.assigneeId!=='all'&&!db.users.some(u=>u.id===input.assigneeId&&u.role==='employee'))){reply(400,{error:'Enter a name, a starting point, 1–12 ordered destinations and an employee. Adjacent stops must differ.'});return true;}
    if(missions.length>=1000){reply(409,{error:'The demo mission store is full.'});return true;}
    const mission={id:randomUUID(),name:input.name.trim(),startId:input.startId,stops:input.stops,assigneeId:input.assigneeId,managerName:user.name,createdAt:new Date().toISOString()};
    commit({...db,missions:[mission,...missions]});reply(201,{mission});return true;
  }
  const start=url.pathname.match(/^\/api\/missions\/([a-z0-9-]+)\/attempts$/);
  if(start&&req.method==='POST'){
    const mission=missions.find(m=>m.id===start[1]&&visible(m));
    if(!mission){reply(404,{error:'Mission not found.'});return true;}
    const active=attempts.find(a=>a.userId===user.id&&['manual','review'].includes(a.phase));
    if(active){reply(409,{error:'Finish or abandon your current mission first.'});return true;}
    if(attempts.length>=20000){reply(409,{error:'The demo attempt store is full.'});return true;}
    const attempt={id:randomUUID(),missionId:mission.id,userId:user.id,userName:user.name,phase:'manual',next:0,version:1,startedAt:new Date().toISOString()};
    commit({...db,missionAttempts:[...attempts,attempt]});reply(201,{attempt});return true;
  }
  const match=url.pathname.match(/^\/api\/mission-attempts\/([a-z0-9-]+)$/);
  if(match&&req.method==='PATCH'){
    const attempt=attempts.find(a=>a.id===match[1]&&a.userId===user.id);
    if(!attempt){reply(404,{error:'Attempt not found.'});return true;}
    const input=await body(),mission=missions.find(m=>m.id===attempt.missionId);
    if(input.version!==attempt.version){reply(409,{error:'Progress changed. Refresh your mission before continuing.'});return true;}
    let updated={...attempt,version:attempt.version+1};
    if(input.action==='cancel'&&['manual','review'].includes(attempt.phase))updated.phase='cancelled';
    else if(input.action==='checkpoint'&&['manual','review'].includes(attempt.phase)&&attempt.next<mission.stops.length&&input.stopId===mission.stops[attempt.next]){
      updated.next++;
      if(updated.next===mission.stops.length){if(attempt.phase==='manual')updated.manualCompletedAt=new Date().toISOString();else{updated.phase='completed';updated.completedAt=new Date().toISOString();}}
    }else if(input.action==='review'&&attempt.phase==='manual'&&attempt.next===mission.stops.length){updated.phase='review';updated.next=0;}
    else{reply(400,{error:'Complete the checkpoints in order before starting review.'});return true;}
    commit({...db,missionAttempts:attempts.map(a=>a.id===attempt.id?updated:a)});reply(200,{attempt:updated});return true;
  }
  reply(404,{error:'Mission endpoint not found.'});return true;
}
