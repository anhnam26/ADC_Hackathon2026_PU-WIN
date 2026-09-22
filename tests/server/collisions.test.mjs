import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtempSync,unlinkSync,rmdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createApi} from '../../server/api.mjs';

test('collision sessions enforce ownership, validate batches, deduplicate retries and persist without losing notes',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'dayzero-collisions-')),file=join(dir,'data.json');let handler=createApi({file});
 const server=createServer((req,res)=>handler(req,res,()=>{res.writeHead(404);res.end();}));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}`;
 const request=(path,method='GET',body,cookie)=>fetch(url+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
 const login=async email=>(await request('/api/auth/login','POST',{email,password:'DayZero2026!'})).headers.get('set-cookie').split(';')[0];
 try{
  assert.equal((await request('/api/collision-history')).status,401);
  const employee=await login('employee@dayzero.local'),manager=await login('manager@dayzero.local');
  const profile={mode:'wheelchair',widthCm:70,lengthCm:110,heightCm:95,seatHeightCm:48,armrestHeightCm:70};
  const event={id:'evt-1',occurredAt:new Date().toISOString(),objectId:'entry-door',objectName:'Entrance door & handle',kind:'object',movement:'manual',action:'translation',position:{floor:1,x:0,z:7,y:0},playerPose:{floor:1,x:0,z:7.6,y:0,yaw:0},profile};
  const run={id:'run-1',startedAt:new Date().toISOString(),profile,finish:false,events:[event],authorId:'forged'};
  assert.equal((await request('/api/collision-history','GET',null,employee)).status,403);
  assert.equal((await request('/api/collision-runs','POST',{...run,events:[{...event,position:{...event.position,floor:3}}]},employee)).status,400);
  assert.equal((await request('/api/collision-runs','POST',{...run,events:[{...event,profile:{...profile,widthCm:-1}}]},employee)).status,400);
  assert.equal((await request('/api/collision-runs','POST',{...run,events:Array(16).fill(event)},employee)).status,400);
  const responses=await Promise.all([request('/api/collision-runs','POST',run,employee),request('/api/collision-runs','POST',run,employee),request('/api/notes','POST',{concern:'Keep this note',request:'More space',position:{floor:1,x:1,y:0,z:8}},employee)]);
  assert.deepEqual(responses.map(r=>r.status),[200,200,201]);
  assert.equal((await request('/api/collision-runs','POST',run,manager)).status,403);
  assert.equal((await request('/api/collision-runs','POST',{...run,id:'run-2'},employee)).status,409);
  assert.equal((await request('/api/collision-runs','POST',{...run,id:'run-2',events:[{...event,id:'evt-2',objectId:'west',objectName:'Wall / room frame (west)',kind:'wall'}]},employee)).status,200);
  assert.equal((await request('/api/collision-runs','POST',{...run,events:[],finish:true},employee)).status,200);
  let history=await (await request('/api/collision-history','GET',null,manager)).json();
  assert.equal(history.runs.length,2);assert.equal(history.collisions.length,2);assert.notEqual(history.runs[0].authorId,'forged');
  assert.ok(history.runs.find(r=>r.id==='run-1').endedAt);assert.equal(history.collisions.find(e=>e.runId==='run-2').kind,'wall');
  const saved=JSON.parse(readFileSync(file,'utf8'));assert.equal(saved.notes.length,1);
  handler=createApi({file});const again=await login('manager@dayzero.local');history=await (await request('/api/collision-history','GET',null,again)).json();
  assert.equal(history.collisions.length,2);assert.equal(history.runs.length,2);
 }finally{await new Promise(resolve=>server.close(resolve));unlinkSync(file);rmdirSync(dir);}
});
