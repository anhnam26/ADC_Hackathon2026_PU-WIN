# Day Zero — Workplace Simulator

Trải nghiệm văn phòng bằng nhân vật do bạn chủ động điều khiển. Bản demo ưu tiên người dùng xe lăn: nhập kích thước xe, tự đi qua cửa, tiếp cận đồ vật, nhấn **F** để xem hình minh họa, cách sử dụng và số đo trước ngày làm việc đầu tiên.

## Chạy demo

Cần Node.js 22.12 trở lên (đã kiểm tra với Node 24).

```sh
npm ci
npm run dev
```

Mở **http://127.0.0.1:5173/**. Giữ terminal chạy server mở. Nếu cổng bận, dùng địa chỉ Vite in trong terminal. Nếu đang xem bản cũ, nhấn **Ctrl + Shift + R**.

Trang trắng hoặc báo thiếu thư viện: dừng server của dự án bằng `Ctrl + C`, chạy `npm ci` rồi `npm run dev -- --force`. Không chạy `npm ci` trong khi Vite còn chạy trên Windows; esbuild có thể khóa file và khiến quá trình cài đặt dừng với `EPERM`.

## Bắt đầu trải nghiệm

1. Chọn **Sử dụng xe lăn**, nhập chiều rộng, dài, cao của xe, chiều cao mặt ngồi và tay vịn bằng **cm**. Rộng cần tính cả bánh xe; dài cần tính cả gác chân. Các giá trị sẵn có là ví dụ, không phải số đo của bạn.
2. Bấm **Bắt đầu trải nghiệm**, sau đó bấm vào không gian 3D để nhận điều khiển bàn phím.
3. Di chuyển đến gần một đồ vật. Khi gợi ý xuất hiện, nhấn **F** hoặc bấm nút tương tác để mở thông tin.
4. Với cửa, bấm **Mở cửa** trong bảng thông tin, đóng bảng rồi tự điều khiển xe đi qua.
5. Ghi nhận điều cần xác minh tại chính đồ vật đó. Vào **Tổng kết trải nghiệm** để tạo nhiệm vụ chuẩn bị.

| Điều khiển | Hành động |
| --- | --- |
| W / ↑ | Di chuyển lên phía trên màn hình |
| S / ↓ | Di chuyển xuống phía dưới màn hình |
| A / ← | Di chuyển sang trái màn hình |
| D / → | Di chuyển sang phải màn hình |
| Q / E | Xoay xe tại chỗ trái / phải |
| Giữ Shift | Di chuyển chậm để căn qua cửa |
| F | Tương tác đồ vật ở gần, trong khoảng 1,35 m từ tâm nhân vật đến bề mặt |
| Escape | Đóng bảng thông tin hoặc thu gọn bản đồ |
| Kéo chuột / cuộn | Xoay / phóng to góc nhìn |
| Nút tâm ngắm | Chuyển giữa toàn cảnh và camera theo nhân vật |

WASD được tính theo hướng camera. Khi đổi hướng, xe xoay dần; có thể lùi mà không bắt buộc quay đầu trong cửa hẹp. Đây là điều khiển khám phá bằng dấu chiếm chỗ hình chữ nhật, không mô phỏng cơ học bánh xe hoặc sức đẩy.

Nút mũi tên trên màn hình dùng được bằng chạm/chuột, hoặc giữ Enter/Space khi nút có focus. Bàn phím không điều khiển xe khi đang nhập liệu, mở dialog hoặc rời khỏi vùng trò chơi. Không có chế độ nhân vật tự đi đến đích. Chọn chặng chỉ thay đổi mục tiêu, không dịch chuyển nhân vật. **Về lối vào** là nút đặt lại vị trí có chủ ý khi cần bắt đầu lại.

## Không gian và tỷ lệ

