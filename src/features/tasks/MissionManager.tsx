import {useEffect,useState,type FormEvent} from 'react';
import {api} from '../../lib/api';
import {objects} from '../../data/space';
import catalog from '../../data/mission-points.json';
import {useLocale} from '../../lib/i18n';
import type {MissionFeed} from '../../types/missions';
import SpatialMap from '../notes/SpatialMap';
import '../../styles/missions.css';

export default function MissionManager(){
  const {t}=useLocale();
  const [feed,setFeed]=useState<MissionFeed>({missions:[],attempts:[]});
  const [users,setUsers]=useState<{id:string;name:string;email:string}[]>([]);
  const [name,setName]=useState(''),[startId,setStart]=useState('courtyard'),[assigneeId,setAssignee]=useState('all');
  const [stops,setStops]=useState(['reception-counter','desk-b21']),[floor,setFloor]=useState<1|2>(1);
  const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const destinations=catalog.destinations.map(id=>objects.find(o=>o.id===id)!);
  const refresh=async()=>{try{setFeed(await api<MissionFeed>('/missions'));setError('');}catch(e){setError((e as Error).message);}};
  useEffect(()=>{void refresh();void api<{users:typeof users}>('/missions/assignees').then(r=>setUsers(r.users)).catch(e=>setError(e.message));const timer=setInterval(()=>void refresh(),5000);return()=>clearInterval(timer);},[]);
  const start=catalog.starts.find(s=>s.id===startId)!;
  const pins=[{...start,label:'S'},...stops.map((id,i)=>{const o=objects.find(o=>o.id===id)!;return {x:o.position[0],z:o.position[2],floor:o.floor??1,label:String(i+1)};})];
  async function submit(e:FormEvent){
    e.preventDefault();setBusy(true);setError('');setMessage('');
    try{await api('/missions',{method:'POST',body:JSON.stringify({name,startId,assigneeId,stops})});setName('');setMessage('Mission assigned. Employees will receive it in their simulator.');await refresh();}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <section className="mission-manager" aria-label="Exploration missions">
    <span className="eyebrow">MISSION CONTROL</span><h2>Assign an exploration mission</h2><p>Employees drive through checkpoints in order, then watch an automatic route review.</p>
    <div className="mission-editor"><form onSubmit={submit}>
      <label>Mission name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)} placeholder="My first morning at the office"/></label>
      <label>Assign to<select value={assigneeId} onChange={e=>setAssignee(e.target.value)}><option value="all">All employees</option>{users.map(u=><option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}</select></label>
      <label>Starting point<select value={startId} onChange={e=>{setStart(e.target.value);setFloor(catalog.starts.find(s=>s.id===e.target.value)!.floor as 1|2);}}>{catalog.starts.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <ol className="mission-stop-editor">{stops.map((id,i)=><li key={i}><label>{i===stops.length-1?'Final destination':`Checkpoint ${i+1}`}<select value={id} onChange={e=>setStops(old=>old.map((s,j)=>i===j?e.target.value:s))}>{destinations.map(o=><option key={o.id} value={o.id}>Floor {o.floor??1} · {t(o.name)}</option>)}</select></label><div><button type="button" aria-label={`Move checkpoint ${i+1} up`} disabled={i===0} onClick={()=>setStops(old=>{const a=[...old];[a[i-1],a[i]]=[a[i],a[i-1]];return a;})}>↑</button><button type="button" aria-label={`Remove checkpoint ${i+1}`} disabled={stops.length===1} onClick={()=>setStops(old=>old.filter((_,j)=>j!==i))}>Remove</button></div></li>)}</ol>
      <div className="dialog-actions"><button type="button" className="button secondary" disabled={stops.length>=12} onClick={()=>setStops(old=>[...old,old.at(-1)==='f2-water'?'reception-counter':'f2-water'])}>Add destination</button><button className="button primary" disabled={busy}>{busy?'Assigning…':'Assign mission'}</button></div>
      {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    </form><div><label>Preview floor<select value={floor} onChange={e=>setFloor(Number(e.target.value) as 1|2)}><option value="1">Floor 1</option><option value="2">Floor 2</option></select></label><SpatialMap floor={floor} overlay={<g>{pins.filter(p=>p.floor===floor).map((p,i)=><g key={i} transform={`translate(${p.x} ${p.z})`}><circle r=".58" fill="#176487" stroke="white" strokeWidth=".08"/><text textAnchor="middle" dominantBaseline="central" fontSize=".4" fill="white">{p.label}</text></g>)}</g>}/><p>S = spawn · Numbers = visit order. Different floors connect through the lift. Routes adapt to each wheelchair’s dimensions.</p></div></div>
    <h3>Assigned missions</h3>{!feed.missions.length&&<p>No missions assigned yet.</p>}
    <div className="mission-assigned-list">{feed.missions.map(m=><article key={m.id}><h4>{m.name}</h4><p>{m.assigneeId==='all'?'All employees':users.find(u=>u.id===m.assigneeId)?.email} · {m.stops.length} destinations</p><p>{catalog.starts.find(s=>s.id===m.startId)?.name} → {m.stops.map(id=>t(objects.find(o=>o.id===id)!.name)).join(' → ')}</p>{feed.attempts.filter(a=>a.missionId===m.id).map(a=><p key={a.id}>{a.userName} · {a.phase==='manual'&&a.manualCompletedAt?'Manual complete — awaiting review':a.phase} · {a.next}/{m.stops.length} · {new Date(a.startedAt).toLocaleString('en-US')}</p>)}</article>)}</div>
  </section>;
}
