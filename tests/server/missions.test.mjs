import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtempSync,unlinkSync,rmdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createApi} from '../../server/api.mjs';
import {missionRoute} from '../../server/missions.mjs';

test('mission saves preserve notes written while the request body is still arriving',async()=>{
 let db={users:[],notes:[],missions:[],missionAttempts:[]},receive;
 const input=new Promise(resolve=>{receive=resolve;});let status;
 const write=missionRoute({req:{method:'POST'},url:{pathname:'/api/missions'},user:{id:'manager',name:'Manager',role:'manager'},getDb:()=>db,commit:next=>{db=next;},body:()=>input,reply:code=>{status=code;}});
 db={...db,notes:[{id:'concurrent-note'}]};
 receive({name:'Office tour',startId:'courtyard',stops:['reception-counter'],assigneeId:'all'});await write;
 assert.equal(status,201);assert.equal(db.notes[0].id,'concurrent-note');assert.equal(db.missions.length,1);
});

test('employees only receive their assignments and their own attempt history',async()=>{
 const db={missions:[{id:'mine',assigneeId:'alice'},{id:'shared',assigneeId:'all'},{id:'private',assigneeId:'bob'}],missionAttempts:[{id:'a',userId:'alice'},{id:'b',userId:'bob'}]};let result;
 await missionRoute({req:{method:'GET'},url:{pathname:'/api/missions'},user:{id:'alice',role:'employee'},getDb:()=>db,reply:(_status,data)=>{result=data;}});
 assert.deepEqual(result.missions.map(m=>m.id),['mine','shared']);assert.deepEqual(result.attempts.map(a=>a.id),['a']);
});

test('missions enforce manager assignment, ordered progress, ownership and persisted manual/review phases',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'dayzero-missions-')),file=join(dir,'data.json');let handler=createApi({file});
 const server=createServer((req,res)=>handler(req,res,()=>res.end()));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}`;
 const request=(path,method='GET',data,cookie)=>fetch(url+'/api'+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});
 const login=async(role)=>{const r=await request('/auth/login','POST',{email:`${role}@dayzero.local`,password:'DayZero2026!'});return r.headers.get('set-cookie').split(';')[0];};
 try{
   assert.equal((await request('/missions')).status,401);
   const employee=await login('employee'),manager=await login('manager');
   const users=await (await request('/missions/assignees','GET',null,manager)).json();
   const data={name:'First morning',startId:'ground-lobby',stops:['f2-water','hr-desk'],assigneeId:users.users[0].id};
   assert.equal((await request('/missions','POST',data,employee)).status,403);
   assert.equal((await request('/missions/assignees','GET',null,employee)).status,403);
   for(const invalid of [{name:' '},{startId:'wall'},{stops:[]},{stops:['missing']},{stops:['hr-desk','hr-desk']},{assigneeId:'missing'}])assert.equal((await request('/missions','POST',{...data,...invalid},manager)).status,400);
   const {mission}=await (await request('/missions','POST',data,manager)).json();
   const {attempt}=await (await request(`/missions/${mission.id}/attempts`,'POST',{},employee)).json();
   const path=`/mission-attempts/${attempt.id}`;
   assert.equal((await request(`/missions/${mission.id}/attempts`,'POST',{},employee)).status,409);
   assert.equal((await request(path,'PATCH',{action:'checkpoint',stopId:'hr-desk',version:1},employee)).status,400);
   assert.equal((await request(path,'PATCH',{action:'review',version:1},employee)).status,400);
   assert.equal((await request(path,'PATCH',{action:'cancel',version:1},manager)).status,404);
   let a=attempt;
   for(const stopId of data.stops){const r=await request(path,'PATCH',{action:'checkpoint',stopId,version:a.version},employee);assert.equal(r.status,200);a=(await r.json()).attempt;}
   assert.ok(a.manualCompletedAt);assert.equal(a.phase,'manual');
   assert.equal((await request(path,'PATCH',{action:'review',version:1},employee)).status,409);
   a=(await (await request(path,'PATCH',{action:'review',version:a.version},employee)).json()).attempt;assert.equal(a.next,0);assert.equal(a.phase,'review');
   for(const stopId of data.stops)a=(await (await request(path,'PATCH',{action:'checkpoint',stopId,version:a.version},employee)).json()).attempt;
   assert.equal(a.phase,'completed');assert.ok(a.completedAt);
   handler=createApi({file});const fresh=await login('employee');const saved=await (await request('/missions','GET',null,fresh)).json();assert.equal(saved.attempts[0].phase,'completed');assert.deepEqual(saved.missions[0].stops,data.stops);
 }finally{await new Promise(r=>server.close(r));unlinkSync(file);rmdirSync(dir);}
});
