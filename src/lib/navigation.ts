import { WORLD, objects } from '../data/space';
import { worldObstacles } from './objectGeometry';
import { blockingAt, canInteract, moveWithCollisions } from './physics';
import type { MobilityProfile, Obstacle, Pose, WorldObject } from '../types/simulator';

const STEP = .25;
export const angleDifference = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export function traverseSegment(a: Pose, b: Pose, profile: MobilityProfile, obstacles: Obstacle[]): Pose | null {
  const radius = Math.hypot(profile.widthCm, profile.lengthCm) / 200 + .02;
  obstacles = obstacles.filter(o => {
    const extent = Math.hypot(o.width,o.depth) / 2;
    return o.x + extent >= Math.min(a.x,b.x)-radius && o.x-extent <= Math.max(a.x,b.x)+radius && o.z+extent >= Math.min(a.z,b.z)-radius && o.z-extent <= Math.max(a.z,b.z)+radius;
  });
  const distance = Math.hypot(b.x - a.x, b.z - a.z);
  const yaw = distance > .001 ? Math.atan2(a.x - b.x, a.z - b.z) : b.yaw;
  const turn = moveWithCollisions(a, 0, 0, angleDifference(yaw, a.yaw), profile, obstacles);
  if (turn.blocked) return null;
  const moved = moveWithCollisions(turn.pose, b.x - a.x, b.z - a.z, 0, profile, obstacles);
  return moved.blocked ? null : moved.pose;
}
export function smoothRoute(route: Pose[], profile: MobilityProfile, obstacles: Obstacle[]) {
  const result = [route[0]]; let index = 0;
  while (index < route.length - 1) {
    let found = false;
    for (let next = route.length - 1; next > index; next--) {
      const reached = traverseSegment(result.at(-1)!, route[next], profile, obstacles);
      if (!reached || !traverseSegment(reached,{...reached,yaw:route[next].yaw},profile,obstacles)) continue;
      result.push(reached); index=next; found=true; break;
    }
    if (!found) return route;
  }
  return result;
}
class Frontier {
  data: {id:string; score:number}[] = [];
  push(item: {id:string;score:number}) {
    const a=this.data; a.push(item); let i=a.length-1;
    while(i>0) { const p=(i-1)>>1; if(a[p].score<=item.score) break; a[i]=a[p]; i=p; } a[i]=item;
  }
  pop() {
    const a=this.data,top=a[0],last=a.pop()!;
    if(a.length) { let i=0; while(i*2+1<a.length) { let child=i*2+1; if(child+1<a.length&&a[child+1].score<a[child].score) child++; if(a[child].score>=last.score) break; a[i]=a[child];i=child; } a[i]=last; } return top;
  }
}
// Search position AND heading; check every rotation and diagonal sweep with the real footprint.
export function planRoute(start: Pose, target: WorldObject, profile: MobilityProfile, sceneObjects = objects): Pose[] | null {
  const allDoors=objects.filter(o=>o.kind==='door').map(o=>o.id);
  const obstacles=worldObstacles(allDoors,sceneObjects.filter(o=>!o.patrol));
  const key=(p:Pose)=>`${Math.round(p.x/STEP)},${Math.round(p.z/STEP)},${(Math.round(p.yaw/(Math.PI/4))+8)%8}`;
  const heuristic=(p:Pose)=>Math.max(0,Math.hypot(p.x-target.position[0],p.z-target.position[2])-Math.max(target.size[0],target.size[2])/2-WORLD.interactionRange);
  const frontier=new Frontier(),nodes=new Map<string,Pose>(),scores=new Map<string,number>(),parent=new Map<string,string>(),visited=new Set<string>();
  const prefixes=new Map<string,Pose[]>();
  for(let heading=0;heading<8;heading++) {
    const grid={x:Math.round(start.x/STEP)*STEP,z:Math.round(start.z/STEP)*STEP,yaw:heading*Math.PI/4};
    const joined=traverseSegment(start,grid,profile,obstacles);
    if(!joined||!traverseSegment(joined,grid,profile,obstacles)) continue;
    const id=key(grid);nodes.set(id,grid);scores.set(id,0);prefixes.set(id,[{...start},joined,grid]);frontier.push({id,score:heuristic(grid)});
  }
  for(let iteration=0;frontier.data.length&&iteration<70000;iteration++) {
    const {id}=frontier.pop();if(visited.has(id))continue;visited.add(id);
    const current=nodes.get(id)!;
    if(heuristic(current)<.5&&canInteract(current,target,obstacles,allDoors)) {
      const route=[current];let previous=id;
      while(parent.has(previous)){previous=parent.get(previous)!;route.unshift(nodes.get(previous)!);}
      return smoothRoute([...prefixes.get(previous)!,...route.slice(1)],profile,obstacles);
    }
    const dx=Math.round(-Math.sin(current.yaw))*STEP,dz=Math.round(-Math.cos(current.yaw))*STEP;
    const candidates=[{...current,x:current.x+dx,z:current.z+dz},{...current,yaw:current.yaw+Math.PI/4},{...current,yaw:current.yaw-Math.PI/4}];
    for(const next of candidates) {
      next.yaw=Math.atan2(Math.sin(next.yaw),Math.cos(next.yaw));const nextKey=key(next);
      if(visited.has(nextKey)||next.x<WORLD.minX||next.x>WORLD.maxX||next.z<WORLD.minZ||next.z>WORLD.maxZ||blockingAt(next,profile,obstacles))continue;
      const distance=Math.hypot(next.x-current.x,next.z-current.z),cost=scores.get(id)!+(distance||.13);
      if(cost>=(scores.get(nextKey)??Infinity)||!traverseSegment(current,next,profile,obstacles))continue;
      scores.set(nextKey,cost);parent.set(nextKey,id);nodes.set(nextKey,next);frontier.push({id:nextKey,score:cost+heuristic(next)});
    }
  }
  return null;
}
export function routeLength(route:Pose[]){return route.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-route[i].x,p.z-route[i].z),0);}
export function routePassesDoor(start:Pose,route:Pose[],door:WorldObject){
  const points=[start,...route];
  return points.slice(1).some((b,i)=>{const a=points[i],dx=b.x-a.x,dz=b.z-a.z;const t=Math.max(0,Math.min(1,((door.position[0]-a.x)*dx+(door.position[2]-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(a.x+t*dx-door.position[0],a.z+t*dz-door.position[2])<door.clearWidth!/2;});
}
