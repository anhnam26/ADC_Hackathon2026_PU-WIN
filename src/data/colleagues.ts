import type { WorldObject } from '../types/simulator';

// Fictional colleagues, with local illustrations; no external personal data.
export const colleagues: WorldObject[] = [
  {
    id: 'colleague-linh', name: 'Nguyễn Mai Linh', kind: 'colleague', locationId: 'reception', category: 'guidance',
    position: [1.9, 0, 4.8], yaw: .45, size: [.54, 1.68, .44], color: '#bd8058',
    description: 'Người đón bạn và hỗ trợ các thủ tục trong ngày đầu tiên.', usage: [], notes: [],
    colleague: { role: 'Chuyên viên nhân sự', team: 'People & Culture', greeting: 'Chào bạn! Mình là Linh. Mình sẽ giúp bạn nhận thẻ và làm quen với văn phòng.',
      helpsWith: ['Nhận thẻ ra vào và hướng dẫn các khu vực.', 'Trao đổi về nhu cầu hỗ trợ trước ngày đi làm.', 'Kết nối với người hướng dẫn trong nhóm.'],
      available: '08:30 – 09:00 · Khu lễ tân', skin: '#c8916b', hair: '#322b28' },
  },
  {
    id: 'colleague-minh', name: 'Trần Đức Minh', kind: 'colleague', locationId: 'desk', category: 'guidance',
    position: [-4.7, 0, -1.1], yaw: -1.3, size: [.54, 1.76, .44], color: '#507e92',
    description: 'Đồng nghiệp cùng nhóm, đồng hành với bạn trong tuần đầu.', usage: [], notes: [],
    colleague: { role: 'Kỹ sư sản phẩm · Buddy', team: 'Product & Engineering', greeting: 'Chào bạn, mình là Minh! Mình có thể giới thiệu nhóm và cùng bạn thử chỗ làm việc mới.',
      helpsWith: ['Giới thiệu các thành viên và lịch sinh hoạt của nhóm.', 'Hướng dẫn kết nối họp trực tuyến và thiết bị tại bàn.', 'Cùng kiểm tra lối đi tới phòng họp và pantry.'],
      available: '09:00 – 09:30 · Khu làm việc', skin: '#d2a079', hair: '#252e35' },
  },
  {
    id: 'colleague-an', name: 'Lê Hoài An', kind: 'colleague', locationId: 'pantry', category: 'guidance',
    position: [-3.9, 0, 4.9], yaw: -1.1, size: [.54, 1.7, .44], color: '#708353',
    description: 'Đầu mối hỗ trợ không gian và trang thiết bị văn phòng.', usage: [], notes: [],
    colleague: { role: 'Điều phối cơ sở vật chất', team: 'Facilities', greeting: 'Mình là An. Nếu có bàn ghế chắn lối hoặc thiết bị khó sử dụng, bạn có thể ghi nhận để đội mình chuẩn bị.',
      helpsWith: ['Tiếp nhận yêu cầu điều chỉnh vị trí bàn ghế.', 'Kiểm tra cửa, tay nắm và thiết bị dùng chung.', 'Phối hợp với HR chuẩn bị không gian trước ngày đầu.'],
      available: '11:30 – 12:00 · Khu pantry', skin: '#b77e58', hair: '#4b3932' },
  },
];
