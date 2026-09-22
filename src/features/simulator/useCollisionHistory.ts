import {useCallback,useEffect,useRef,useState} from 'react';
import type {CollisionEvent} from '../../types/collisions';
import type {MobilityProfile} from '../../types/simulator';
import {isNpcCollision} from '../../../shared/collisionPolicy.mjs';
import {purgeNpcCollisionQueue} from '../../lib/collisionQueue';

interface Draft {id:string;startedAt:string;profile:MobilityProfile;events:CollisionEvent[];finish:boolean;tab:string;updatedAt:number}

// One key per run prevents different tabs overwriting each other's pending events.
export function useCollisionHistory(active:boolean,userId:string,profile:MobilityProfile){
  const [status,setStatus]=useState('');
  const current=useRef<{record:(event:CollisionEvent)=>void;finish:()=>Promise<void>}|null>(null);
  const initialProfile=useRef(profile);initialProfile.current=profile;
  useEffect(()=>{
    if(!active)return;
    const prefix=`dayzero.collisions.${userId}.`;
    let tab:string=crypto.randomUUID();
    try{tab=sessionStorage.getItem('dayzero.collision-tab')??tab;sessionStorage.setItem('dayzero.collision-tab',tab);}catch{/* RAM fallback */}
    const draft:Draft={id:crypto.randomUUID(),startedAt:new Date().toISOString(),profile:{...initialProfile.current},events:[],finish:false,tab,updatedAt:Date.now()};
    const drafts=new Map<string,Draft>([[draft.id,draft]]);
    const lastSynced=new Map<string,number>();
    let disposed=false,busy:Promise<void>|null=null,storageAvailable=true;
    const report=(message:string)=>{if(!disposed)setStatus(message);};
    const persist=(d:Draft)=>{d.updatedAt=Date.now();try{localStorage.setItem(prefix+d.id,JSON.stringify(d));}catch{storageAvailable=false;report('Collision history is kept in memory until synced. Keep this page open.');}};
    const discover=()=>{
      try{purgeNpcCollisionQueue(localStorage);}catch{/* Storage may be unavailable. */}
      try{for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i)!;if(!key.startsWith(prefix)||drafts.has(key.slice(prefix.length)))continue;
        try{const d=JSON.parse(localStorage.getItem(key)! ) as Draft;
          if(d.id&&key===prefix+d.id&&Array.isArray(d.events)&&(d.tab===tab||Date.now()-d.updatedAt>120000)){
            d.finish=true;drafts.set(d.id,d);
          }
        }catch{/* Preserve malformed local data; never send it. */}
      }}catch{storageAvailable=false;}
    };
    const flush=():Promise<void>=>{
      if(busy)return busy;
      busy=(async()=>{
        for(const d of drafts.values()){
          d.events=d.events.filter(e=>!isNpcCollision(e));
          if(!d.events.length&&!d.finish&&Date.now()-(lastSynced.get(d.id)??0)<30000)continue;
          do{
            const batch=d.events.slice(0,15),finish=d.finish&&d.events.length<=15;
            try{
              const response=await fetch('/api/collision-runs',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,signal:AbortSignal.timeout(10000),
                body:JSON.stringify({id:d.id,startedAt:d.startedAt,profile:d.profile,events:batch,finish})});
              if(!response.ok){let message='Collision history is waiting to sync.';try{message=(await response.json()).error??message;}catch{}throw new Error(message);}
              const {accepted}=await response.json() as {accepted:string[]};
              lastSynced.set(d.id,Date.now());
              d.events=d.events.filter(e=>!accepted.includes(e.id));
              if(finish){drafts.delete(d.id);try{localStorage.removeItem(prefix+d.id);}catch{}}
              else persist(d);
              report(d.events.length?'Syncing collision history…':'Collision history synced');
              // finish may have changed while a request was in flight.
              if(!finish&&d.finish&&d.events.length===0)continue;
              if(!d.events.length||finish)break;
            }catch(e){persist(d);report(`${(e as Error).message} ${storageAvailable?'Saved on this device; retrying.':'Keep this page open to retry.'}`);return;}
          }while(true);
        }
      })().finally(()=>{busy=null;});
      return busy;
    };
    const finish=async()=>{if(!drafts.has(draft.id))return;draft.finish=true;persist(draft);await flush();};
    current.current={record:event=>{
      if(draft.finish||isNpcCollision(event))return;
      if(draft.events.length>=200){report('Collision queue is full. Reconnect to save more collisions.');return;}
      draft.events.push(event);persist(draft);report('Syncing collision history…');void flush();
    },finish};
    discover();persist(draft);void flush();
    const retry=setInterval(()=>void flush(),2000);
    const recovery=setInterval(discover,30000);
    const pagehide=()=>{void finish();};
    const pageshow=(e:PageTransitionEvent)=>{if(e.persisted)window.location.reload();};
    window.addEventListener('pagehide',pagehide);window.addEventListener('pageshow',pageshow);
    return()=>{current.current=null;disposed=true;clearInterval(retry);clearInterval(recovery);window.removeEventListener('pagehide',pagehide);window.removeEventListener('pageshow',pageshow);void finish();};
  },[active,userId]);
  return {status,record:useCallback((event:CollisionEvent)=>current.current?.record(event),[]),finish:useCallback(()=>current.current?.finish()??Promise.resolve(),[])};
}
