import {mkdirSync,readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {randomBytes,randomUUID,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {collisionRoute} from './collisions.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const passwordHash=(password,salt)=>scryptSync(password,salt,64).toString('hex');
const displayName=name=>({'Nhân viên demo':'Demo employee','Quản lý văn phòng':'Office manager'}[name]||name);
const publicUser=({id,name,email,role})=>({id,name:displayName(name),email,role});
const publicNote=note=>({...note,authorName:displayName(note.authorName),reviewerName:displayName(note.reviewerName)});
const validText=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.trim().length<=max;
export function createApi({file=process.env.DAYZERO_DATA_FILE||resolve('data/dayzero.json')}={}){
  mkdirSync(dirname(file),{recursive:true});
  const save=db=>{const temp=file+'.tmp';writeFileSync(temp,JSON.stringify(db,null,2),{mode:0o600});renameSync(temp,file);};
  if(!existsSync(file)){
    const make=(name,email,role,password)=>{const salt=randomBytes(16).toString('hex');return {id:randomUUID(),name,email,role,salt,passwordHash:passwordHash(password,salt)};};
    save({users:[make('Demo employee','employee@dayzero.local','employee',process.env.DAYZERO_EMPLOYEE_PASSWORD||'DayZero2026!'),make('Office manager','manager@dayzero.local','manager',process.env.DAYZERO_MANAGER_PASSWORD||'DayZero2026!')],notes:[]});
  }
  // A malformed data file must fail startup rather than silently erase shared notes.
  let db=JSON.parse(readFileSync(file,'utf8'));
  if(!Array.isArray(db.users)||!Array.isArray(db.notes))throw new Error('Invalid Day Zero data file');
  db.collisionRuns??=[];db.collisions??=[];
  if(!Array.isArray(db.collisionRuns)||!Array.isArray(db.collisions))throw new Error('Invalid collision history');
  const sessions=new Map(),attempts=new Map();
  const commit=next=>{save(next);db=next;};
  return async function api(req,res,next){
    const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith('/api/'))return next();
    const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
    try{
      if(!['GET','HEAD'].includes(req.method)&&req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return reply(403,{error:"Cross-origin requests are not allowed."});
      const now=Date.now();for(const [id,s] of sessions)if(s.expires<now)sessions.delete(id);
      for(const [id,a] of attempts)if(a.until<now)attempts.delete(id);
      const cookie=req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('dayzero_auth='))?.slice(13);
      const auth=cookie&&sessions.get(hash(cookie)),user=auth&&db.users.find(u=>u.id===auth.userId);
      const body=async()=>{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16000)throw Object.assign(new Error("The content is too long."),{status:413});}try{const input=JSON.parse(raw||'{}');if(!input||Array.isArray(input)||typeof input!=='object')throw new Error();return input;}catch{throw Object.assign(new Error("Invalid JSON body."),{status:400});}};
      const setCookie=(value,maxAge)=>res.setHeader('Set-Cookie',`dayzero_auth=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${req.socket.encrypted||process.env.DAYZERO_SECURE_COOKIE==='1'?'; Secure':''}`);
      if(url.pathname==='/api/auth/me'&&req.method==='GET')return reply(200,{user:user?publicUser(user):null});
      if(url.pathname==='/api/auth/login'&&req.method==='POST'){
        const key=req.socket.remoteAddress||'local',attempt=attempts.get(key)||{count:0,until:now+60000};
        if(attempt.count>=30)return reply(429,{error:"Too many sign-in attempts. Please wait one minute."});
        const input=await body();if(!validText(input.email,254)||!validText(input.password,256))return reply(400,{error:"Enter a valid email and password."});
        const found=db.users.find(u=>u.email===input.email.trim().toLowerCase());
        const actual=Buffer.from(passwordHash(input.password,found?.salt||'missing-user-salt'),'hex');
        const expected=Buffer.from(found?.passwordHash||'00'.repeat(64),'hex');
        if(!found||!timingSafeEqual(actual,expected)){attempt.count++;attempts.set(key,attempt);return reply(401,{error:"Incorrect email or password."});}
        attempts.delete(key);if(cookie)sessions.delete(hash(cookie));const token=randomBytes(32).toString('hex');
        sessions.set(hash(token),{userId:found.id,expires:now+8*3600000});setCookie(token,8*3600);return reply(200,{user:publicUser(found)});
      }
      if(url.pathname==='/api/auth/logout'&&req.method==='POST'){if(cookie)sessions.delete(hash(cookie));setCookie('',0);return reply(200,{ok:true});}
      if(!user)return reply(401,{error:"Your session has expired. Please sign in again."});
      if(await collisionRoute({req,url,user:{...user,name:displayName(user.name)},getDb:()=>db,commit,body,reply}))return;
      if(url.pathname==='/api/notes'&&req.method==='GET')return reply(200,{notes:db.notes.filter(n=>user.role==='manager'||n.authorId===user.id).map(publicNote)});
      if(url.pathname==='/api/notes'&&req.method==='POST'){
        const input=await body(),p=input.position;
        if(!validText(input.concern,2000)||!validText(input.request,2000)||!p||![1,2].includes(p.floor)||!Number.isFinite(p.x)||!Number.isFinite(p.z)||!Number.isFinite(p.y)||p.x < -12||p.x>12||p.z < -20||p.z>(p.floor===1?14:7)||p.y<0||p.y>3.2)return reply(400,{error:"Check the concern, requested change and note location."});
        if(db.notes.length>=10000)return reply(409,{error:"The demo note store is full. Please contact a manager."});
        const note={id:randomUUID(),authorId:user.id,authorName:user.name,authorEmail:user.email,position:{floor:p.floor,x:p.x,z:p.z,y:p.y},concern:input.concern.trim(),request:input.request.trim(),status:'new',review:'',reviewerName:'',version:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
        commit({...db,notes:[note,...db.notes]});return reply(201,{note:publicNote(note)});
      }
      const match=url.pathname.match(/^\/api\/notes\/([a-z0-9-]+)$/);
      if(match&&req.method==='PATCH'){
        if(user.role!=='manager')return reply(403,{error:"Only managers can review notes."});
        const input=await body(),note=db.notes.find(n=>n.id===match[1]);if(!note)return reply(404,{error:"Note not found."});
        if(!['reviewing','approved','declined','resolved'].includes(input.status)||!validText(input.review,2000))return reply(400,{error:"Choose a status and enter an assessment or response."});
        if(input.version!==note.version)return reply(409,{error:"Another manager updated this note. Reload it before submitting your review."});
        const updated={...note,status:input.status,review:input.review.trim(),reviewerName:user.name,version:note.version+1,updatedAt:new Date().toISOString()};
        commit({...db,notes:db.notes.map(n=>n.id===note.id?updated:n)});return reply(200,{note:publicNote(updated)});
      }
      return reply(404,{error:"Endpoint not found."});
    }catch(error){if(!res.headersSent)reply(error.status||500,{error:error.status?error.message:"Unable to save or read data. Please try again."});}
  };
}
