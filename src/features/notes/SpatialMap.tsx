import {useRef,type KeyboardEvent} from 'react';
import {wallsOnFloor,objectsOnFloor} from '../../data/space';
import {roomZones} from '../../data/building';
import {objectObstacles} from '../../lib/objectGeometry';
import {useLocale} from '../../lib/i18n';
import type {SpatialNote,NoteStatus} from '../../lib/api';
import type {SavedCollision} from '../../types/collisions';

export const noteColors:Record<NoteStatus,string>={new:'#b74328',reviewing:'#926800',approved:'#236ab0',declined:'#77557e',resolved:'#267750'};
export function noteStatus(status:NoteStatus,vi:boolean){return ({new:['Mới gửi','New'],reviewing:['Đang xem xét','Reviewing'],approved:['Chấp thuận','Approved'],declined:['Chưa chấp thuận','Declined'],resolved:['Đã xử lý','Resolved']} as const)[status][vi?0:1];}
export function NotePins({notes,selected,onSelect}:{notes:SpatialNote[];selected?:string;onSelect:(note:SpatialNote)=>void}){
 return <g>{notes.map((note,i)=><g key={note.id} role="button" tabIndex={0} aria-label={`Note ${i+1}: ${note.concern}`} data-note-id={note.id} onClick={e=>{e.stopPropagation();onSelect(note);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(note);}}} transform={`translate(${note.position.x} ${note.position.z})`} className="map-note-pin"><circle r={selected===note.id?'.48':'.36'} fill={noteColors[note.status]} stroke="white" strokeWidth=".09"/><text textAnchor="middle" dominantBaseline="central" fontSize=".28" fill="white" fontWeight="bold">{i+1}</text><title>{note.concern}</title></g>)}</g>;
}
export default function SpatialMap({floor,notes=[],selected,onSelect=()=>{},point,onPoint,collisions=[],selectedCollision,onCollision=()=>{}}:{floor:1|2;notes?:SpatialNote[];selected?:string;onSelect?:(note:SpatialNote)=>void;point?:{x:number;z:number};onPoint?:(point:{x:number;z:number})=>void;collisions?:SavedCollision[];selectedCollision?:string;onCollision?:(event:SavedCollision)=>void}){
 const {t,language}=useLocale(),vi=language==='vi',ref=useRef<SVGSVGElement>(null);
 const pick=(x:number,z:number)=>onPoint?.({x:Math.round(Math.max(-12,Math.min(12,x))*100)/100,z:Math.round(Math.max(-20,Math.min(floor===1?14:7,z))*100)/100});
 const key=(e:KeyboardEvent<SVGSVGElement>)=>{if(!point||e.target!==e.currentTarget)return;const d={ArrowUp:[0,-.25],ArrowDown:[0,.25],ArrowLeft:[-.25,0],ArrowRight:[.25,0]}[e.key];if(d){e.preventDefault();pick(point.x+d[0],point.z+d[1]);}};
 return <svg ref={ref} className="spatial-map" role="group" aria-label={vi?`Bản đồ ghi chú tầng ${floor}`:`Floor ${floor} notes map`} tabIndex={onPoint?0:undefined} viewBox={floor===1?'-13 -21 26 36':'-13 -21 26 29'} onKeyDown={key} onClick={e=>{if(!onPoint||!ref.current)return;const matrix=ref.current.getScreenCTM();if(matrix){const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());pick(p.x,p.y);}}}>
   <rect x="-12" y="-20" width="24" height={floor===1?34:27} fill="#e7efdf"/>
   <rect x="-12" y="-20" width="24" height="27" fill="#faf7ed"/>
   {roomZones.filter(r=>r.floor===floor).map(r=><g key={r.label}><rect x={r.x-r.width/2} y={r.z-r.depth/2} width={r.width} height={r.depth} fill={r.color}/><text x={r.x} y={r.z-1.8} textAnchor="middle" fontSize=".32" fill="#355247">{t(r.label)}</text></g>)}
   {wallsOnFloor(floor).map(w=><rect key={w.id} x={w.position[0]-w.size[0]/2} y={w.position[2]-w.size[2]/2} width={w.size[0]} height={w.size[2]} fill="#768b81"/>)}
   {objectsOnFloor(floor).filter(o=>!o.colleague).map(o=><g key={o.id}>{objectObstacles(o,o.kind==='door').map((b,i)=><rect key={i} x={b.x-b.width/2} y={b.z-b.depth/2} width={b.width} height={b.depth} transform={`rotate(${-b.yaw*180/Math.PI} ${b.x} ${b.z})`} fill={o.color} stroke="#7e8d83" strokeWidth=".025"/>)}<title>{t(o.name)}</title></g>)}
   {floor===1&&<text x="0" y="11.8" textAnchor="middle" fontSize=".4" fill="#52695a">{vi?'SÂN TRƯỚC / LỐI VÀO':'COURTYARD / ENTRANCE'}</text>}
   <NotePins notes={notes.filter(n=>n.position.floor===floor)} selected={selected} onSelect={onSelect}/>
   <g>{collisions.filter(e=>e.position.floor===floor).slice().sort((a,b)=>Number(a.id===selectedCollision)-Number(b.id===selectedCollision)).map(event=><g key={event.id} role="button" tabIndex={0} aria-label={`Collision: ${event.objectName}, ${new Date(event.occurredAt).toLocaleTimeString('en-US')}`} data-collision-id={event.id} className="map-collision-pin" transform={`translate(${event.position.x} ${event.position.z})`} onClick={e=>{e.stopPropagation();onCollision(event);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onCollision(event);}}}>
     <path d="M0 -.43L.43 0L0 .43L-.43 0Z" fill="#d00068" stroke={event.id===selectedCollision?'#162b3c':'white'} strokeWidth={event.id===selectedCollision?'.14':'.08'}/>
     <path d="M-.12 -.12L.12 .12M-.12 .12L.12 -.12" stroke="white" strokeWidth=".07" pointerEvents="none"/><title>{event.objectName} · {event.action} · {event.movement}</title>
   </g>)}</g>
   {point&&<g transform={`translate(${point.x} ${point.z})`} pointerEvents="none"><circle r=".48" fill="#206bb4" stroke="white" strokeWidth=".1"/><path d="M-.22 0H.22M0-.22V.22" stroke="white" strokeWidth=".08"/></g>}
 </svg>;
}