- Một mặt bằng liên tục: lối vào, lễ tân, khu bàn làm việc, phòng họp Lotus, pantry, góc nghỉ và nhà vệ sinh.
- **1 đơn vị 3D = 1 mét**. Ô lưới là 1 m. Cùng một hệ tỷ lệ cho xe, cửa, bàn, ghế và dụng cụ.
- 22 đồ vật có thông tin sử dụng. Khung cửa, tường, bàn ghế, máy nước, máy in và đồ dùng có va chạm.
- Xe thay đổi chiều rộng/dài thực theo số đo nhập; không chỉ đổi nhãn. Hướng quay của xe được xét trong kiểm tra va chạm.
- Cửa phải mở trước khi đi qua. Quá trình kiểm tra mở/đóng xét toàn bộ cung quét để tránh cánh cửa xuyên người.
- Các cửa thông thủy 126, 84, 85 và 76 cm để thử các tình huống khác nhau. Xe 70 cm có thể đi thẳng qua cửa 76 cm; xe 85 cm sẽ không lọt.
- Hình minh họa đồ vật, mô hình 3D và dữ liệu va chạm dùng chung `objectParts()`. Hình chi tiết phóng to để đọc; vật trong văn phòng luôn giữ tỷ lệ mét.
- Phần trên tường được làm trong suốt để người dùng quan sát nhân vật, nhưng kích thước mặt bằng và va chạm không thay đổi.
- Camera toàn cảnh giữ góc chéo như bản đầu, có chế độ bám nhân vật để nhìn rõ xe và vật dụng.
- Khi WebGL không khả dụng/mất context, chuyển sang bản đồ 2D với cùng vị trí, điều khiển, kích thước, cửa và va chạm.

## Thông tin và nhiệm vụ chuẩn bị

Nhấn F tại đồ vật để xem:

- Hình minh họa, chiều rộng × sâu × cao, kích thước thông thủy hoặc khoảng trống dưới bàn nếu có.
- Độ cao tay nắm, nút điều khiển hoặc vị trí sử dụng.
- Cách sử dụng/tiếp cận và những điều cần lưu ý.
- Chênh lệch giữa chiều rộng xe và cửa, giữa tay vịn và khoảng trống dưới bàn.
- Nút ghi nhận rào cản/yêu cầu xác minh; đính kèm tên đồ vật, số đo mô hình và số đo xe tại thời điểm gửi.

Luồng xử lý giữ nguyên: nhân viên ghi nhận → tổng kết tạo task không trùng → đổi vai **HR & Facilities** → bắt đầu chuẩn bị → nhập phương án → gửi xác nhận → đổi về **Nhân viên** để xác nhận hoặc yêu cầu xem lại.

Có bộ lọc, phân công, mức ưu tiên, ngày hạn và lịch sử xử lý. Thông tin đồ vật/số đo đi cùng ghi nhận tới dashboard để người chuẩn bị hiểu đúng bối cảnh.

## Lưu phiên

Lưu cục bộ: hồ sơ xe, vị trí/hướng nhân vật, cửa đã mở, đồ vật đã tìm hiểu, tiến độ, ghi nhận và nhiệm vụ. Vị trí lưu khoảng mỗi 0,9 giây và khi rời màn hình. Dữ liệu phiên cũ được bổ sung trường mặc định mà không mất ghi nhận trước đó.

**Tùy chọn & dữ liệu** cho phép giảm chuyển động, xuất JSON hoặc đặt lại toàn bộ demo có xác nhận. Nếu localStorage bị chặn, vẫn dùng phiên tạm; nếu dữ liệu cũ hỏng, không ghi đè cho tới khi người dùng chọn đặt lại.

