import {expect,it} from 'vitest';
import {objects,objectives} from '../../src/data/space';
import {objectEnglish} from '../../src/data/objectEnglish';
import {locations} from '../../src/data/office';
import {journey} from '../../src/data/journey';
import {translate} from '../../src/lib/i18n';
import {measurementSummary} from '../../src/features/simulator/ObjectInspector';
import {defaultMobility} from '../../src/types/simulator';

// Vietnamese letters, excluding punctuation such as × and proper names.
const vietnamese=/[À-ÖØ-öø-ỹĐđ]/;
it('renders the full object catalogue, room signs and journey titles in English',()=>{
 const text:string[]=[];
 for(const object of objects){
  if(object.colleague)continue;
  text.push(translate(object.name,'en'),translate(object.roomLabel??'','en'),measurementSummary(object,defaultMobility));
  if(object.connection)continue; // Lift/stairs have dedicated English connection panels.
  const english=objectEnglish(object);text.push(english.description,...english.usage,...english.notes);
 }
 text.push(...objectives.flatMap(o=>[translate(o.label,'en'),translate(o.hint,'en')]));
 text.push(...journey.map(step=>translate(step.title,'en')));
 text.push(...locations.map(location=>translate(location.name,'en')));
 expect(text.filter(value=>vietnamese.test(value))).toEqual([]);
});

it('translates system notices and history while preserving the appended user response',()=>{
 expect(translate('Đã tạo 3 nhiệm vụ chuẩn bị trong demo.','en')).toBe('Created 3 preparation tasks.');
 expect(translate('Phương án: Tôi cần chỗ rộng hơn.','en')).toBe('Solution: Tôi cần chỗ rộng hơn.');
 expect(translate('Tường / khung phòng','en')).toBe('Wall / room frame');
});

it('renders saved Vietnamese measurement snapshots in English without recalculating their dimensions',()=>{
 const snapshot='Cửa vào & tay nắm: rộng 152 × sâu 15 × cao 220 cm; thông thủy 146 cm. Xe: 75.5 × 110 cm; tay vịn 70 cm. Số đo mô phỏng.';
 expect(translate(snapshot,'en')).toBe('Entrance door & handle: width 152 × depth 15 × height 220 cm; clear opening 146 cm. Wheelchair: 75.5 × 110 cm; armrests 70 cm. Simulated measurements.');
 expect(translate('Máy nước uống: rộng 50 × sâu 45 × cao 110 cm. Chế độ đi bộ. Số đo mô phỏng.','en')).toBe('Water dispenser: width 50 × depth 45 × height 110 cm. Walking mode. Simulated measurements.');
});
