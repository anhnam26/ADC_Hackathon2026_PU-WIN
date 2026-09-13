# Các mốc build và bàn giao GitHub

Theo yêu cầu người dùng: hoàn thành từng mốc có thể kiểm tra, chạy kiểm thử liên quan, commit mô tả rõ kết quả, rồi push thành công trước khi chuyển mốc tiếp theo. Không gom các thay đổi độc lập vào một commit cuối lớn. Không push credential, danh bạ riêng hoặc outputs; không force-push để sửa lịch sử đã công bố.

## Mốc đã có trên remote

- `f08e29e` — MVP đầu tiên: môi trường Python, cấu hình free-only, workflow Excel/email, verifier, journal, mic adapter, GUI và hướng dẫn. Commit này xuất hiện trên `main` trong lúc bàn giao nên được giữ nguyên, không tách lại lịch sử. 51 kiểm thử đã đạt; Excel tháng 8 khớp gold; đã tạo nháp cục bộ; text API smoke đạt. Audio bị điều kiện số dư, email delivery chưa kiểm.

## Mốc tiếp theo: chẩn đoán audio và kiểm thử lỗi

- Phân biệt đúng thông báo 402 đã quan sát: audio yêu cầu số dư tối thiểu 0,50 USD.
- Hiển thị hướng tiếp tục bằng văn bản trong UI; không tự nạp tiền, retry hoặc đổi model.
- Chỉ dịch thông báo dịch vụ khớp chính xác; không hiển thị raw diagnostics chưa biết.
- Bổ sung 3 trường hợp kiểm thử HTTP mô phỏng: thông báo đã biết, thông báo khác và cấu trúc lỗi thiếu dữ liệu. Không cần gửi thêm âm thanh lên API để kiểm thay đổi này.

## Mốc sau cần tách riêng

1. Chọn microphone trong UI và cải thiện phản hồi mức âm lượng; kiểm thử capture cục bộ với đồng ý thích hợp.
2. Audio API tiếng Việt đầu cuối, sau khi điều kiện tài khoản/model được xử lý trong phạm vi chi phí người dùng chấp nhận.
3. Gửi/nhận demo do người dùng xác nhận đúng thư; chứng minh delivery riêng với SMTP_ACCEPTED.
4. Đánh giá người dùng mục tiêu, độ trễ và tỷ lệ hoàn thành; phát triển các yêu cầu tiếp theo theo IMPLEMENTATION_STATUS.md.

Mỗi mốc có thể bị chặn bởi đầu vào bên ngoài; báo rõ trạng thái, không đánh dấu đạt thay cho kết quả thực tế.
