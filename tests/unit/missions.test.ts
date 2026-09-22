import {describe,it,expect} from 'vitest';
import catalog from '../../src/data/mission-points.json';
import {objects,objectById} from '../../src/data/space';
import {defaultMobility,type Pose} from '../../src/types/simulator';
import {worldObstacles,objectObstacles} from '../../src/lib/objectGeometry';
import {blockingAt} from '../../src/lib/physics';
import {planRoute} from '../../src/lib/navigation';
import {advanceTransfer,type Transfer} from '../../src/lib/crossFloor';
import {advanceLift,createLift,liftDoorObstacles,floorY,insideCabin} from '../../src/lib/elevator';

describe('mission travel',()=>{
  it('offers real destinations and unblocked spawns',()=>{
    for(const id of catalog.destinations)expect(objectById(id)).toBeDefined();
    for(const start of catalog.starts)expect(blockingAt(start as Pose,defaultMobility,worldObstacles([],objects,start.floor as 1|2))).toBeUndefined();
  });
  it.each([1,2] as const)('boards, physically rides and exits from floor %s without a teleport or collision',from=>{
    let pose:Pose={x:-7.45,z:-11.9,yaw:Math.PI/2,floor:from,y:floorY(from)};
    const to=from===1?2:1,target=objectById(to===2?'f2-water':'hr-desk')!,lift=createLift(from);
    const transfer:Transfer={id:target.id,automatic:true,phase:'approach'};
    let done=false,intermediate=false,previousY=pose.y!;
    for(let frame=0;frame<3000&&!done;frame++){
      advanceLift(lift,.025,pose,defaultMobility);
      if(lift.rider&&lift.y>0&&lift.y<3.2)intermediate=true;
      expect(Math.abs(pose.y!-previousY)).toBeLessThan(.05);previousY=pose.y!;
      const floor=pose.floor!,connector=objectById(`lift-${floor}`)!;
      const obstacles=[...worldObstacles([],objects.filter(o=>!o.colleague&&o.kind!=='elevator'),floor),...objectObstacles(connector,true),...liftDoorObstacles(lift,floor)];
      const next=advanceTransfer(transfer,pose,defaultMobility,lift,target,connector,obstacles,[],.025);
      expect(next.contacts,`phase ${transfer.phase}, x ${pose.x}`).toHaveLength(0);pose=next.pose;done=next.done;
    }
    expect(done).toBe(true);expect(intermediate).toBe(true);expect(pose.floor).toBe(to);expect(insideCabin(pose,defaultMobility)).toBe(false);
    expect(planRoute(pose,target,defaultMobility)).not.toBeNull();
  });
  it('manual guidance never moves the player or calls the lift automatically',()=>{
    const pose:Pose={x:-7.45,z:-11.9,yaw:Math.PI/2,floor:1},lift=createLift(),transfer:Transfer={id:'f2-water',automatic:false,phase:'approach'};
    const result=advanceTransfer(transfer,pose,defaultMobility,lift,objectById('f2-water')!,objectById('lift-1')!,worldObstacles([],objects,1),[],.1);
    expect(result.pose).toEqual(pose);expect(result.status).toContain('Press F');expect(lift.phase).toBe('idle');
  });
});
