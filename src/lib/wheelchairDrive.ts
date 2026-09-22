export const WHEELCHAIR_SPEED=2.8;
export const WHEELCHAIR_REVERSE_SPEED=1.8;
export const SLOW_SPEED=.45;
export function wheelchairDrive(yaw:number,forward:number,turn:number,slow:boolean,dt:number){
  const rotation=Math.max(-1,Math.min(1,turn))*dt*(slow?.7:1.8);
  const distance=rotation?0:Math.max(-1,Math.min(1,forward))*dt*(slow?SLOW_SPEED:forward<0?WHEELCHAIR_REVERSE_SPEED:WHEELCHAIR_SPEED);
  return {dx:-Math.sin(yaw)*distance,dz:-Math.cos(yaw)*distance,turn:rotation};
}
