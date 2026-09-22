import {expect,it} from 'vitest';
import {advanceLift,createLift,requestLift,insideCabin,liftDoorObstacles,atThreshold} from '../../src/lib/elevator';
import {defaultMobility,type Pose} from '../../src/types/simulator';
import {moveWithCollisions} from '../../src/lib/physics';

it('opens for manual boarding, closes before motion and carries the rider continuously up and down',()=>{
 const lift=createLift(),p:Pose={x:-10,z:-11.9,yaw:Math.PI/2,floor:1,y:0};
 expect(requestLift(lift,1,false,p,defaultMobility)).toBeNull();
 for(let i=0;i<40;i++)advanceLift(lift,.04,p,defaultMobility);
 expect(lift.phase).toBe('open');expect(insideCabin(p,defaultMobility)).toBe(true);
 expect(requestLift(lift,2,true,p,defaultMobility)).toBeNull();
 let priorY=0,sawBetween=false;
 for(let i=0;i<220;i++){
   advanceLift(lift,.04,p,defaultMobility);expect(p.x).toBe(-10);expect(p.z).toBe(-11.9);
   expect(p.y!-priorY).toBeGreaterThanOrEqual(-.0001);expect(p.y!-priorY).toBeLessThan(.05);
   if(p.y!>0&&p.y!<3.2){sawBetween=true;expect(lift.door).toBe(0);}
   priorY=p.y!;
 }
 expect(sawBetween).toBe(true);expect(p.floor).toBe(2);expect(p.y).toBe(3.2);expect(lift.phase).toBe('open');
 expect(requestLift(lift,1,true,p,defaultMobility)).toBeNull();for(let i=0;i<220;i++)advanceLift(lift,.04,p,defaultMobility);
 expect(p.floor).toBe(1);expect(p.y).toBe(0);
});
it('rejects partial boarding and keeps the unattended landing closed',()=>{
 const lift=createLift();lift.phase='open';lift.door=1;
 const p:Pose={x:-8.7,z:-11.9,yaw:Math.PI/2,floor:1,y:0};
 expect(atThreshold(p,defaultMobility)).toBe(true);expect(requestLift(lift,2,true,p,defaultMobility)).not.toBeNull();
 expect(moveWithCollisions({x:-7.45,z:-11.9,yaw:Math.PI/2,floor:2},-3,0,0,defaultMobility,liftDoorObstacles(lift,2)).blocked).toBeDefined();
 expect(moveWithCollisions({x:-7.45,z:-11.9,yaw:Math.PI/2,floor:1},-2.5,0,0,defaultMobility,liftDoorObstacles(lift,1)).blocked).toBeUndefined();
});
it('calls an empty cabin from the other floor without moving the user',()=>{
 const lift=createLift(),p:Pose={x:-7.45,z:-11.9,yaw:0,floor:2,y:3.2};
 expect(requestLift(lift,2,false,p,defaultMobility)).toBeNull();
 for(let i=0;i<200;i++)advanceLift(lift,.04,p,defaultMobility);
 expect(p).toEqual({x:-7.45,z:-11.9,yaw:0,floor:2,y:3.2});expect(lift.floor).toBe(2);expect(lift.phase).toBe('open');
});
