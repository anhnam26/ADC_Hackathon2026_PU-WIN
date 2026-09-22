import {insideCabin,LIFT,liftBusy,requestLift,type LiftState} from './elevator';
import {angleDifference,routeTargetReached} from './navigation';
import {moveWithCollisions,type CollisionContact} from './physics';
import type {MobilityProfile,Obstacle,Pose,WorldObject} from '../types/simulator';
import {translate} from './i18n';

export interface Transfer {id:string;automatic:boolean;phase:'approach'|'board'|'ride'|'exit'}
// Both guidance and automatic review use the same physical cabin and landing gates.
export function advanceTransfer(transfer:Transfer,pose:Pose,profile:MobilityProfile,lift:LiftState,target:WorldObject,connector:WorldObject,obstacles:Obstacle[],openDoors:string[],dt:number){
  const floor=pose.floor??1,targetFloor=target.floor??1;
  const result={handled:false,done:false,pose,route:[] as Pose[],status:'',contacts:[] as CollisionContact[],moving:false};
  if(transfer.phase==='approach'){
    if(insideCabin(pose,profile))transfer.phase='board';
    else if(routeTargetReached(pose,connector,obstacles,openDoors)&&(!transfer.automatic||Math.abs(angleDifference(Math.PI/2,pose.yaw))<.01))transfer.phase='board';
    else return result;
  }
  result.handled=true;
  const drive=(x:number,z:number,reverse=false)=>{
    const dx=x-pose.x,dz=z-pose.z,distance=Math.hypot(dx,dz);
    const heading=distance>.01?Math.atan2(-dx,-dz)+(reverse?Math.PI:0):pose.yaw;
    const difference=angleDifference(heading,pose.yaw),turn=Math.max(-dt*1.8,Math.min(dt*1.8,difference));
    const step=Math.abs(difference)<.025?Math.min(distance,dt*1.3):0;
    const moved=moveWithCollisions(pose,distance?dx/distance*step:0,distance?dz/distance*step:0,turn,profile,obstacles);
    result.pose=moved.pose;result.contacts=moved.contacts;result.moving=step>0&&!moved.blocked;
    if(moved.blocked)result.status=`Waiting for clearance: ${translate(moved.blocked.name,'en')}. Pause review to adjust your position.`;
  };
  if(floor===targetFloor&&lift.phase==='open')transfer.phase='exit';
  if(transfer.phase==='board'){
    result.status=`Lift transfer · Press F to call the lift. Wait for the doors, then drive fully inside. Destination: Floor ${targetFloor}.`;
    if(lift.phase==='open'&&lift.floor===floor){
      result.route=[{...pose,x:LIFT.x,z:LIFT.z}];
      result.status=`Lift transfer · Drive into the cabin, then press F and choose Floor ${targetFloor}.`;
      if(insideCabin(pose,profile)){
        if(transfer.automatic){const error=requestLift(lift,targetFloor,true,pose,profile);if(!error)transfer.phase='ride';else result.status=error;}
      }else if(transfer.automatic)drive(LIFT.x,LIFT.z);
    }else if(lift.rider)transfer.phase='ride';
    else if(transfer.automatic&&!liftBusy(lift))requestLift(lift,floor,false,pose,profile);
  }
  if(transfer.phase==='ride'){
    result.route=[];result.status=`Lift transfer · Travelling to Floor ${targetFloor}. Wait for the doors to open.`;
    if(!liftBusy(lift)&&lift.floor!==targetFloor&&!lift.rider)transfer.phase='board';
  }
  if(transfer.phase==='exit'){
    result.status='Lift transfer · Doors open. Reverse into the lobby, then follow the route to your destination.';
    result.route=[{...pose,x:-7.45,z:LIFT.z}];
    if(pose.x>-7.65){result.done=true;return result;}
    if(transfer.automatic)drive(-7.45,LIFT.z,true);
  }
  return result;
}
