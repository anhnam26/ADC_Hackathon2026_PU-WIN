import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtempSync,unlinkSync,rmdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createApi} from '../../server/api.mjs';

test('authenticated notes API enforces ownership, roles, input validation, review conflicts and persistence',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'dayzero-api-')),file=join(dir,'data.json');let handler=createApi({file});
 const server=createServer((req,res)=>handler(req,res,()=>{res.writeHead(404);res.end();}));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}`;
 const request=(path,method='GET',body,cookie)=>fetch(url+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
 const login=async(email)=>{const r=await request('/api/auth/login','POST',{email,password:'DayZero2026!'});assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/HttpOnly/);const json=await r.json();assert.equal(json.user.passwordHash,undefined);return r.headers.get('set-cookie').split(';')[0];};
 try{
 assert.equal((await request('/api/notes')).status,401);
 const employee=await login('employee@dayzero.local'),manager=await login('manager@dayzero.local');
 const data={concern:'  Lối này hẹp  ',request:'Mở rộng lối đi',position:{floor:2,x:-7.45,z:-11.9,y:3.2},authorId:'forged',status:'resolved'};
 assert.equal((await request('/api/notes','POST',{...data,position:{...data.position,x:100}},employee)).status,400);
 assert.equal((await request('/api/notes','POST',{...data,request:'  '},employee)).status,400);
 const response=await request('/api/notes','POST',data,employee);assert.equal(response.status,201);const {note}=await response.json();assert.equal(note.status,'new');assert.notEqual(note.authorId,'forged');assert.equal(note.concern,'Lối này hẹp');
 const adminNote=await (await request('/api/notes','POST',data,manager)).json();
 const employeeNotes=await (await request('/api/notes','GET',undefined,employee)).json();assert.equal(employeeNotes.notes.length,1);assert.notEqual(employeeNotes.notes[0].id,adminNote.note.id);
 assert.equal((await request(`/api/notes/${note.id}`,'PATCH',{status:'approved',review:'yes',version:1},employee)).status,403);
 assert.equal((await request(`/api/notes/${note.id}`,'PATCH',{status:'approved',review:'yes',version:1},manager)).status,200);
 assert.equal((await request(`/api/notes/${note.id}`,'PATCH',{status:'resolved',review:'stale',version:1},manager)).status,409);
 assert.equal((await request(`/api/notes/${note.id}`,'PATCH',{status:'resolved',review:' ',version:2},manager)).status,400);
 assert.equal((await fetch(url+'/api/notes',{method:'POST',headers:{Origin:'https://evil.example',Cookie:employee},body:JSON.stringify(data)})).status,403);
 const saved=readFileSync(file,'utf8');assert.ok(!saved.includes('DayZero2026!'));assert.equal(JSON.parse(saved).notes[1].status,'approved');
 handler=createApi({file});assert.equal((await request('/api/notes','GET',undefined,employee)).status,401);const fresh=await login('employee@dayzero.local');const persisted=await (await request('/api/notes','GET',undefined,fresh)).json();assert.equal(persisted.notes[0].review,'yes');assert.equal(persisted.notes[0].position.y,3.2);
 await request('/api/auth/logout','POST',{},fresh);assert.equal((await request('/api/notes','GET',undefined,fresh)).status,401);
 }finally{await new Promise(resolve=>server.close(resolve));unlinkSync(file);rmdirSync(dir);}
});
