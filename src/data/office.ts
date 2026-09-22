import type { Location, Point } from "../types/domain";

export const locations: Location[] = [
  {
    id: "arrival",
    floor: "ground",
    name: "Điểm đón & trả xe",
    shortName: "Điểm đón xe",
    position: [-7, 0, 5],
    category: "entrance",
    step: 0,
    description:
      "Bắt đầu từ điểm đón xe phía trước tòa nhà. Biển Day Zero Office nằm bên phải lối vào.",
    fact: "Chưa xác minh khoảng cách từ điểm đón đến lối vào.",
    contact: "Lễ tân · máy lẻ 100",
  },
  {
    id: "entrance",
    floor: "ground",
    name: "Cửa chính",
    shortName: "Cửa chính",
    position: [-4, 0, 2],
    category: "entrance",
    step: 0,
    description:
      "Cửa chính có bậc thang. Bạn có thể xem lối bên hông trước khi quyết định tuyến đi.",
    fact: "Có bậc thang trong mô hình mẫu. Chưa có số đo thực tế.",
    contact: "Facilities · máy lẻ 102",
  },
  {
    id: "side-entry",
    floor: "ground",
    name: "Lối vào bên hông",
    shortName: "Lối bên hông",
    position: [7, 0, 2],
    category: "entrance",
    step: 0,
    description:
      "Tuyến bên hông trong mô hình không có bậc thang. Hãy xác minh giờ mở và điều kiện sử dụng.",
    fact: "Chưa xác minh giờ mở cửa và độ rộng lối đi.",
    contact: "Facilities · máy lẻ 102",
  },
  {
    id: "reception",
    floor: "ground",
    name: "Quầy lễ tân",
    shortName: "Lễ tân",
    position: [-4, 0, -2],
    category: "guidance",
    step: 1,
    description:
      "Gặp lễ tân, giới thiệu tên và nhận thẻ khách. Người hướng dẫn sẽ đón bạn tại đây.",
    fact: "Chưa xác minh người đón và hướng dẫn nhận thẻ.",
    contact: "Linh · HR · máy lẻ 101",
  },
  {
    id: "gate",
    floor: "ground",
    name: "Cổng kiểm soát thẻ",
    shortName: "Cổng thẻ",
    position: [1, 0, -2],
    category: "entrance",
    step: 1,
    description:
      "Dùng thẻ để đi qua cổng. Nếu cần hỗ trợ, liên hệ lễ tân trước khi di chuyển.",
    fact: "Chưa xác minh độ rộng cổng và phương án hỗ trợ.",
    contact: "Facilities · máy lẻ 102",
  },
  {
    id: "lift-ground",
    floor: "ground",
    name: "Thang máy tầng trệt",
    shortName: "Thang máy",
    position: [7, 0, -3],
    category: "entrance",
    step: 1,
    description:
      "Thang máy đưa bạn đến tầng làm việc. Chọn chặng “Bàn làm việc” để xem tầng 2.",
    fact: "Chưa xác minh kích thước cabin và vị trí bảng điều khiển.",
    contact: "Facilities · máy lẻ 102",
  },
  {
    id: "lift",
    floor: "office",
    name: "Sảnh thang máy · tầng 2",
    shortName: "Thang máy",
    position: [-8, 0, 4.5],
    category: "entrance",
    step: 2,
    description:
      "Đây là điểm bắt đầu trên tầng làm việc. Hành lang trung tâm kết nối các phòng.",
    fact: "Chưa xác minh biển chỉ dẫn tại sảnh thang máy.",
    contact: "Facilities · máy lẻ 102",
  },
  {
    id: "desk",
    floor: "office",
    name: "Bàn làm việc A12",
    shortName: "Bàn của bạn",
    position: [-5, 0, -1.5],
    category: "furniture",
    step: 2,
    description:
      "Chào mừng đến góc làm việc của bạn. Bàn A12 nằm trong khu làm việc mở, gần hành lang trung tâm.",
    fact: "Chưa xác minh chiều cao bàn và khoảng trống bên dưới.",
    contact: "Facilities · máy lẻ 102",
  },
  {
    id: "restroom",
    floor: "office",
    name: "Nhà vệ sinh",
    shortName: "Nhà vệ sinh",
    position: [7, 0, 4],
    category: "restroom",
    step: 2,
    description:
      "Nhà vệ sinh nằm ở cuối hành lang bên phải. Xem vị trí cửa và đường đi từ bàn của bạn.",
    fact: "Chưa xác minh độ rộng cửa, tay vịn và không gian bên trong.",
    contact: "Facilities · máy lẻ 102",
  },
  {
    id: "meeting",
    floor: "office",
    name: "Phòng họp Lotus",
    shortName: "Phòng Lotus",
    position: [5, 0, -1.5],
    category: "captions",
    step: 3,
    description:
      "Buổi chào mừng diễn ra tại phòng Lotus. Bạn có thể đề nghị phụ đề hoặc tài liệu chữ trước cuộc họp.",
    fact: "Chưa xác minh thiết bị phụ đề và tài liệu cuộc họp.",
    contact: "Linh · HR · máy lẻ 101",
  },
  {
    id: "pantry",
    floor: "office",
    name: "Pantry & khu ăn trưa",
    shortName: "Pantry",
    position: [-6, 0, 3.8],
    category: "quiet",
    step: 4,
    description:
      "Dùng bữa cùng đồng nghiệp hoặc chọn một chỗ ngồi yên tĩnh hơn ở mép khu pantry.",
    fact: "Chưa xác minh tiếng ồn và khả năng bố trí chỗ ngồi riêng.",
    contact: "Facilities · máy lẻ 102",
  },
  {
    id: "quiet",
    floor: "office",
    name: "Phòng yên tĩnh",
    shortName: "Phòng yên tĩnh",
    position: [1, 0, 4],
    category: "quiet",
    step: 5,
    description:
      "Một không gian nhỏ để nghỉ ngắn. Kiểm tra cách đăng ký trước khi sử dụng.",
    fact: "Chưa xác minh quy trình đặt phòng và giờ sử dụng.",
    contact: "Linh · HR · máy lẻ 101",
  },
  {
    id: "exit",
    floor: "ground",
    name: "Lối ra cuối ngày",
    shortName: "Lối ra",
    position: [7, 0, 5],
    category: "entrance",
    step: 6,
    description:
      "Từ tầng làm việc, trở lại sảnh bằng thang máy rồi đi đến điểm đón xe qua lối bên hông.",
    fact: "Chưa xác minh lối bên hông còn mở sau 17:00.",
    contact: "Lễ tân · máy lẻ 100",
  },
];