## Kiểm tra và build

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run test:production
```

Unit tests kiểm tra số đo hình học, va chạm xe/cửa theo chiều rộng và chiều dài, xoay xe, không xuyên tường khi frame dài, cự ly/đường nhìn tương tác, cung quét cửa, hồ sơ xe, di chuyển phiên cũ và quy tắc nhiệm vụ.

E2E kiểm tra điều khiển WASD/F, cửa đóng/mở, thay số đo xe, ghi nhận kèm số đo đến HR, lưu phiên, 3D, cảm ứng/mobile, fallback, bàn phím/dialog, lưu trữ bị chặn và lỗi WebGL. Axe kiểm tra tự động màn hình trò chơi 2D; chưa phải chứng nhận khả năng tiếp cận toàn bộ sản phẩm. Ảnh chụp nằm trong `test-results/`.

`test:production` build và kiểm tra nhanh bản production tại cổng 5174 rồi tự dừng preview server. Để chạy thủ công:

```sh
npm run build
npm run preview
```

Bản preview ở **http://127.0.0.1:4173/**. Có thể đưa `dist/` lên static hosting; không cần backend hay API key.

## Cấu trúc dữ liệu không gian

- `src/data/space.ts`: mặt bằng mét, đồ vật, số đo, hướng dẫn, vị trí xuất phát và mục tiêu. Các đoạn tường cạnh cửa sinh từ cùng số đo thông thủy.
- `src/lib/objectGeometry.ts`: hình học đồ vật dùng chung cho 3D, SVG minh họa, mặt bằng 2D và vùng va chạm.
- `src/lib/physics.ts`: giao hình chữ nhật xoay, bước nhỏ chống xuyên tường, cự ly, đường nhìn và cung quét cửa.
- `src/features/simulator/useSimulation.ts`: vòng cập nhật di chuyển, WASD, cảm ứng, dừng khi mở dialog/rời tab.
- `src/features/simulator/OfficeScene.tsx`: dựng không gian, nhân vật và camera.
- `src/features/simulator/ObjectInspector.tsx`: hồ sơ đồ vật và so sánh kích thước.
- `src/types/simulator.ts`: schema hồ sơ xe và kiểu dữ liệu không gian.
- `src/data/office.ts`, `journey.ts`: địa điểm và lịch trình được giữ để tương thích các ghi nhận/phiên cũ. Tọa độ của simulator mới lấy từ `space.ts`.

Khi thêm vật dụng thật: nhập số đo mét, vị trí, kiểu hình học và hướng dẫn trong `space.ts`; bổ sung phần hình học tương ứng nếu là loại mới. Không scale tùy ý từng asset để “trông vừa”. Kiểm tra ảnh và số đo từ doanh nghiệp trước khi gắn nhãn xác minh.

## Giới hạn thực tế của bản demo

- Mặt bằng và kích thước là dữ liệu giả lập có tỷ lệ thống nhất; chưa phải bản đo công ty thật.
- Va chạm là hình học phẳng có hướng quay. Chưa mô phỏng lực đẩy, độ dốc, ma sát, tay/chân thò ra, cử động cơ thể hoặc chuyển người. Mặt bàn/bồn rửa chặn theo hình chiếu bảo thủ; chưa cho đưa đầu gối vào dưới.
- Độ cao xe, ghế và tay vịn có trong hình và so sánh. Chưa có mô hình tầm với cá nhân; không kết luận khả năng sử dụng máy nước/tay nắm chỉ từ chiều cao.
- Người dùng đi bộ có thể khám phá cùng không gian nhưng chức năng chính vẫn dành cho người dùng xe lăn.
- Không có đăng nhập, backend, email, đồng bộ máy khác hoặc gửi task tới HR thật. Đổi vai chỉ trình diễn trong cùng trình duyệt/origin.
- Hoàn thành chặng nghĩa là đã tìm hiểu, không chứng nhận môi trường đáp ứng nhu cầu. Xe đi lọt ô cửa không tự chứng minh có thể sử dụng cả phòng.
- Chưa đo hiệu năng trên mọi máy; 2D là lựa chọn giữ đầy đủ logic trên thiết bị không chạy 3D ổn định.

Kế hoạch gốc và phụ lục simulator: [DAY_ZERO_SIMULATOR_PLAN.txt](DAY_ZERO_SIMULATOR_PLAN.txt).
