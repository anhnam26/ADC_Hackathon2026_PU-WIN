import {WORLD} from '../data/space';
import {objectObstacles} from './objectGeometry';
import {bodyAt,overlaps} from './physics';
import type {MobilityProfile,Obstacle,Pose,WorldObject} from '../types/simulator';

interface YieldState {home:Pose;lane:Obstacle;target?:Pose;retry:number;returning:boolean}
export type NpcYields=Map<string,YieldState>;

function clear(person:WorldObject,pose:Pose,obstacles:Obstacle[]){
  return objectObstacles({...person,position:[pose.x,person.position[1],pose.z],yaw:pose.yaw}).every(part=>{
    const x=Math.abs(Math.cos(part.yaw))*part.width/2+Math.abs(Math.sin(part.yaw))*part.depth/2;
    const z=Math.abs(Math.sin(part.yaw))*part.width/2+Math.abs(Math.cos(part.yaw))*part.depth/2;
    return part.x-x>=WORLD.minX&&part.x+x<=WORLD.maxX&&part.z-z>=WORLD.minZ&&part.z+z<=(person.floor===2?7:WORLD.maxZ)&&!obstacles.some(o=>overlaps(part,o));
  });
}

// Check the actual colleague geometry: an inflated pedestrian box can already overlap
// the chair at the moment of contact and prevent the person from stepping away.
function sweep(person:WorldObject,start:Pose,end:Pose,obstacles:Obstacle[]){
  const steps=Math.max(1,Math.ceil(Math.hypot(end.x-start.x,end.z-start.z)/.025));
  let result=start;
  for(let i=1;i<=steps;i++){
    const next={...start,x:start.x+(end.x-start.x)*i/steps,z:start.z+(end.z-start.z)*i/steps};
    if(!clear(person,next,obstacles))return {pose:result,blocked:true};
    result=next;
  }
  return {pose:result,blocked:false};
}

export function requestNpcYield(states:NpcYields,person:WorldObject,player:Pose,profile:MobilityProfile,next?:Pose){
  if(!person.colleague)return;
  const old=states.get(person.id);if(old&&!old.returning)return;
  const dx=next?next.x-player.x:-Math.sin(player.yaw),dz=next?next.z-player.z:-Math.cos(player.yaw);
  const distance=Math.hypot(dx,dz),yaw=distance>.02?Math.atan2(-dx,-dz):player.yaw,length=Math.min(3,Math.max(1,distance));
  const body=bodyAt(player,profile),angle=player.yaw-yaw;
  const width=Math.abs(Math.cos(angle))*body.width+Math.abs(Math.sin(angle))*body.depth;
  states.set(person.id,{home:old?.home??{x:person.position[0],z:person.position[2],yaw:person.yaw},
    lane:{id:'reserved-route',name:'Wheelchair route',x:player.x-Math.sin(yaw)*length/2,z:player.z-Math.cos(yaw)*length/2,yaw,width:width+.5,depth:length+body.depth+.4},retry:0,returning:false});
}

// Returns IDs handled this frame so normal patrol cannot immediately step back into the route.
export function advanceNpcYields(scene:WorldObject[],states:NpcYields,dt:number,player:Pose,profile:MobilityProfile,staticObstacles:Obstacle[],paused:boolean,automatic:boolean){
  const handled=new Set<string>();
  for(const person of scene.filter(o=>o.colleague)){
    const state=states.get(person.id);if(!state)continue;
    handled.add(person.id);person.walking=false;if(paused)continue;
    const start={x:person.position[0],z:person.position[2],yaw:person.yaw};
    const far=Math.hypot(player.x-start.x,player.z-start.z)>3.2;
    if(far&&(!automatic||!overlaps(bodyAt(player,profile),state.lane))){
      if(person.patrol){states.delete(person.id);continue;}
      state.returning=true;state.target=state.home;
    }
    const obstacles=[...staticObstacles,...scene.filter(o=>o.colleague&&o.id!==person.id).flatMap(o=>objectObstacles(o)),bodyAt(player,profile)];
    state.retry=Math.max(0,state.retry-dt);
    if(!state.target&&state.retry===0){
      state.retry=.6;
      search:for(const distance of [.7,1,1.4,1.9,2.5,3.5])for(const angle of [Math.PI/2,-Math.PI/2,Math.PI/3,-Math.PI/3,2*Math.PI/3,-2*Math.PI/3,0,Math.PI]){
        const yaw=state.lane.yaw+angle,target={...start,x:start.x-Math.sin(yaw)*distance,z:start.z-Math.cos(yaw)*distance};
        if(!clear(person,target,[...obstacles,state.lane])||sweep(person,start,target,obstacles).blocked)continue;
        state.target=target;break search;
      }
    }
    if(!state.target)continue;
    const distance=Math.hypot(state.target.x-start.x,state.target.z-start.z);
    if(distance<.02){if(state.returning)states.delete(person.id);continue;}
    const step=Math.min(1.15*dt,distance),target={...start,x:start.x+(state.target.x-start.x)/distance*step,z:start.z+(state.target.z-start.z)/distance*step};
    const moved=sweep(person,start,target,obstacles);
    person.position=[moved.pose.x,person.position[1],moved.pose.z];person.walking=Math.hypot(moved.pose.x-start.x,moved.pose.z-start.z)>.001;
    if(moved.blocked){state.target=undefined;state.retry=.6;}
  }
  return handled;
}
