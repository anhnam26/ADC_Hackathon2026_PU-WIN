import { useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { floorY, LIFT, type LiftState } from '../../lib/elevator';
import DoorSign from './DoorSign';
import { useLocale } from '../../lib/i18n';

function Box({position,size,color='#cbd8d5',glass=false}:{position:[number,number,number];size:[number,number,number];color?:string;glass?:boolean}){
  return <mesh position={position} userData={{cameraObstacle:true}} receiveShadow castShadow={!glass}><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={glass?.18:.65} metalness={glass?.25:.08} transparent={glass} opacity={glass?.24:1}/></mesh>;
}
// Floor slabs surround the shaft opening instead of passing through the moving cabin.
export function FloorSlab({floor}:{floor:1|2}){
  const y=-.1;
  if(floor===1)return <Box position={[0,y,-3]} size={[24,.2,34]} color="#eee9de"/>;
  return <group name="upper-floor-slab">
    <Box position={[-.3,y,-6.5]} size={[16.8,.2,27]} color="#e9e7dc"/>
    <Box position={[11.95,y,-6.5]} size={[.1,.2,27]} color="#e9e7dc"/>
    <Box position={[10,y,-16.45]} size={[3.8,.2,7.1]} color="#e9e7dc"/>
    <Box position={[10,y,-1.65]} size={[3.8,.2,17.3]} color="#e9e7dc"/>
    <Box position={[8.15,-.05,-10.95]} size={[.3,.1,1.1]} color="#e9e7dc"/>
    <Box position={[-11.65,y,-6.5]} size={[.7,.2,27]} color="#e9e7dc"/>
    <Box position={[-10,y,-16.525]} size={[2.6,.2,6.95]} color="#e9e7dc"/>
    <Box position={[-10,y,-1.875]} size={[2.6,.2,17.75]} color="#e9e7dc"/>
  </group>;
}
export function CeilingLights({floor,active,fixtures=true}:{floor:1|2;active:boolean;fixtures?:boolean}){
  const points=floor===1?[[-8,-17],[0,-17],[8,-17],[-6,-6],[6,-6],[0,-8],[-7,3],[0,2],[7,4],[-5,-12],[5,-12]]:[[-8,1],[-4,1],[4,1],[8,1],[-7,5],[7,5],[-6,-7],[0,-7],[6,-7],[-5,-12],[0,-12],[5,-12],[-5,-17],[0,-17],[5,-17]];
  return <group name={`interior-lights-${floor}`}>
    {fixtures&&points.map(([x,z],i)=><group key={i} position={[x,2.93,z]}>
      <Box position={[0,.01,0]} size={[1.25,.09,.55]} color="#617471"/>
      <mesh position={[0,-.045,0]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[1.15,.45]}/><meshStandardMaterial color="#fff4d8" emissive="#fff1c7" emissiveIntensity={3} toneMapped={false}/></mesh>
    </group>)}
    {active && [[-7,-16],[7,-16],[-7,-2],[7,-2]].map(([x,z],i)=><pointLight key={i} position={[x,2.65,z]} color="#fff1d3" intensity={36} distance={19} decay={1.4}/>)}
    {fixtures&&floor===2&&[-6,0,6].map(x=><mesh key={x} position={[x,3.02,-11]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[.12,12]}/><meshStandardMaterial color="#fff4d8" emissive="#fff1d3" emissiveIntensity={2} toneMapped={false}/></mesh>)}
  </group>;
}
export function Roof(){return <group name="building-roof"><Box position={[0,6.43,-6.5]} size={[24.5,.26,27.5]} color="#c4cbbf"/><Box position={[0,6.62,-6.5]} size={[24.8,.12,27.8]} color="#536b68"/></group>;}

export function ElevatorModel({state,overview}:{state:MutableRefObject<LiftState>;overview:boolean}){
  const {language}=useLocale();
  const cabin=useRef<Group>(null),landingDoors=useRef<(Group|null)[]>([]),cabinDoors=useRef<Group>(null);
  useFrame(()=>{
    const lift=state.current;if(cabin.current)cabin.current.position.y=lift.y;
    for(let i=0;i<2;i++){const group=landingDoors.current[i];if(!group)continue;const opening=Math.abs(lift.y-floorY(i+1))<.001?lift.door:0;group.children.forEach((child,j)=>{child.position.z=(j===0?-1:1)*(.35+opening*.72);});}
    cabinDoors.current?.children.forEach((child,j)=>{child.position.z=(j===0?-1:1)*(.35+lift.door*.72);});
  });
  const panels=(x:number)=><>{[-1,1].map(side=><group key={side} position={[x,0,side*.35]}><Box position={[0,1.12,0]} size={[.07,2.24,.69]} color="#8cb4ba" glass/><Box position={[0,1.12,side*.33]} size={[.08,2.24,.035]} color="#5d777f"/><Box position={[0,2.21,0]} size={[.08,.06,.7]} color="#617c82"/></group>)}</>;
  return <group name="continuous-elevator-shaft" position={[LIFT.x,0,LIFT.z]}>
    <Box position={[-1.25,3.2,0]} size={[.12,6.4,2.3]} color="#91aeb4" glass/>
    {[-1,1].map(side=><group key={side}><Box position={[0,3.2,side*1.09]} size={[2.6,6.4,.12]} color="#94b3b7" glass/><Box position={[-1.16,3.2,side*.94]} size={[.06,6.4,.07]} color="#446069"/></group>)}
    {[1,2].map(floor=><group key={floor} position={[0,floorY(floor),0]} name={`lift-landing-${floor}`}>
      <group position={[1.3,0,0]} rotation={[0,Math.PI/2,0]}><DoorSign label={language==='vi'?`THANG MÁY · TẦNG ${floor}`:`LIFT · FLOOR ${floor}`} width={2.1}/></group>
      <group ref={el=>{landingDoors.current[floor-1]=el;}}>{panels(1.3)}</group>
      {[-1,1].map(side=><Box key={side} position={[1.3,1.12,side*.925]} size={[.15,2.24,.45]} color="#77959b"/>)}
      <Box position={[1.3,2.4,0]} size={[.15,.3,2.3]} color="#426069"/>
      <mesh position={[1.39,.95,-.93]}><boxGeometry args={[.035,.22,.12]}/><meshStandardMaterial color="#263d41" emissive="#4e807c" emissiveIntensity={.4}/></mesh>
    </group>)}
    <group ref={cabin} name="moving-lift-cabin">
      <Box position={[0,-.06,0]} size={[2.48,.12,2.06]} color="#5e7779"/>
      <Box position={[-1.16,1.14,0]} size={[.08,2.28,2.06]} color="#cedfdb"/>
      {[-1,1].map(side=><group key={side}><Box position={[0,1.14,side*1.02]} size={[2.36,2.28,.06]} color="#a9c3c1" glass/><Box position={[0,.83,side*.96]} size={[2.08,.055,.055]} color="#5b7d7e"/></group>)}
      {!overview && <Box position={[0,2.32,0]} size={[2.4,.1,2.1]} color="#c7d8d4"/>}
      <mesh position={[0,2.25,0]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[1.3,.6]}/><meshStandardMaterial color="#fff4d8" emissive="#fff4d8" emissiveIntensity={3}/></mesh>
      <pointLight position={[0,2.1,0]} color="#fff3d6" intensity={12} distance={3.2} decay={1.2}/>
      <group ref={cabinDoors}>{panels(1.2)}</group>
      <Box position={[.8,1.05,-.97]} size={[.24,.36,.035]} color="#25464d"/>
      {[0,1].map(i=><mesh key={i} position={[.75+i*.1,1.05,-.94]}><boxGeometry args={[.065,.065,.02]}/><meshStandardMaterial color="#e2eabd" emissive="#d3eb99" emissiveIntensity={1}/></mesh>)}
    </group>
  </group>;
}