locations.push(...([
  ['hr-room','Phòng nhân sự',-8,-17,'ground'],['training-room','Phòng đào tạo',0,-17,'ground'],['wellness-room','Phòng nghỉ ngơi',8,-17,'ground'],
  ['f2-work','Khu làm việc tầng 2',-6,1,'office'],['f2-meeting','Phòng họp Sky',6,1,'office'],['upper-lobby','Sảnh tầng 2',0,-11.9,'office'],
] as const).map(([id,name,x,z,floor])=>({...locations.find(l=>l.id==='desk')!,id,name,shortName:name,floor,position:[x,0,z] as Point,description:name,fact:'Không gian mô phỏng; cần xác minh điều kiện thực tế.',contact:'HR & Facilities'})));
export const locationById = (id: string) =>
  locations.find((l) => l.id === id) ?? locations[0];
// Routes run along the open central corridor, then through room openings.
export function routeFor(id: string, stepFree: boolean): Point[] {
  const l = locationById(id);
  const end: Point = [l.position[0], 0.16, l.position[2]];
  if (l.floor === "office")
    return [[-8, 0.16, 4.5], [-8, 0.16, 1], [end[0], 0.16, 1], end];
  if (id === "arrival") return [[-9, 0.16, 5], end];
  if (id === "exit") return [[7, 0.16, -3], [7, 0.16, 0], [7, 0.16, 2], end];
  if (id === "entrance") return [[-7, 0.16, 5], [-4, 0.16, 5], end];
  const approach: Point[] = stepFree
    ? [
        [-7, 0.16, 5],
        [7, 0.16, 5],
        [7, 0.16, 0],
      ]
    : [
        [-7, 0.16, 5],
        [-4, 0.16, 5],
        [-4, 0.16, 0],
      ];
  return [...approach, [end[0], 0.16, 0], end];
}
