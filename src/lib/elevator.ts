import type { MobilityProfile, Obstacle, Pose } from '../types/simulator';
import { footprint, overlaps } from './physics';

export const FLOOR_HEIGHT=3.2;
export const floorY=(floor:number)=> (floor-1)*FLOOR_HEIGHT;
export const LIFT={x:-10,z:-11.9,width:1.9,depth:2.2,doorX:-8.7,doorWidth:1.4};
export type LiftPhase='idle'|'opening'|'open'|'closing'|'moving';
export interface LiftState {y:number;door:number;phase:LiftPhase;floor:1|2;target:1|2;rider:boolean;elapsed:number;fromY:number;}
export const createLift=(floor:1|2=1):LiftState=>({y:floorY(floor),door:0,phase:'idle',floor,target:floor,rider:false,elapsed:0,fromY:floorY(floor)});
export function insideCabin(pose:Pose,profile:MobilityProfile){
  const body=footprint(profile),xExtent=Math.abs(Math.cos(pose.yaw))*body.width/2+Math.abs(Math.sin(pose.yaw))*body.depth/2,zExtent=Math.abs(Math.sin(pose.yaw))*body.width/2+Math.abs(Math.cos(pose.yaw))*body.depth/2;
  return Math.abs(pose.x-LIFT.x)+xExtent<=LIFT.depth/2-.025 && Math.abs(pose.z-LIFT.z)+zExtent<=LIFT.width/2-.025;
}
export function atThreshold(pose:Pose,profile:MobilityProfile){
  return overlaps({id:'player',name:'player',...pose,...footprint(profile)},{id:'threshold',name:'threshold',x:LIFT.doorX,z:LIFT.z,width:.3,depth:LIFT.doorWidth+.1,yaw:0});
}
export const liftBusy=(lift:LiftState)=>['moving','closing','opening'].includes(lift.phase);
export function requestLift(lift:LiftState,floor:1|2,ride:boolean,pose:Pose,profile:MobilityProfile):string|null{
  if(liftBusy(lift))return 'Thang máy đang hoạt động. Vui lòng chờ.';
  if(ride){
    if(lift.phase!=='open' || lift.floor !== (pose.floor ?? 1))return 'Gọi thang và chờ cửa mở trước.';
    if(!insideCabin(pose,profile))return 'Đưa toàn bộ xe vào cabin, tránh vùng cửa rồi chọn tầng.';
    if(atThreshold(pose,profile))return 'Vùng cửa đang bị chắn.';
  }
  lift.target=floor;lift.rider=ride;lift.elapsed=0;
  lift.phase=lift.floor===floor?'opening':lift.door>0?'closing':'moving';
  lift.fromY=lift.y;
  return null;
}
// Integration uses elapsed time, so a slow frame never teleports the rider to a landing.
export function advanceLift(lift:LiftState,dt:number,pose:Pose,profile:MobilityProfile):boolean{
  let arrived=false;
  if(lift.phase==='closing'){
    if(atThreshold(pose,profile)){lift.phase='opening';lift.target=lift.floor;lift.rider=false;return false;}
    lift.door=Math.max(0,lift.door-dt/1.2);
    if(lift.door===0){lift.phase='moving';lift.elapsed=0;lift.fromY=lift.y;}
  }else if(lift.phase==='moving'){
    lift.elapsed+=dt;const u=Math.min(1,lift.elapsed/5.5),smooth=u*u*(3-2*u);
    lift.y=lift.fromY+(floorY(lift.target)-lift.fromY)*smooth;
    if(lift.rider)pose.y=lift.y;
    if(u===1){lift.floor=lift.target;lift.phase='opening';if(lift.rider){pose.floor=lift.floor;pose.y=lift.y;arrived=true;}}
  }else if(lift.phase==='opening'){
    lift.door=Math.min(1,lift.door+dt/1.2);
    if(lift.door===1){lift.phase='open';lift.rider=false;}
  }
  return arrived;
}
export function liftDoorObstacles(lift:LiftState,floor:1|2):Obstacle[]{
  const open=Math.abs(lift.y-floorY(floor))<.001?lift.door:0;
  // Panels slide within the shaft wall; landing gates stay closed when the cabin is away.
  return [-1,1].map(side=>({id:`lift-${floor}`,name:'Cửa thang máy',x:LIFT.doorX,z:LIFT.z+side*(.35+open*.72),width:.1,depth:.7,yaw:0}));
}
