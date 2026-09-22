import {useEffect,useRef,useState} from 'react';
import {api} from '../../lib/api';
import catalog from '../../data/mission-points.json';
import type {Mission,MissionAttempt,MissionFeed} from '../../types/missions';
import type {Pose} from '../../types/simulator';
import type {useSimulation} from '../simulator/useSimulation';

export function useMissions(sim:ReturnType<typeof useSimulation>){
  const [feed,setFeed]=useState<MissionFeed>({missions:[],attempts:[]});
  const [attempt,setAttempt]=useState<MissionAttempt|null>(null);
  const [error,setError]=useState(''),[inbox,setInbox]=useState(false),[busy,setBusy]=useState(false),[reviewPaused,setReviewPaused]=useState(false);
  const current=useRef(attempt);current.current=attempt;
  const simRef=useRef(sim);simRef.current=sim;
  const pending=useRef(false),initialized=useRef(false),guided=useRef('');
  const mission=feed.missions.find(m=>m.id===attempt?.missionId);
  const active=!!attempt&&['manual','review'].includes(attempt.phase);
  const manual=attempt?.phase==='manual'&&!!mission&&attempt.next<mission.stops.length;
  const complete=!!mission&&attempt?.phase==='manual'&&attempt.next===mission.stops.length;
  async function refresh(){try{
    const result=await api<MissionFeed>('/missions');setFeed(result);
    if(!initialized.current){initialized.current=true;const saved=result.attempts.find(a=>['manual','review'].includes(a.phase));if(saved){setAttempt(saved);setReviewPaused(saved.phase==='review');}}
  }catch(e){setError((e as Error).message);}}
  useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),5000);return()=>clearInterval(timer);},[]);
  const saveAttempt=(a:MissionAttempt)=>{current.current=a;setAttempt(a);setFeed(old=>({...old,attempts:[...old.attempts.filter(v=>v.id!==a.id),a]}));};
  async function update(action:string,stopId?:string){
    const a=current.current;if(!a)return null;
    const {attempt:next}=await api<{attempt:MissionAttempt}>(`/mission-attempts/${a.id}`,{method:'PATCH',body:JSON.stringify({action,stopId,version:a.version})});saveAttempt(next);return next;
  }
  function spawn(m:Mission){const start=catalog.starts.find(s=>s.id===m.startId)!;if(!simRef.current.spawnAt({...start,floor:start.floor as 1|2} as Pose))throw new Error('The starting point is blocked for this wheelchair. Adjust the chair or ask your manager to choose another start.');}
  async function start(m:Mission){
    if(pending.current)return;pending.current=true;setBusy(true);setError('');
    try{spawn(m);const result=await api<{attempt:MissionAttempt}>(`/missions/${m.id}/attempts`,{method:'POST',body:'{}'});saveAttempt(result.attempt);guided.current='';setInbox(false);setReviewPaused(false);}
    catch(e){setError((e as Error).message);}finally{pending.current=false;setBusy(false);}
  }
  async function beginReview(){
    if(!mission||pending.current)return;pending.current=true;setBusy(true);setError('');
    try{spawn(mission);await update('review');guided.current='';setReviewPaused(false);}
    catch(e){setError((e as Error).message);}finally{pending.current=false;setBusy(false);}
  }
  useEffect(()=>{
    if(!complete||error)return;
    const timer=setTimeout(()=>void beginReview(),3500);return()=>clearTimeout(timer);
  },[complete,error]);
  // Issue each leg once, after the spawn has committed its floor. Manual practice never auto-drives.
  useEffect(()=>{
    if(!mission||!attempt||!active||complete)return;
    const key=`${attempt.id}:${attempt.phase}:${attempt.next}`;
    if(guided.current===key)return;guided.current=key;
    const ok=simRef.current.navigate(mission.stops[attempt.next],attempt.phase==='review'&&!reviewPaused);
    if(!ok){setError('No clear route for this chair. Move into an open space and select Show mission route.');setReviewPaused(true);}
  },[attempt?.id,attempt?.phase,attempt?.next,mission?.id,complete]);
  useEffect(()=>{
    if(!mission||!attempt||!active||complete||pending.current||error||reviewPaused||inbox||document.querySelector('dialog[open]')||document.hidden)return;
    if(attempt.phase==='manual'&&sim.view.auto)return;
    const stopId=mission.stops[attempt.next];if(!stopId||!sim.reached(stopId))return;
    pending.current=true;setBusy(true);sim.stopNavigation();
    void update('checkpoint',stopId).catch(e=>setError(e.message)).finally(()=>{pending.current=false;setBusy(false);});
  },[sim.view.pose,attempt,mission,active,complete,error,reviewPaused,inbox]);
  async function abandon(){if(pending.current)return;pending.current=true;setBusy(true);try{sim.stopNavigation();await update('cancel');setError('');}catch(e){setError((e as Error).message);}finally{pending.current=false;setBusy(false);}}
  function guide(){if(!mission||!attempt)return;setError('');if(!sim.navigate(mission.stops[attempt.next],attempt.phase==='review'))setError('No clear route. Move to a wider space, then try again.');else setReviewPaused(false);}
  function pause(){sim.stopNavigation();setReviewPaused(true);}
  return {feed,mission,attempt,active,manual,complete,error,busy,inbox,setInbox,start,abandon,guide,pause,reviewPaused,beginReview,
    dismiss:()=>{setAttempt(null);setError('');},
    retry:async()=>{setError('');try{const result=await api<MissionFeed>('/missions');setFeed(result);const a=result.attempts.find(a=>a.id===attempt?.id);if(a)saveAttempt(a);guided.current='';}catch(e){setError((e as Error).message);}},
  };
}
