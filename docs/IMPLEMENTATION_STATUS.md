# Trạng thái triển khai · 13/09/2026

Đã xây bản MVP chạy được cho phần nhập lệnh văn bản → Excel có kiểm chứng → email theo mẫu → nháp cục bộ. Phần gửi có mã xác nhận và transport Gmail SMTP, đã kiểm thử bằng transport mô phỏng. Đây là giai đoạn triển khai đầu tiên theo Module_goal, chưa phải hoàn tất mọi hạng mục trong kế hoạch thi ADC.

| Thành phần | Có trong mã | Bằng chứng/giới hạn |
|---|---|---|
| Desktop Windows | Tkinter, command box, STOP, mic, preview, lịch sử | Đã mở, chụp kiểm tra giao diện và đóng sạch trên máy hiện tại |
| Hiểu ý định | Quy tắc tiếng Việt + OpenRouter JSON schema | Request text giả lập đạt sau khi sửa schema/hướng dẫn; không phải benchmark độ chính xác |
| Nghiệp vụ | Tháng, Completed, làm tròn VND, ba vùng | Kiểm thử tổng, từng dòng, lọc, rounding, nguồn sai/công thức ngoài phạm vi |
| Excel COM | Bản sao riêng, tính lại, lưu, watchdog 45 giây | August thực tế: 16 đơn, 16.429.500 VND; nguồn giữ nguyên |
| Verifier | Đọc lại snapshot và workbook; đối chiếu detail/region/total/meta/hash | Có kiểm thử sửa sai tổng, dòng, ID và kỳ |
| Email | Mẫu, alias, MIME attachment, `.eml` | Đã tạo nháp từ báo cáo thật trên máy; không đưa lên Gmail Drafts |
| Approval | Mã 4 chữ số/120 giây, version, chặn câu phủ định/voice cũ | Có kiểm thử hết hạn, sai mã, dừng, đổi tệp/nguồn/danh bạ, audio chờ |
| Gmail SMTP | SSL465, login, durable SUBMIT_STARTED/ACCEPTED/UNKNOWN/REJECTED | Preflight trước đó AUTH235; lần xây này chỉ SMTP giả lập, chưa gửi/nhận thật |
| Khôi phục | Nhật ký bền, chống lặp payload đã gửi/chưa rõ | Không tự khôi phục task/preview sau khởi động; đọc lịch sử rồi tạo tác vụ mới |
| Âm thanh | RAM mono16k, tách câu theo năng lượng, phiên có consent | Mã đã có; cloud smoke bị HTTP402 yêu cầu số dư tối thiểu 0,50 USD cho audio |
| Ngân sách | Free suffix/catalog/modality/zero-price routing; quota SQLite | Không đổi model trả phí, không retry tự động; điều kiện tài khoản audio còn chặn |

## Các quyết định thực hiện

1. Workflow cố định bám hai tác vụ trong Module_goal. AI chỉ điền các trường ý định; không trả script, không điều khiển shell và không cấp approval.
2. Không sửa nguồn hoặc ghi đè báo cáo. Mỗi lần chạy tạo thư mục mới; dừng/hủy không xóa báo cáo đã tạo. Vì vậy chưa triển khai undo sửa nguồn.
3. Bố cục báo cáo được viết cố định cùng verifier, chưa nạp template Excel tùy biến. Template/gold đã chuẩn bị vẫn là tài liệu đối chiếu.
4. Tiếp tục trong cùng phiên giữ trạng thái để xem lại; lần mở ứng dụng mới giữ lịch sử/quota/trạng thái gửi, không tự chạy lại side effect.
5. Khác câu mẫu cũ: thiếu năm hỏi lại; “xác nhận gửi” chỉ hiện mã, không submit; kỳ rỗng dừng/chọn kỳ khác; “đọc lại” hiển thị văn bản. Câu T07 không đổi bộ lọc: nghiệp vụ luôn Completed.
6. Chưa bật gửi thật trong `.env`. Không gửi người nhận demo dù các dòng allowlist đã được bật.

## Các bước phát triển tiếp theo

1. Giải quyết điều kiện audio tài khoản/model trong giới hạn chi phí được người dùng chấp nhận. Không suy ra từ nhãn `:free` rằng audio không có điều kiện số dư. Chạy lại audio synthetic, sau đó xin đồng ý phiên thu giọng người dùng.
2. Đánh giá STT tiếng Việt: 20 câu, tên người nhận, tháng/năm, câu phủ định, mã xác nhận, tiếng nền; đo độ trễ và tỷ lệ hoàn thành. Cần người dùng thật tham gia trước khi báo hands-free hoạt động.
3. Một phiên gửi Gmail có người dùng chủ động xác nhận đúng thư, rồi đối chiếu Sent/Inbox. Đo SMTP_ACCEPTED riêng với delivery; thử mất mạng bằng môi trường mô phỏng trước.
4. Tối ưu cho người không dùng tay: bật nghe sau thiết lập trợ giúp, phiên dài hơn có cơ chế tiết kiệm quota, phản hồi nghe được, xử lý cắt lời. UI màn hình nhỏ/zoom chữ và lựa chọn mic cần phát triển thêm.
5. Mở rộng fault injection: Excel COM kẹt ở bước khởi tạo, crash giữa các checkpoint, khóa file, mạng chậm, quyền thư mục. Hiện watchdog theo dõi handle Excel sau khi COM tạo được instance; chưa chứng minh mọi lỗi Office đều dọn sạch được.
6. Đánh giá người dùng mục tiêu và baseline thao tác thủ công theo tài liệu phát triển; thu thập bằng chứng tác động/độ tin cậy để làm pitch. Không suy ra vị trí giải từ số lượng tính năng hay test pass.

## Tách bằng chứng

Pytest kiểm tra logic với dữ liệu riêng, mock HTTP/SMTP. Excel smoke kiểm tra COM trên máy hiện tại. Text API smoke chỉ là một trường hợp sau sửa, ban đầu đã có lỗi parse. Audio smoke thất bại do điều kiện tài khoản, không phải bằng chứng STT kém/tốt. Email delivery và thử nghiệm người dùng chưa thực hiện. Không gộp các kết quả này thành tỷ lệ thành công đầu cuối.

Lượt kiểm cuối: **51 test đạt**, gồm watchdog timeout của tiến trình worker trên Windows. Doctor đọc được 72 dòng nguồn, 3 liên hệ được bật, credential đã cấu hình và gửi thật vẫn khóa. Báo cáo/nháp demo để người dùng xem tại `outputs/79ca0b2a12db401aad48be0e93b64b28/` (thư mục riêng tư, không commit).
