import { expect, it } from 'vitest';
import { objects, objectById, SPAWN, WORLD } from '../../src/data/space';
import { worldObstacles } from '../../src/lib/objectGeometry';
import { blockingAt, canInteract } from '../../src/lib/physics';
import { planRoute, traverseSegment, routeTargetReached } from '../../src/lib/navigation';
import { defaultMobility } from '../../src/types/simulator';
import { parseSession, seedSession } from '../../src/lib/persistence';

it('spawns outside with an unobstructed route to the entrance',()=>{
  expect(SPAWN.floor).toBe(1);expect(SPAWN.z).toBeGreaterThan(9);expect(WORLD.minZ).toBe(-20);
  expect(blockingAt(SPAWN,defaultMobility,worldObstacles([]))).toBeUndefined();
  expect(planRoute(SPAWN,objectById('entry-door')!,defaultMobility)).not.toBeNull();
});
it.each(['hr-desk','training-table','wellness-sofa','lift-1','stairs-1','desk-b21','sky-table','lift-2','stairs-2'])('%s has a swept collision-free path on its floor',(id)=>{
  const doors=objects.filter(o=>o.kind==='door').map(o=>o.id);
    const target=objectById(id)!;const start=target.floor===2?objectById('lift-1')!.connection!.arrival:SPAWN;
    const obstacles=worldObstacles(doors,objects.filter(o=>!o.patrol),start.floor);
    const route=planRoute(start,target,defaultMobility)!;expect(route,id).not.toBeNull();
    for(let i=1;i<route.length;i++)expect(traverseSegment(route[i-1],route[i],defaultMobility,obstacles),id).not.toBeNull();
    expect(canInteract(route.at(-1)!,target,obstacles,doors),id).toBe(true);
});
it('floor geometry is isolated, landings fit the largest chair and saved floor survives reload',()=>{
  const largest={...defaultMobility,widthCm:130,lengthCm:180};
  for(const connector of objects.filter(o=>o.connection)){
    const arrival=connector.connection!.arrival;
    expect(blockingAt(arrival,largest,worldObstacles([],objects,arrival.floor)),connector.id).toBeUndefined();
    expect(canInteract({...arrival,floor:connector.floor},objectById(connector.kind==='elevator'?`lift-${arrival.floor}`:`stairs-${arrival.floor}`)!,[],[])).toBe(false);
  }
  const session=seedSession();session.playerPose={x:-7.45,z:-11.9,yaw:0,floor:2};
  expect(parseSession(JSON.stringify(session)).playerPose.floor).toBe(2);
  expect(worldObstacles([],objects,2).some(o=>o.id==='entry-door')).toBe(false);
});
it('lift navigation finishes in front of the door when approaching from an upstairs room',()=>{
  const lift=objectById('lift-2')!,start={x:-7,z:-.5,yaw:0,floor:2 as const};
  const doors=objects.filter(o=>o.kind==='door').map(o=>o.id),obstacles=worldObstacles(doors,objects,2);
  expect(routeTargetReached({x:-10,z:-9.8,yaw:0,floor:2},lift,obstacles,doors)).toBe(false);
  const route=planRoute(start,lift,defaultMobility)!;expect(route).not.toBeNull();
  expect(routeTargetReached(route.at(-1)!,lift,obstacles,doors)).toBe(true);
  expect(Math.abs(route.at(-1)!.z+11.9)).toBeLessThan(.25);
});
