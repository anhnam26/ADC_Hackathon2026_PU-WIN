# Hands-Free Office · ADC 2026

MVP desktop Windows cho hai tác vụ: tạo báo cáo doanh thu Excel có kiểm chứng và soạn email Gmail theo mẫu, xác nhận riêng trước khi gửi. Lõi bám `Tailieubandau/Module_goal.txt`. AI dùng OpenRouter API; không tải mô hình AI về máy, không dùng Outlook/Graph.

**Trạng thái 13/09/2026:** đã chạy báo cáo Excel và lưu nháp `.eml`, kiểm tra giao diện, gọi text API thành công. Audio API đang bị OpenRouter từ chối HTTP 402: `This request requires at least $0.50 in balance for audio`. Chưa xác nhận nhận dạng tiếng Việt trực tiếp hoặc gửi/nhận email thật. Model audio vẫn giữ `:free`; chưa nạp tiền hoặc bật dịch vụ trả phí.

## Chạy trên máy hiện tại

Môi trường và dependencies đã cài trong `.venv`. Mở PowerShell tại thư mục dự án:

```powershell
.\run.ps1
```

Nếu chính sách PowerShell chặn script, chạy trực tiếp:

```powershell
.\.venv\Scripts\python.exe -m office_agent
```

Khi cài lại: cần Windows, Excel desktop đã kích hoạt, `uv`, Internet. Chạy `powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1`. Script dùng Python 3.13 do uv quản lý, tránh lỗi sao chép môi trường của Python Microsoft Store gặp trên máy này. Giao diện hiện cần vùng hiển thị tối thiểu khoảng 1240×940 pixel; hỗ trợ màn hình nhỏ/zoom chữ là hạng mục tiếp theo.

## Thử một tác vụ

1. Nhập **“Trợ lý, tạo báo cáo doanh thu tháng 8 năm 2026”** rồi chọn **Thực hiện yêu cầu**.
2. Kiểm tra kết quả: **16 đơn Completed, 16.429.500 VND**. Nút **Mở báo cáo** mở file mới trong Excel.
3. Nhập **“Gửi báo cáo vừa tạo cho Lan kế toán”**, hoặc chọn alias rồi **Soạn thư với báo cáo vừa tạo**. Phần xem trước hiển thị tài khoản gửi, người nhận, tiêu đề, nội dung và tệp đính kèm.
4. Nhập **“Chỉ lưu nháp”**. File `.eml` nằm cùng thư mục báo cáo; chưa được đưa lên Gmail Drafts và chưa gửi.

Các lệnh khác: `Đổi tháng thành tháng 7 năm 2026`, `Sửa người nhận thành Lan kinh doanh`, `Đọc lại`, `Dừng lại`, `Hủy tác vụ`, `Tiếp tục`, `Mở báo cáo`, `Xem lịch sử`. Nhắc tên “Lan” sẽ hỏi lại alias. Nói đầy đủ tháng và năm; chưa rõ năm sẽ hỏi thêm. “Đọc lại” hiện hiển thị lại bằng văn bản, chưa phát tiếng nói.

## Dữ liệu và cấu hình

- `.env`: OpenRouter key, Gmail app password, email gửi và ngân sách. Không đưa lên Git; không gửi nội dung file này trong chat. `.env.example` mô tả biến; khởi động lại app sau thay đổi.
- `inputs/private/source.xlsx`: nguồn nghiệp vụ đã chuẩn bị; sheet/table `Orders`, đúng 10 cột. 72 dòng giả lập, tháng 07–09/2026. App không ghi vào nguồn.
- `inputs/private/contacts.csv`: alias, tên hiển thị, email, `allowed_for_demo`. Giá trị `true` chỉ cho phép chọn gửi, vẫn cần xác nhận theo từng bản thư.
- `inputs/private/email_template.txt`: dòng `Subject:`, một dòng trống và nội dung; hỗ trợ các placeholder đã dùng trong mẫu. Chưa nhận câu lệnh sửa mẫu tự do.
- `inputs/private/expected_results.json`, `expected_report.xlsx`: dữ liệu đối chiếu. `report_template.xlsx` là mẫu tham khảo; MVP sinh bố cục Summary/Details/Metadata cố định trong mã, chưa nạp template tùy biến.
- `outputs/<run-id>/`: bản sao nguồn, báo cáo mới, `verification.json`, nháp `.eml`. Đây là dữ liệu tác vụ có chủ đích, không commit. Không chia sẻ thư mục này khi chứa địa chỉ/nội dung riêng tư.
- `runtime/journal.sqlite3`: sự kiện tối thiểu, số request và trạng thái SMTP để tránh gửi lặp sau khi mở lại. Không lưu transcript/âm thanh/mật khẩu trong journal. Không xóa journal để thử gửi lại một thư đang `UNKNOWN`.

Quy tắc báo cáo: chỉ `Completed`, lọc tháng, làm tròn Revenue từng dòng như Excel ROUND đến VND, nhóm Bắc/Trung/Nam. Không tự thay quy tắc khi người dùng yêu cầu tính Pending. Nguồn chỉ có dữ liệu đến ngày 12 mỗi tháng; báo cáo nêu ngày cuối nguồn, không khẳng định toàn tháng đầy đủ. Kỳ không có dữ liệu sẽ dừng và đề nghị chọn kỳ khác.

## Microphone và API

Ứng dụng tách câu theo năng lượng âm thanh, không dùng AI local. Mic mặc định ghi mono 16 kHz vào RAM; kết thúc câu sau khoảng 0,8 giây im lặng, giới hạn câu dưới 15 giây. Chỉ bật sau khi người dùng đánh dấu đồng ý gửi audio của phiên qua OpenRouter. Mỗi phiên tối đa 2 phút; cần bật lại khi hết phiên. Ngưỡng âm lượng được lấy lúc bật mic, điều chỉnh rồi tắt/bật để áp dụng.

