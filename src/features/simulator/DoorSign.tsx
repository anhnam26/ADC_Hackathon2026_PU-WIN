import {useEffect,useMemo} from 'react';
import {CanvasTexture} from 'three';

export default function DoorSign({label,width}:{label:string;width:number}){
  const texture=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=128;
    const ctx=canvas.getContext('2d')!;
    ctx.fillStyle='#24443b';ctx.fillRect(0,0,768,128);
    ctx.strokeStyle='#d9dfb5';ctx.lineWidth=6;ctx.strokeRect(7,7,754,114);
    ctx.fillStyle='#fff5d7';ctx.font='bold 40px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,384,66,720);
    return new CanvasTexture(canvas);
  },[label]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <group>{[1,-1].map(side=><mesh key={side} position={[0,2.4,side*.13]} rotation={[0,side===1?0:Math.PI,0]}><planeGeometry args={[Math.max(1.45,width),.26]}/><meshBasicMaterial map={texture}/></mesh>)}</group>;
}
