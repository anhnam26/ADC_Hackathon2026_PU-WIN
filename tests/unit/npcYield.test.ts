import {describe,it,expect} from 'vitest';
import {colleagues} from '../../src/data/colleagues';
import {advanceNpcYields,requestNpcYield,type NpcYields} from '../../src/lib/npcYield';
import {advanceColleagues} from '../../src/lib/npcMotion';
import {objectObstacles} from '../../src/lib/objectGeometry';
import {bodyAt,moveWithCollisions,overlaps} from '../../src/lib/physics';
import {defaultMobility,type Obstacle,type Pose,type WorldObject} from '../../src/types/simulator';

const npc=(patrol=false):WorldObject=>({...colleagues[0],position:[0,0,-1],yaw:0,patrol:patrol?[[0,-1],[0,3]]:undefined});
describe('NPC yields to automatic wheelchair movement',()=>{
  it.each([false,true])('yields again at each new position, including a different approach direction (patrol %s)',patrol=>{
    const person=npc(patrol),states:NpcYields=new Map();
    for(const yaw of [0,0,Math.PI/2,-Math.PI/2]){
      const before=[...person.position],dx=-Math.sin(yaw),dz=-Math.cos(yaw);
      let player:Pose={x:before[0]-dx*1.5,z:before[2]-dz*1.5,yaw,floor:1},hits=0;
      const next={...player,x:before[0]+dx*1.1,z:before[2]+dz*1.1};
      for(let frame=0;frame<400&&Math.hypot(next.x-player.x,next.z-player.z)>.01;frame++){
        advanceNpcYields([person],states,.025,player,defaultMobility,[],false,true);
        const step=Math.min(.07,Math.hypot(next.x-player.x,next.z-player.z));
        const moved=moveWithCollisions(player,dx*step,dz*step,0,defaultMobility,objectObstacles(person));player=moved.pose;
        if(moved.blocked){hits++;requestNpcYield(states,person,player,defaultMobility,next);}
        expect(objectObstacles(person).some(p=>overlaps(bodyAt(player,defaultMobility),p))).toBe(false);
      }
      expect(hits).toBeGreaterThan(0);
      expect(Math.hypot(next.x-player.x,next.z-player.z)).toBeLessThan(.01);
      expect(Math.hypot(person.position[0]-before[0],person.position[2]-before[2])).toBeGreaterThan(.6);
      expect(states.get(person.id)?.home).toEqual({x:0,z:-1,yaw:0});
    }
  });
  it.each([false,true])('clears an actual collision and lets auto-walk finish (patrol %s)',patrol=>{
    const person=npc(patrol),scene=[person],states:NpcYields=new Map(),waypoints=new Map<string,number>();
    let player:Pose={x:0,z:1,yaw:0,floor:1},hits=0,sidestepped=false;
    const next={...player,z:-5};
    for(let frame=0;frame<500&&player.z>-4.99;frame++){
      const handled=advanceNpcYields(scene,states,.025,player,defaultMobility,[],false,true);
      advanceColleagues(scene,waypoints,.025,player,defaultMobility,[],false,handled);
      sidestepped ||=Math.abs(person.position[0])>.6;
      const result=moveWithCollisions(player,0,-Math.min(.07,player.z+5),0,defaultMobility,objectObstacles(person));player=result.pose;
      if(result.blocked){hits++;requestNpcYield(states,person,player,defaultMobility,next);}
      for(const part of objectObstacles(person))expect(overlaps(bodyAt(player,defaultMobility),part)).toBe(false);
    }
    expect(hits).toBeGreaterThan(0);expect(sidestepped).toBe(true);expect(player.z).toBeLessThan(-4.99);
  });
  it('chooses the free side instead of entering a wall and waits until the chair has passed',()=>{
    const person=npc(),states:NpcYields=new Map(),player={x:0,z:.1,yaw:0};
    const wall:Obstacle={id:'wall',name:'wall',x:-.65,z:-1,yaw:0,width:.14,depth:12};
    requestNpcYield(states,person,player,defaultMobility,{...player,z:-4});
    for(let i=0;i<160;i++){
      advanceNpcYields([person],states,.025,player,defaultMobility,[wall],false,true);
      expect(objectObstacles(person).some(p=>overlaps(p,wall))).toBe(false);
    }
    expect(person.position[0]).toBeGreaterThan(.7);const waiting=[...person.position];
    for(let i=0;i<160;i++)advanceNpcYields([person],states,.025,player,defaultMobility,[wall],false,true);
    expect(person.position).toEqual(waiting);
    for(let i=0;i<200;i++)advanceNpcYields([person],states,.025,{...player,z:-6},defaultMobility,[wall],false,true);
    expect(person.position[0]).toBeCloseTo(0,1);expect(person.position[2]).toBeCloseTo(-1,1);expect(states.size).toBe(0);
  });
  it('honours pause and never teleports out of a space with no safe escape',()=>{
    const person=npc(),states:NpcYields=new Map(),player={x:0,z:1,yaw:0};
    const walls:Obstacle[]=[{id:'left',name:'wall',x:-.5,z:-1,yaw:0,width:.1,depth:2},{id:'right',name:'wall',x:.5,z:-1,yaw:0,width:.1,depth:2},{id:'back',name:'wall',x:0,z:-1.6,yaw:0,width:1,depth:.1},{id:'front',name:'wall',x:0,z:-.4,yaw:0,width:1,depth:.1}];
    requestNpcYield(states,person,player,defaultMobility,{...player,z:-4});
    advanceNpcYields([person],states,1,player,defaultMobility,[],true,true);expect(person.position).toEqual([0,0,-1]);
    for(let i=0;i<100;i++)advanceNpcYields([person],states,.025,player,defaultMobility,walls,false,true);
    expect(person.position).toEqual([0,0,-1]);
  });
});
