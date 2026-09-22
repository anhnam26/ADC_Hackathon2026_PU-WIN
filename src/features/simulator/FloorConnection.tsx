import { useEffect, useRef, useState } from 'react';
import Dialog from '../../components/Dialog';
import ObjectIllustration from './ObjectIllustration';
import { useLocale } from '../../lib/i18n';
import { floorLabel } from '../../data/building';
import type { MobilityProfile, WorldObject } from '../../types/simulator';
import type { LiftState } from '../../lib/elevator';

export default function FloorConnection({object,profile,onClose,onTravel,onLift,onReport,onCall,inCabin,lift}:{object:WorldObject;profile:MobilityProfile;onClose:()=>void;onTravel:()=>string|null;onLift:()=>void;onReport:()=>void;onCall:()=>string|null;inCabin:boolean;lift:LiftState}){
  const {language,t}=useLocale();const vi=language==='vi';
  const [travelling,setTravelling]=useState(false),[error,setError]=useState('');const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  const stairs=object.kind==='stairs',blocked=stairs&&profile.mode==='wheelchair';
  return <Dialog title={t(object.name)} subtitle={vi?'Lối đi giữa tầng 1 và tầng 2':'Travel between floors 1 and 2'} onClose={()=>{if(!travelling)onClose();}} wide>
    <div className="inspector-grid"><ObjectIllustration object={object}/><div>
      <h3>{vi?'Thông tin lối đi':'Connection details'}</h3>
      {stairs&&<p>Two 110 cm wide flights with a 140 cm intermediate landing turn back into the corridor. The upper landing faces the lobby, clear of the exterior wall.</p>}
      <p>{stairs ? (vi?'Cầu thang rộng 150 cm, có tay vịn và 18 bậc. Chênh cao hai tầng: 320 cm.':'Two returning flights, each 110 cm wide, with handrails and 18 risers. Floor height: 320 cm.') : (vi?'Cửa rộng 140 cm. Cabin hữu dụng rộng 190 × sâu 220 cm. Nút gọi cao 95 cm.':'140 cm clear door opening. Usable cabin: 190 × 220 cm. Call button: 95 cm high.')}</p>
      <p>{vi?'Số đo mô phỏng; kiểm tra điều kiện thực tế trước ngày đi làm.':'Simulated dimensions; verify actual conditions before your first day.'}</p>
      <p>{blocked ? (vi?'Xe lăn không đi qua các bậc trong demo. Thang máy ở đầu bên kia hành lang.':'Wheelchairs cannot use steps in this demo. The lift is at the other end of the corridor.') : stairs ? (vi?'Chọn tầng để sang sảnh cầu thang. Chưa mô phỏng bước chân trên từng bậc.':'Select a floor to reach the stair landing. Individual steps are not simulated.') : (vi?'Gọi thang, chờ cửa trượt mở rồi dùng WASD vào cabin. Khi toàn bộ xe ở bên trong, nhấn F chọn tầng. Cabin và bạn di chuyển cùng nhau; tới nơi hãy tự điều khiển xe ra ngoài.':'Call the lift, wait for the sliding doors and use WASD to enter. Once fully inside, press F to select a floor. The cabin carries you vertically; drive out after arrival.')}</p>
      {!stairs && <p>{vi?'Trạng thái:':'Status:'} {t(`lift-phase-${lift.phase}`)} · {lift.y.toFixed(2)} m</p>}
      {travelling && <p className="floor-travel-status" role="status">{vi?'Đang chuyển đến':'Travelling to'} {floorLabel(object.connection!.targetFloor,language)}…</p>}
      {error && <p role="alert">{t(error)}</p>}
    </div></div>
    <div className="dialog-actions">
      <button className="button secondary" disabled={travelling} onClick={onReport}>{t('Ghi nhận về đồ vật này')}</button>
      {!stairs && !inCabin ? <button className="button primary" disabled={lift.phase==='moving'||lift.phase==='closing'||lift.phase==='opening'} onClick={()=>{const result=onCall();if(result)setError(result);else onClose();}}>{vi?'Gọi thang / Mở cửa':'Call lift / Open doors'}</button> : blocked ? <button className="button primary" onClick={onLift}>{vi?'Dẫn đường đến thang máy':'Guide me to the lift'}</button> : <button className="button primary" disabled={travelling || (!stairs && lift.phase!=='open')} onClick={()=>{setError('');if(!stairs){const result=onTravel();if(result)setError(result);}else{setTravelling(true);timer.current=setTimeout(()=>{const result=onTravel();if(result){setError(result);setTravelling(false);}},1400);}}}>{vi?'Đi đến':'Go to'} {floorLabel(object.connection!.targetFloor,language)}</button>}
      <button className="button secondary" disabled={travelling} onClick={onClose}>{t('Tiếp tục di chuyển')}</button>
    </div>
  </Dialog>;
}
