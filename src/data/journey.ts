import type { JourneyStep } from '../types/domain';

export const journey: JourneyStep[] = [
  { id: 0, time: '08:30', title: 'Đến văn phòng', subtitle: 'Một khởi đầu thật nhẹ nhàng', locationId: 'arrival', instructions: ['Xác định điểm đón xe và biển tên tòa nhà.', 'Khám phá cửa chính và lối bên hông.'], checklist: [
    { id: 'arrival-route', label: 'Lối vào không có bậc thang', category: 'entrance', suggestion: 'Cần xác minh lối bên hông có mở lúc 08:30 không.' },
    { id: 'arrival-sign', label: 'Biển chỉ dẫn dễ nhận biết', category: 'guidance', suggestion: 'Cần hướng dẫn tìm đúng cửa vào tòa nhà.' },
  ] },
  { id: 1, time: '08:40', title: 'Nhận thẻ & vào tòa nhà', subtitle: 'Gặp người đồng hành đầu tiên', locationId: 'reception', instructions: ['Giới thiệu tên với lễ tân và nhận thẻ.', 'Xem cổng kiểm soát và vị trí thang máy.'], checklist: [
    { id: 'gate-width', label: 'Cổng kiểm soát phù hợp', category: 'entrance', suggestion: 'Cần xác minh cách đi qua cổng khi dùng xe lăn.' },
    { id: 'welcome-contact', label: 'Có người đón và hỗ trợ', category: 'guidance', suggestion: 'Cần biết tên và liên hệ của người đón tại lễ tân.' },
  ] },
  { id: 2, time: '09:00', title: 'Góc làm việc của bạn', subtitle: 'Làm quen với một nơi mới', locationId: 'desk', instructions: ['Tìm bàn A12 và khám phá khu vực xung quanh.', 'Thử tuyến từ bàn làm việc đến nhà vệ sinh.'], checklist: [
    { id: 'desk-space', label: 'Bàn và lối đi phù hợp', category: 'furniture', suggestion: 'Cần xác minh chiều cao bàn A12 và khoảng trống bên dưới.' },
    { id: 'restroom-access', label: 'Nhà vệ sinh dễ tiếp cận', category: 'restroom', suggestion: 'Chưa có thông tin kích thước lối vào nhà vệ sinh.' },
  ] },
  { id: 3, time: '09:30', title: 'Buổi họp chào mừng', subtitle: 'Mọi người đều được tham gia', locationId: 'meeting', instructions: ['Đến phòng Lotus và chọn vị trí ngồi.', 'Xem cách tham gia và chuẩn bị tài liệu cuộc họp.'], checklist: [
    { id: 'meeting-captions', label: 'Có phụ đề hoặc tài liệu chữ', category: 'captions', suggestion: 'Cần xác nhận phụ đề được bật trong buổi họp chào mừng.' },
    { id: 'meeting-seat', label: 'Lối vào và chỗ ngồi phù hợp', category: 'furniture', suggestion: 'Cần bố trí chỗ ngồi dễ tiếp cận trong phòng Lotus.' },
  ] },
  { id: 4, time: '12:00', title: 'Giờ ăn trưa', subtitle: 'Nạp năng lượng, kết nối đồng nghiệp', locationId: 'pantry', instructions: ['Tìm quầy nước và khu ăn trưa.', 'Xem lựa chọn chỗ ngồi yên tĩnh.'], checklist: [
    { id: 'lunch-quiet', label: 'Có chỗ ngồi ít tiếng ồn', category: 'quiet', suggestion: 'Cần chỗ ngồi ít tiếng ồn vào giờ trưa.' },
    { id: 'lunch-route', label: 'Đường đến khu ăn uống thuận tiện', category: 'entrance', suggestion: 'Cần xác minh lối đi và khoảng trống giữa các bàn ăn.' },
  ] },
  { id: 5, time: '14:00', title: 'Một khoảng nghỉ ngắn', subtitle: 'Nhịp làm việc phù hợp với bạn', locationId: 'quiet', instructions: ['Ghé phòng yên tĩnh rồi quay lại bàn.', 'Kiểm tra hướng dẫn sử dụng phòng.'], checklist: [
    { id: 'quiet-booking', label: 'Biết cách đăng ký phòng', category: 'guidance', suggestion: 'Chưa rõ phòng yên tĩnh có cần đăng ký trước không.' },
    { id: 'quiet-space', label: 'Không gian nghỉ phù hợp', category: 'quiet', suggestion: 'Cần xác minh mức tiếng ồn và bố trí phòng nghỉ.' },
  ] },
  { id: 6, time: '17:00', title: 'Kết thúc ngày đầu', subtitle: 'Tự tin cho một khởi đầu mới', locationId: 'exit', instructions: ['Đi thang máy về sảnh và xác định lối ra.', 'Kiểm tra điểm đón xe và liên hệ hỗ trợ cuối ngày.'], checklist: [
    { id: 'exit-hours', label: 'Lối bên hông vẫn mở lúc ra về', category: 'entrance', suggestion: 'Cần xác nhận lối không có bậc thang vẫn mở sau 17:00.' },
    { id: 'exit-support', label: 'Có liên hệ hỗ trợ cuối ngày', category: 'guidance', suggestion: 'Cần biết người liên hệ khi ra về sau giờ hành chính.' },
  ] },
];
