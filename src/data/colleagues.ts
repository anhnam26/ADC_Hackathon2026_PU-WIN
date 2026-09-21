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
const roaming: [string, string, string, string, [number, number][], string][] = [
  ['huy', 'Phạm Quang Huy', 'Hỗ trợ công nghệ', 'reception', [[-1.7, -6], [-1.7, 1.2]], '#8270a6'],
  ['thao', 'Vũ Thanh Thảo', 'Thiết kế sản phẩm', 'desk', [[-10.5, -7.8], [-4.5, -7.8]], '#bc726c'],
  ['nam', 'Đỗ Hải Nam', 'Điều phối cuộc họp', 'meeting', [[10.3, -7.8], [10.3, -1.7]], '#618c9e'],
  ['yen', 'Ngô Bảo Yến', 'Vận hành văn phòng', 'pantry', [[-10.3, 1.5], [-10.3, 5.5]], '#ab9155'],
];
for (const [id, name, role, locationId, patrol, color] of roaming) colleagues.push({
  id: `colleague-${id}`, name, kind: 'colleague', locationId, category: 'guidance',
  position: [patrol[0][0], 0, patrol[0][1]], yaw: 0, size: [.54, 1.72, .44], color, patrol,
  description: 'Đồng nghiệp đang đi lại trong văn phòng. Họ dừng để trò chuyện khi bạn đến gần.', usage: [], notes: [],
  colleague: { role, team: 'Day Zero Office', greeting: `Chào bạn! Mình là ${name.split(' ').at(-1)}. Rất vui được làm quen và hỗ trợ bạn trong ngày đầu.`,
    helpsWith: ['Giới thiệu công việc và những người trong nhóm.', 'Hỗ trợ tìm phòng hoặc kết nối với HR khi cần.'],
    available: 'Có mặt trong văn phòng · Dừng lại khi bạn đến gần', skin: '#ce9d78', hair: '#35312e' },
});
