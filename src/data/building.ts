import type { WorldObject, WorldWall } from '../types/simulator';

// Every floor uses local metre coordinates. Travelling between floors changes the active scene.
export const floorLabel = (floor: number, language: 'vi' | 'en') => language === 'vi' ? `Tầng ${floor}` : `Floor ${floor}`;
export const roomZones: {floor:1|2;x:number;z:number;width:number;depth:number;label:string;color:string}[] = [
  {floor:1,x:-8,z:-17,width:8,depth:6,label:'PHÒNG NHÂN SỰ',color:'#d9e7dc'},
  {floor:1,x:0,z:-17,width:8,depth:6,label:'PHÒNG ĐÀO TẠO',color:'#e7dec7'},
  {floor:1,x:8,z:-17,width:8,depth:6,label:'PHÒNG NGHỈ NGƠI',color:'#d6e2eb'},
  {floor:2,x:-6,z:1.5,width:12,depth:11,label:'KHU LÀM VIỆC TẦNG 2',color:'#dfe6d5'},
  {floor:2,x:6,z:1.5,width:12,depth:11,label:'PHÒNG HỌP SKY',color:'#e7dec7'},
];
const wall=(id:string,x:number,z:number,w:number,d:number,floor:1|2):WorldWall=>({id,floor,position:[x,1.3,z],size:[w,2.6,d]});
const opening=(id:string,left:number,right:number,x:number,z:number,width:number,floor:1|2)=>[
  wall(id+'-left',(left+x-width/2)/2,z,x-width/2-left,.14,floor),
  wall(id+'-right',(x+width/2+right)/2,z,right-x-width/2,.14,floor),
];
export const buildingWalls:WorldWall[]=[
  wall('extension-north',0,-20,24,.14,1),wall('extension-west',-12,-15,.14,10,1),wall('extension-east',12,-15,.14,10,1),
  wall('hr-training',-4,-17,.14,6,1),wall('training-rest',4,-17,.14,6,1),
  ...opening('hr-front',-12,-4,-8,-14,1.4,1),...opening('training-front',-4,4,0,-14,1.4,1),...opening('rest-front',4,12,8,-14,1.4,1),
  wall('f2-north',0,-20,24,.14,2),wall('f2-west',-12,-6.5,.14,27,2),wall('f2-east',12,-6.5,.14,27,2),wall('f2-south',0,7,24,.14,2),
  wall('f2-divider',0,1.5,.14,11,2),...opening('f2-work-front',-12,0,-6,-4,1.4,2),...opening('f2-sky-front',0,12,6,-4,1.4,2),
];
export function createBuildingObjects(base:WorldObject[]):WorldObject[]{
  const copy=(source:string,id:string,name:string,x:number,z:number,floor:1|2,extra:Partial<WorldObject>={}):WorldObject=>({...base.find(o=>o.id===source)!,sourceId:source,id,name,position:[x,0,z],floor,...extra});
  const door=(id:string,name:string,x:number,z:number,floor:1|2,roomLabel:string,yaw=0)=>copy('desk-door',id,name,x,z,floor,{size:[1.52,2.2,.18],clearWidth:1.4,roomLabel,yaw,description:'Cửa phòng có ô thông thủy rộng 140 cm.',notes:['Rộng thông thủy 140 cm. Tay nắm cao 100 cm.','Căn thẳng xe, mở cửa rồi đi chậm qua khung.']});
  const added:WorldObject[]=[
    door('hr-door','Cửa phòng nhân sự',-8,-14,1,'PHÒNG NHÂN SỰ'),
    door('training-door','Cửa phòng đào tạo',0,-14,1,'PHÒNG ĐÀO TẠO'),
    door('wellness-door','Cửa phòng nghỉ ngơi',8,-14,1,'PHÒNG NGHỈ NGƠI'),
    copy('desk-a12','hr-desk','Bàn tiếp đón HR',-8,-17.8,1,{locationId:'reception'}),
    copy('meeting-table','training-table','Bàn phòng đào tạo',0,-17.8,1,{locationId:'meeting'}),
    copy('meeting-screen','training-screen','Màn hình đào tạo',0,-19,1),
    copy('quiet-sofa','wellness-sofa','Ghế phòng nghỉ ngơi',9.5,-18,1,{yaw:0}),
    copy('water-dispenser','wellness-water','Máy nước phòng nghỉ',6,-18.8,1,{yaw:0}),
    door('f2-work-door','Cửa khu làm việc tầng 2',-6,-4,2,'KHU LÀM VIỆC TẦNG 2',Math.PI),
    door('f2-sky-door','Cửa phòng họp Sky',6,-4,2,'PHÒNG HỌP SKY',Math.PI),
    copy('desk-a12','desk-b21','Bàn làm việc B21',-7,1,2),copy('desk-a13','desk-b22','Bàn làm việc B22',-4,1,2),
    copy('printer','f2-printer','Máy in tầng 2',-10,5,2),
    copy('meeting-table','sky-table','Bàn họp Sky',6,1,2),copy('meeting-screen','sky-screen','Màn hình phòng Sky',6,5,2,{yaw:Math.PI}),
    copy('quiet-sofa','f2-sofa','Ghế sảnh tầng 2',0,-17,2,{yaw:0}),
    copy('water-dispenser','f2-water','Máy nước tầng 2',3,-17,2,{yaw:0}),
  ];
  for(const floor of [1,2] as const){
    const targetFloor=floor===1?2:1;
    added.push({id:`lift-${floor}`,name:`Thang máy · Tầng ${floor}`,kind:'elevator',floor,locationId:'elevator',category:'entrance',position:[-10,0,-11.9],yaw:Math.PI/2,size:[2.3,2.6,2.6],color:'#859da3',clearWidth:1.4,controlHeight:.95,roomLabel:'THANG MÁY',description:'Thang máy nối tầng 1 và tầng 2. Nhấn F tại sảnh để chọn tầng.',usage:['Đến trước cửa và nhấn F.','Chọn tầng đến. Mô phỏng chuyển bạn tới sảnh thang máy của tầng đó.'],notes:['Ô cửa 140 cm; cabin hữu dụng rộng 190 × sâu 220 cm.','Nút gọi cao 95 cm. Đây là số đo giả lập, cần xác minh ở tòa nhà thật.'],connection:{targetFloor,arrival:{floor:targetFloor,x:-7.45,z:-11.9,yaw:-Math.PI/2},cabinWidth:1.9,cabinDepth:2.2}});
    added.push({id:`stairs-${floor}`,name:`Thang bộ · Tầng ${floor}`,kind:'stairs',floor,locationId:'elevator',category:'entrance',position:[10,0,-11.9],yaw:-Math.PI/2,size:[1.5,3.2,3.6],color:'#b6b6a3',roomLabel:'THANG BỘ',description:'Lối thang bộ nối hai tầng, có bậc và tay vịn.',usage:['Nhấn F để xem lối nối tầng.','Chế độ đi bộ có thể chọn tầng đến; xe lăn sử dụng thang máy bên đối diện.'],notes:['Chiều rộng cầu thang 150 cm; mô hình 18 bậc, cao tổng 320 cm.','Bản demo chuyển tầng qua bảng tương tác, chưa mô phỏng dáng đi trên từng bậc.'],connection:{targetFloor,arrival:{floor:targetFloor,x:7.2,z:-11.9,yaw:Math.PI/2}}});
  }
  for(const object of added){
    if(object.connection) object.locationId=object.floor===1?'lift-ground':'lift';
    else if(object.floor===2) object.locationId=object.position[2]<-4?'upper-lobby':object.position[0]<0?'f2-work':'f2-meeting';
    else object.locationId=object.position[0]<-4?'hr-room':object.position[0]>4?'wellness-room':'training-room';
    if(object.kind==='stairs')object.size[1]=4.2;
  }
  // Source geometry and instructions are retained for cloned furniture; only location and identity change.
  return added;
}
