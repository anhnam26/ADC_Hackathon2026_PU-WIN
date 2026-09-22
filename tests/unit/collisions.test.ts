import {expect,it} from 'vitest';
import {CollisionEpisodes,contactPosition} from '../../src/lib/collisionEpisodes';
import {moveWithCollisions,type CollisionContact} from '../../src/lib/physics';
import {defaultMobility,type Obstacle,type Pose} from '../../src/types/simulator';

const obstacle:Obstacle={id:'entry-door',name:'Cửa vào & tay nắm',x:0,z:0,width:2,depth:.2,yaw:0};
const pose:Pose={x:0,z:.64,yaw:0,floor:1,y:0};
const contact:CollisionContact={obstacle,pose,action:'translation'};
it('counts a held contact once, requires withdrawal, and rearms after a clear interval',()=>{
 const tracker=new CollisionEpisodes();
 expect(tracker.sample([contact],pose,defaultMobility,0,'manual')).toHaveLength(1);
 for(let now=16;now<5000;now+=16)expect(tracker.sample([contact],pose,defaultMobility,now,'manual')).toHaveLength(0);
 tracker.sample([],pose,defaultMobility,5500,'manual'); // releasing W without retreat is not a new episode
 expect(tracker.sample([contact],pose,defaultMobility,6000,'manual')).toHaveLength(0);
 tracker.sample([],{...pose,z:1.2},defaultMobility,6100,'manual');
 tracker.sample([],{...pose,z:1.2},defaultMobility,6501,'manual');
 expect(tracker.sample([contact],pose,defaultMobility,6600,'manual')).toHaveLength(1);
});
it('separates obstacles and floors, and excludes walking',()=>{
 const tracker=new CollisionEpisodes();
 const events=tracker.sample([contact,{...contact,obstacle:{...obstacle,id:'other'}}],pose,defaultMobility,0,'auto');
 expect(events).toHaveLength(2);expect(events[0].movement).toBe('auto');expect(events[0].objectName).toBe('Entrance door & handle');
 const upstairs={...pose,floor:2 as const,y:3.2};
 const [event]=tracker.sample([{...contact,pose:upstairs}],upstairs,defaultMobility,20,'manual');
 expect(event.position.floor).toBe(2);expect(event.position.y).toBe(3.2);
 expect(tracker.sample([contact],pose,{...defaultMobility,mode:'walking'},30,'manual')).toHaveLength(0);
});
it('places the approximate contact on the rotated obstacle surface',()=>{
 expect(contactPosition(pose,obstacle)).toEqual({x:0,z:.1});
 const rotated={...obstacle,yaw:Math.PI/2};
 const p=contactPosition({x:1,z:0,yaw:0},rotated);
 expect(p.x).toBeCloseTo(.1);expect(p.z).toBeCloseTo(0);
});
it('captures actual translation and rotation blocks but no contact with zero intended movement',()=>{
 const result=moveWithCollisions({...pose,z:1},0,-1,0,defaultMobility,[obstacle]);
 expect(result.contacts).toHaveLength(1);expect(result.contacts[0].action).toBe('translation');
 expect(moveWithCollisions(pose,0,0,0,defaultMobility,[obstacle]).contacts).toHaveLength(0);
 const side={...obstacle,x:.6,z:0,width:.1,depth:2};
 const turn=moveWithCollisions({x:0,z:0,yaw:0},0,0,Math.PI/2,defaultMobility,[side]);
 expect(turn.contacts.some(c=>c.action==='rotation')).toBe(true);
});
