import {bodyAt,overlaps,type CollisionContact} from './physics';
import {WORLD,objectById,walls} from '../data/space';
import {translate} from './i18n';
import type {MobilityProfile,Obstacle,Pose} from '../types/simulator';
import type {CollisionEvent} from '../types/collisions';

// Approximate contact on the obstacle surface, not the obstacle's centre.
export function contactPosition(pose:Pose,obstacle:Obstacle){
  if(obstacle.id==='boundary'){
    const choices=[{x:WORLD.minX,z:pose.z},{x:WORLD.maxX,z:pose.z},{x:pose.x,z:WORLD.minZ},{x:pose.x,z:WORLD.maxZ}];
    return choices.sort((a,b)=>Math.hypot(a.x-pose.x,a.z-pose.z)-Math.hypot(b.x-pose.x,b.z-pose.z))[0];
  }
  const c=Math.cos(obstacle.yaw),s=Math.sin(obstacle.yaw),dx=pose.x-obstacle.x,dz=pose.z-obstacle.z;
  const lx=c*dx-s*dz,lz=s*dx+c*dz,w=obstacle.width/2,d=obstacle.depth/2;
  let x=Math.max(-w,Math.min(w,lx)),z=Math.max(-d,Math.min(d,lz));
  if(Math.abs(lx)<w&&Math.abs(lz)<d){if(w-Math.abs(lx)<d-Math.abs(lz))x=lx<0?-w:w;else z=lz<0?-d:d;}
  return {x:obstacle.x+c*x+s*z,z:obstacle.z-s*x+c*z};
}

export class CollisionEpisodes {
  private active=new Map<string,{obstacle:Obstacle;pose:Pose;clearSince:number|null}>();
  reset(){this.active.clear();}
  sample(contacts:CollisionContact[],pose:Pose,profile:MobilityProfile,now:number,movement:'manual'|'auto'):CollisionEvent[]{
    if(profile.mode!=='wheelchair'){this.reset();return [];}
    const floor=pose.floor??1;
    const keys=new Set(contacts.map(c=>`${floor}:${c.obstacle.id}`));
    for(const [key,state] of this.active){
      if((state.pose.floor??1)!==floor){this.active.delete(key);continue;}
      const retreat=Math.hypot(pose.x-state.pose.x,pose.z-state.pose.z)>=.15;
      const turned=Math.abs(Math.atan2(Math.sin(pose.yaw-state.pose.yaw),Math.cos(pose.yaw-state.pose.yaw)))>=.2;
      const clear=state.obstacle.id==='boundary'?retreat:!overlaps(bodyAt(pose,profile),state.obstacle,.015);
      if(!keys.has(key)&&clear&&(retreat||turned)){
        state.clearSince??=now;
        if(now-state.clearSince>=400)this.active.delete(key);
      }else state.clearSince=null;
    }
    const events:CollisionEvent[]=[];
    for(const contact of contacts){
      const {obstacle}=contact,key=`${floor}:${obstacle.id}`;
      if(this.active.has(key))continue;
      this.active.set(key,{obstacle:{...obstacle},pose:{...pose},clearSince:null});
      const object=objectById(obstacle.id),wall=walls.some(w=>w.id===obstacle.id);
      const position=contactPosition(contact.pose,obstacle);
      events.push({id:crypto.randomUUID(),occurredAt:new Date().toISOString(),objectId:obstacle.id,
        objectName:wall?`Wall / room frame (${obstacle.id})`:translate(obstacle.name,'en'),
        kind:obstacle.id==='boundary'?'boundary':wall?'wall':object?.colleague?'colleague':'object',
        action:contact.action,movement,position:{...position,floor,y:pose.y??(floor===2?3.2:0)},
        playerPose:{...pose,floor,y:pose.y??(floor===2?3.2:0)},profile:{...profile}});
    }
    return events;
  }
}
