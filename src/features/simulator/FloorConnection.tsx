import { useEffect, useRef, useState } from 'react';
import Dialog from '../../components/Dialog';
import ObjectIllustration from './ObjectIllustration';
import { useLocale } from '../../lib/i18n';
import { floorLabel } from '../../data/building';
import type { MobilityProfile, WorldObject } from '../../types/simulator';

export default function FloorConnection({object,profile,onClose,onTravel,onLift,onReport}:{object:WorldObject;profile:MobilityProfile;onClose:()=>void;onTravel:()=>string|null;onLift:()=>void;onReport:()=>void}){
  const {language,t}=useLocale();const vi=language==='vi';
  const [travelling,setTravelling]=useState(false),[error,setError]=useState('');const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  const stairs=object.kind==='stairs',blocked=stairs&&profile.mode==='wheelchair';
  return <Dialog title={t(object.name)} subtitle={vi?'Lối đi giữa tầng 1 và tầng 2':'Travel between floors 1 and 2'} onClose={()=>{if(!travelling)onClose();}} wide>
    <div className="inspector-grid"><ObjectIllustration object={object}/><div>
      <h3>{vi?'Thông tin lối đi':'Connection details'}</h3>
      <p>{stairs ? (vi?'Cầu thang rộng 150 cm, có tay vịn và 18 bậc. Chênh cao hai tầng: 320 cm.':'150 cm wide stairs with handrails and 18 steps. Floor height: 320 cm.') : (vi?'Cửa rộng 140 cm. Cabin hữu dụng rộng 190 × sâu 220 cm. Nút gọi cao 95 cm.':'140 cm clear door opening. Usable cabin: 190 × 220 cm. Call button: 95 cm high.')}</p>
      <p>{vi?'Số đo mô phỏng; kiểm tra điều kiện thực tế trước ngày đi làm.':'Simulated dimensions; verify actual conditions before your first day.'}</p>
      <p>{blocked ? (vi?'Xe lăn không đi qua các bậc trong demo. Thang máy ở đầu bên kia hành lang.':'Wheelchairs cannot use steps in this demo. The lift is at the other end of the corridor.') : (vi?'Chọn tầng đến để chuyển sang sảnh tương ứng. Demo chưa mô phỏng thao tác trên từng bậc hoặc bên trong cabin.':'Select the destination floor to travel to its lobby. Individual stair steps and cabin boarding are not simulated.')}</p>
      {travelling && <p className="floor-travel-status" role="status">{vi?'Đang chuyển đến':'Travelling to'} {floorLabel(object.connection!.targetFloor,language)}…</p>}
      {error && <p role="alert">{t(error)}</p>}
    </div></div>
    <div className="dialog-actions">
      <button className="button secondary" disabled={travelling} onClick={onReport}>{t('Ghi nhận về đồ vật này')}</button>
      {blocked ? <button className="button primary" onClick={onLift}>{vi?'Dẫn đường đến thang máy':'Guide me to the lift'}</button> : <button className="button primary" disabled={travelling} onClick={()=>{setTravelling(true);setError('');timer.current=setTimeout(()=>{const result=onTravel();if(result){setError(result);setTravelling(false);}},1400);}}>{vi?'Đi đến':'Go to'} {floorLabel(object.connection!.targetFloor,language)}</button>}
      <button className="button secondary" disabled={travelling} onClick={onClose}>{t('Tiếp tục di chuyển')}</button>
    </div>
  </Dialog>;
}