**Audio hiện chưa hoạt động đầu cuối:** phép thử giọng tổng hợp tiếng Anh bị HTTP 402 yêu cầu số dư tối thiểu 0,50 USD. Không thu tiếng người dùng trong phép thử này, không tự nạp tiền hay đổi sang model trả phí. Sau khi điều kiện tài khoản được giải quyết cần chạy kiểm tra lại; nhãn model miễn phí và giá token trong catalog không tự chứng minh mọi điều kiện/chi phí audio đều bằng 0.

Text API dùng JSON schema và kiểm tra lại workflow/kỳ/alias. Lệnh thông dụng và mọi quyết định xác nhận/dừng dùng quy tắc xác định, không gọi AI. Không gửi workbook hoặc nội dung danh bạ/email cho AI; request phân tích chứa câu lệnh và alias. Những gì người dùng tự nói/nhập trong câu lệnh có thể được gửi tới API nếu cần phân tích. Audio được gửi tới provider khi có đồng ý; chính sách lưu/huấn luyện phụ thuộc tài khoản/provider đã chọn.

Mỗi model cần hậu tố `:free`, giá catalog bằng 0 và đúng modality. Request chặn giá prompt/completion/request khác 0; không tự fallback, không tự retry, không tự bật paid. Budget ứng dụng mặc định 10 request/phút và 40 request/24 giờ trượt, lưu bền qua khởi động; quota thực tế của dịch vụ vẫn có thể thấp hơn. `OPENROUTER_MAX_RETRIES` cũ không còn được sử dụng. Model catalog có thể thay đổi; lỗi API được báo và không thực thi ý định chưa kiểm tra.

## Gửi email thật

Mặc định giữ `ALLOW_REAL_EMAIL_SEND=false`; xây dựng và kiểm thử lần này không gửi thư thật. Khi **bạn chủ động muốn thử gửi**, đặt biến này thành `true` trong `.env`, giữ đúng tài khoản Gmail/app password và người nhận demo được phép, rồi mở lại app. Kiểm tra bản thư rồi bấm **Xác nhận gửi bản đang xem** hoặc đọc đúng **“gửi bản 1234”** với mã hiện hành. “Xác nhận gửi” riêng lẻ chỉ yêu cầu xem lại/mã mới.

Mã hết hạn sau 2 phút; thay tác vụ/preview/dừng làm vô hiệu mã. App kiểm tra lại danh bạ, nguồn và hash attachment trước gửi. Có tiếng nói đang chờ xử lý thì tạm chặn gửi. Dừng bằng nút/Esc được xử lý tại máy; dừng bằng giọng nói phụ thuộc độ trễ STT và mạng, không phải cơ chế dừng tức thời.

Nếu SMTP trả chấp nhận, app chỉ khẳng định **Gmail đã chấp nhận**, chưa xác minh người nhận đã nhận. Timeout/mất kết nối khi đang gửi -> `UNKNOWN`; không tự gửi lại. Đối chiếu Gmail trước thao tác tiếp. Không thể thu hồi thư sau khi quá trình gửi đã bắt đầu. Journal chặn lại payload giống hệt đã nhận/không rõ trạng thái; không bảo đảm chống mọi thư trùng về ý nghĩa khi người dùng tạo báo cáo mới.

## Kiểm tra kỹ thuật

```powershell
uv run python -m office_agent --doctor
uv run pytest -q
uv run python -m office_agent --smoke-ui
uv run python -m office_agent --smoke-report 2026-08
uv run python -m office_agent --demo-draft lan_ketoan
```

`--doctor` chỉ đọc đầu vào và liệt kê khả năng mic; có tạo/mở journal của app, không network. Kiểm thử pytest dùng thư mục riêng và SMTP/HTTP mô phỏng, không credential thật. Các lệnh tạo báo cáo/nháp tạo đầu ra thật trên máy.

Lượt kiểm cuối ngày 13/09/2026: **51 test đạt**. Bản báo cáo và nháp đã tạo để xem ở `outputs/79ca0b2a12db401aad48be0e93b64b28/`.

Hai lệnh sau tiêu thụ quota API, chỉ dùng nội dung giả lập:

```powershell
uv run python -m office_agent --check-api
uv run python -m office_agent --check-audio-api
```

Lệnh audio tạo giọng đọc tổng hợp bằng Windows SAPI vào RAM, không mở mic; đây là kiểm tra tiếng Anh của đường truyền, không thay thế đánh giá STT tiếng Việt. Đóng app sẽ đóng mic, đợi worker và đóng phiên Excel riêng. Một số lời gọi mạng cần hết timeout mới thoát.

## Phạm vi còn lại

Xem [trạng thái triển khai](docs/IMPLEMENTATION_STATUS.md). Chưa có Word/UI Automation tổng quát, điều khiển mắt, TTS tiếng Việt, sửa nguồn/undo tổng quát, khôi phục nguyên phiên sau crash, đồng bộ Gmail Drafts, hoặc đánh giá người dùng mục tiêu. Chưa thể kết luận đạt tiêu chí hands-free hoặc sẵn sàng vào top 5 từ các kiểm thử kỹ thuật này.

Tham khảo giao thức: [OpenRouter audio](https://openrouter.ai/docs/guides/overview/multimodal/audio), [structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs), [provider routing](https://openrouter.ai/docs/guides/routing/provider-selection), [SMTP của Python](https://docs.python.org/3/library/smtplib.html).
