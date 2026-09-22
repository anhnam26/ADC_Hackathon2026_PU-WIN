import {useCallback,useEffect,useState,type FormEvent} from 'react';
import {api,type SpatialNote,type NoteStatus} from '../../lib/api';
import {useAccount} from '../auth/AccountContext';
import LanguageSwitch from '../../components/LanguageSwitch';
import SpatialMap,{noteStatus} from './SpatialMap';
import {NoteDetails} from './NotesDialog';
import type {CollisionHistory,SavedCollision} from '../../types/collisions';
import MissionManager from '../tasks/MissionManager';

export default function Admin({onExperience}:{onExperience:()=>void}){
  const {user,logout}=useAccount();
  const [notes,setNotes]=useState<SpatialNote[]>([]),[floor,setFloor]=useState<1|2>(1);
  const [status,setStatus]=useState('all'),[search,setSearch]=useState(''),[selectedId,setSelectedId]=useState('');
  const [error,setError]=useState(''),[loading,setLoading]=useState(true);
  const [history,setHistory]=useState<CollisionHistory>({runs:[],collisions:[]});
  const [historyError,setHistoryError]=useState(''),[runId,setRunId]=useState('all');
  const [selectedCollision,setSelectedCollision]=useState(''),[tab,setTab]=useState<'notes'|'collisions'>('notes');
  const [showCollisions,setShowCollisions]=useState(true),[showNotes,setShowNotes]=useState(true);
  const refresh=useCallback(async()=>{
    try{const result=await api<{notes:SpatialNote[]}>('/notes');setNotes(result.notes);setError('');}
    catch(e){setError((e as Error).message);}finally{setLoading(false);}
  },[]);
  const refreshHistory=useCallback(async()=>{
    try{setHistory(await api<CollisionHistory>('/collision-history'));setHistoryError('');}
    catch(e){setHistoryError((e as Error).message);}
  },[]);
  useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),15000);return()=>clearInterval(timer);},[refresh]);
  useEffect(()=>{
    let stopped=false,timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{await refreshHistory();if(!stopped)timer=setTimeout(poll,2000);};
    void poll();return()=>{stopped=true;clearTimeout(timer);};
  },[refreshHistory]);
  const filtered=notes.filter(n=>n.position.floor===floor&&(status==='all'||n.status===status)&&`${n.concern} ${n.request} ${n.authorName} ${n.authorEmail}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const selected=notes.find(n=>n.id===selectedId&&filtered.includes(n));
  const collisions=history.collisions.filter(e=>runId==='all'||e.runId===runId);
  const visibleCollisions=collisions.filter(e=>e.position.floor===floor);
  const collision=collisions.find(e=>e.id===selectedCollision);
  const run=history.runs.find(r=>r.id===(collision?.runId??runId));
  const runsById=new Map(history.runs.map(r=>[r.id,r]));
  const pick=(note:SpatialNote)=>{setSelectedId(note.id);setFloor(note.position.floor);setTab('notes');setSelectedCollision('');};
  const pickCollision=(event:SavedCollision)=>{setSelectedCollision(event.id);setFloor(event.position.floor);setTab('collisions');setSelectedId('');};
  return <main className="admin-page">
    <header className="admin-header"><div><span className="admin-brand">DAY ZERO</span><span>WORKSPACE ADMIN</span></div><nav><LanguageSwitch/><button className="button secondary" onClick={onExperience}>Enter simulator</button><button className="button secondary" onClick={logout}>Sign out</button></nav></header>
    <section className="admin-title"><div><span>Hello, {user.name}</span><h1>Feedback, mapped to its location.</h1><p>Review user notes and wheelchair collisions on the office floor plan.</p></div><button className="button secondary" onClick={()=>{void refresh();void refreshHistory();}} disabled={loading}>Refresh notes</button></section>
    <div className="admin-stats"><div><strong>{notes.length}</strong><span>Total notes</span></div><div><strong>{notes.filter(n=>n.status==='new').length}</strong><span>Awaiting review</span></div><div><strong>{history.collisions.length}</strong><span>Collision episodes</span></div><div><strong>{history.runs.length}</strong><span>Simulator sessions</span></div></div>
    {error&&<p role="alert" className="notes-error">{error}</p>}{historyError&&<p role="alert" className="notes-error">Collision history could not be refreshed: {historyError}</p>}
    <section className="admin-filters">
      <label>Floor<select value={floor} onChange={e=>setFloor(Number(e.target.value) as 1|2)}><option value="1">Floor 1 & courtyard</option><option value="2">Floor 2</option></select></label>
      <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option>{(['new','reviewing','approved','declined','resolved'] as const).map(s=><option key={s} value={s}>{noteStatus(s,false)}</option>)}</select></label>
      <label className="admin-search">Find a note or author<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Content, request, name, email…"/></label>
    </section>
    <section className="collision-filters">
      <label>Collision session<select value={runId} onChange={e=>{setRunId(e.target.value);setSelectedCollision('');setTab('collisions');}}><option value="all">All sessions</option>{history.runs.map(r=><option key={r.id} value={r.id}>{r.authorName} · {r.authorEmail} · {new Date(r.startedAt).toLocaleString('en-US')} · {r.id.slice(0,8)}</option>)}</select></label>
      <label><input type="checkbox" checked={showCollisions} onChange={e=>setShowCollisions(e.target.checked)}/>Show collisions</label>
      <label><input type="checkbox" checked={showNotes} onChange={e=>setShowNotes(e.target.checked)}/>Show user notes</label>
      <small>Collisions refresh every 2 seconds. Note status and search filters apply to notes only.</small>
    </section>
    <div className="admin-workspace">
      <section className="admin-map"><div className="admin-panel-title"><h2>Feedback map</h2><span>{filtered.length} notes · {visibleCollisions.length} collisions · 1 unit = 1 m</span></div>
        <SpatialMap floor={floor} notes={showNotes?filtered:[]} selected={selected?.id} onSelect={pick} collisions={showCollisions?visibleCollisions:[]} selectedCollision={selectedCollision} onCollision={pickCollision}/>
        <p>Circles are user notes. Pink diamonds mark estimated contact points on obstacles. Select a marker or history entry for details.</p>
        <div className="map-legend"><span className="collision-legend">◆ Wheelchair collision</span>{(['new','reviewing','approved','declined','resolved'] as const).map(s=><span key={s} className={`note-status ${s}`}>● {noteStatus(s,false)}</span>)}</div>
      </section>
      <aside className="admin-reviews">
        <div className="collision-tabs"><button className="button secondary" aria-pressed={tab==='notes'} onClick={()=>setTab('notes')}>User notes</button><button className="button secondary" aria-pressed={tab==='collisions'} onClick={()=>setTab('collisions')}>Collision history</button></div>
        {tab==='notes'?<>
          <h2>Notes on this floor</h2>{loading&&<p role="status">Loading notes…</p>}{!loading&&!filtered.length&&<p>No matching notes. Try another floor or filter.</p>}
          <div className="notes-list">{filtered.map((n,i)=><button key={n.id} onClick={()=>pick(n)} aria-pressed={selected?.id===n.id}><strong>{i+1}. {n.concern}</strong><small>{n.authorName} · {noteStatus(n.status,false)}</small></button>)}</div>
          {selected?<><NoteDetails note={selected}/><ReviewForm key={selected.id} note={selected} onSaved={n=>setNotes(list=>list.map(old=>old.id===n.id?n:old))}/></>:<p className="admin-empty">Select a map marker or note to start a review.</p>}
        </>:<>
          <h2>Collision history</h2><p>{collisions.length} episodes across both floors in {runId==='all'?'all sessions':'this session'}. Holding a key against an obstacle counts once.</p>
          {runId!=='all'&&run&&<div className="collision-run"><strong>{run.authorName}</strong><p>{run.authorEmail}<br/>Session: {run.id}<br/>Started: {new Date(run.startedAt).toLocaleString('en-US')}<br/>{run.endedAt?`Ended: ${new Date(run.endedAt).toLocaleString('en-US')}`:`Last activity: ${new Date(run.lastSeenAt).toLocaleString('en-US')} (no end received)`}</p></div>}
          {collision&&<article className="collision-details" aria-label="Collision details"><span className="collision-legend">◆ Wheelchair collision</span><h3>{collision.objectName}</h3><p>{run?.authorName} · {run?.authorEmail}</p><p>{new Date(collision.occurredAt).toLocaleString('en-US')}<br/>Session: {collision.runId}<br/>Floor {collision.position.floor} · X {collision.position.x.toFixed(2)} · Z {collision.position.z.toFixed(2)} · Y {collision.position.y.toFixed(2)} m</p><p>{collision.kind} · {collision.action} · {collision.movement==='auto'?'Auto-walk':'Manual control'}<br/>Wheelchair: {collision.profile.widthCm} × {collision.profile.lengthCm} cm</p><small>Estimated obstacle-surface contact, based on simulated geometry. A collision alone does not confirm an accessibility barrier.</small></article>}
          {!collisions.length&&<p>No collisions recorded in this selection.</p>}
          <div className="notes-list collision-history-list">{collisions.slice().reverse().map(e=><button key={e.id} data-collision-row={e.id} aria-pressed={collision?.id===e.id} onClick={()=>pickCollision(e)}><strong>◆ {e.objectName}</strong><small>{runsById.get(e.runId)?.authorName} · Floor {e.position.floor} · {e.action} · {e.movement}</small><time dateTime={e.occurredAt}>{new Date(e.occurredAt).toLocaleString('en-US')}</time><small>Session {e.runId.slice(0,8)}</small></button>)}</div>
        </>}
      </aside>
    </div>
    <MissionManager/>
  </main>;
}

function ReviewForm({note,onSaved}:{note:SpatialNote;onSaved:(note:SpatialNote)=>void}){
  const [status,setStatus]=useState<Exclude<NoteStatus,'new'>>(note.status==='new'?'reviewing':note.status),[review,setReview]=useState(note.review),[version,setVersion]=useState(note.version),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMessage('');try{const result=await api<{note:SpatialNote}>(`/notes/${note.id}`,{method:'PATCH',body:JSON.stringify({status,review,version})});onSaved(result.note);setVersion(result.note.version);setMessage('Review saved. The author can now read it.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  return <form className="review-form" onSubmit={submit}><h3>Update review</h3>{note.version!==version&&<p role="alert">This note has changed. <button type="button" onClick={()=>{setVersion(note.version);setReview(note.review);setStatus(note.status==='new'?'reviewing':note.status);}}>Load latest review</button></p>}<label>Review outcome<select value={status} onChange={e=>setStatus(e.target.value as typeof status)}>{(['reviewing','approved','declined','resolved'] as const).map(s=><option key={s} value={s}>{noteStatus(s,false)}</option>)}</select></label><label>Assessment and response<textarea required maxLength={2000} value={review} onChange={e=>setReview(e.target.value)}/></label><button className="button primary" disabled={busy||!review.trim()||note.version!==version}>{busy?'Saving…':'Save review'}</button>{message&&<p role="status">{message}</p>}</form>;
}
