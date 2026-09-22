import {expect,it} from 'vitest';
import {wheelchairDrive,WHEELCHAIR_SPEED} from '../../src/lib/wheelchairDrive';
import {objectById} from '../../src/data/space';
import {objectParts,worldObstacles} from '../../src/lib/objectGeometry';
import {blockingAt,moveWithCollisions} from '../../src/lib/physics';
import {defaultMobility} from '../../src/types/simulator';

it('drives along the chair axis and turns in place without lateral movement',()=>{
 expect(wheelchairDrive(0,1,0,false,1)).toEqual({dx:-0,dz:-WHEELCHAIR_SPEED,turn:0});
 const left=wheelchairDrive(Math.PI/2,1,0,false,1);expect(left.dx).toBeCloseTo(-2.8);expect(left.dz).toBeCloseTo(0);
 expect(wheelchairDrive(0,1,1,false,1)).toEqual({dx:-0,dz:-0,turn:1.8});
 expect(wheelchairDrive(0,-1,0,false,1).dz).toBe(1.8);
 expect(wheelchairDrive(0,1,0,true,1).dz).toBe(-.45);
});
it.each(['hr-door','wellness-door'])('%s has an unobstructed straight approach away from the connectors',id=>{
 const door=objectById(id)!;
 expect(Math.abs(door.position[0])).toBe(5.6);expect(door.position[2]).toBe(-13);
 const pose={x:door.position[0],z:-11,yaw:0,floor:1 as const};
 const obs=worldObstacles([id]);
 expect(blockingAt(pose,defaultMobility,obs)).toBeUndefined();
 expect(moveWithCollisions(pose,0,-3,0,defaultMobility,obs).blocked).toBeUndefined();
});
it('stairs return the upper flight to the corridor with a half-landing and clear exit',()=>{
 const stairs=objectById('stairs-1')!,parts=objectParts(stairs);
 expect(parts.some(p=>p.size[0]===2.4&&p.size[2]===1.4&&p.position[1]===.8)).toBe(true);
 const top=parts.filter(p=>p.size[0]===1.1&&p.position[0]>.5).at(-1)!;
 expect(top.position[2]).toBeGreaterThan(1.5);
 const arrival=stairs.connection!.arrival;
 expect(blockingAt(arrival,defaultMobility,worldObstacles([],undefined,2))).toBeUndefined();
 expect(moveWithCollisions(arrival,-1.2,0,0,defaultMobility,worldObstacles([],undefined,2)).blocked).toBeUndefined();
});
