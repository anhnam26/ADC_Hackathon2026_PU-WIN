import {isNpcCollision} from '../../shared/collisionPolicy.mjs';

// Scrub pending events for all accounts on this browser without deleting sessions
// or non-person collisions. Malformed/unrelated storage is left untouched.
export function purgeNpcCollisionQueue(storage:Storage){
  let removed=0;
  for(let i=0;i<storage.length;i++){
    const key=storage.key(i);if(!key?.startsWith('dayzero.collisions.'))continue;
    try{
      const draft=JSON.parse(storage.getItem(key)!);if(!Array.isArray(draft?.events))continue;
      const events=draft.events.filter((event:unknown)=>!isNpcCollision(event));
      if(events.length!==draft.events.length){const count=draft.events.length-events.length;storage.setItem(key,JSON.stringify({...draft,events}));removed+=count;}
    }catch{/* Keep unrelated or unreadable data. Server policy also discards NPC events. */}
  }
  return removed;
}
