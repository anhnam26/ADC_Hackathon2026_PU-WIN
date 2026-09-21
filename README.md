# Day Zero Simulator

Demo web bằng tiếng Việt: khám phá văn phòng 3D, thử lịch trình ngày đầu, ghi nhận điều kiện tiếp cận cần xác minh và tạo nhiệm vụ chuẩn bị cho HR/Facilities.

## Chạy trên máy

Cần Node.js 22.12 trở lên (đã chạy với Node 24), npm và trình duyệt hiện đại.

```sh
npm ci
npm run dev
```

Mở **http://127.0.0.1:5173/**. Nếu cổng bận, xem địa chỉ Vite in trong terminal. Máy chủ mặc định chỉ nghe trên máy của bạn.

Nếu trang chỉ hiện màu trắng, thử `Ctrl + Shift + R`. Nếu vẫn lỗi hoặc terminal báo thiếu thư viện, dừng server bằng `Ctrl + C` trước khi cài lại:

```sh
npm ci
npm run dev -- --force
```

Trên Windows, không chạy `npm ci` trong lúc Vite còn chạy: tiến trình esbuild có thể khóa file, làm quá trình cài đặt dừng với lỗi `EPERM` và để lại thư mục thư viện chưa đầy đủ. Đóng các terminal đang chạy server của dự án rồi thực hiện lại hai lệnh trên. Giữ terminal chạy demo mở trong lúc sử dụng.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run preview` phục vụ bản build tại **http://127.0.0.1:4173/**. Thư mục `dist/` có thể đưa lên static hosting. Ứng dụng dùng điều hướng trong trang, không cần cấu hình rewrite cho router. `base: './'` cho phép đặt trong đường dẫn con.

## Có gì trong demo

- Hai không gian 3D low-poly: ngoại thất/sảnh và tầng làm việc, 13 điểm tương tác.
- Bảy chặng: đến văn phòng, nhận thẻ, tìm bàn, họp, ăn trưa, nghỉ ngắn, ra về.
- Chọn điều kiện muốn xác minh; checklist cá nhân hóa, ghi nhận, sửa/xóa bản nháp.
- Nhân vật di chuyển theo waypoint, chọn tuyến bên hông, xoay/zoom/đặt lại camera, mở rộng bản đồ.
- Bản đồ 2D và danh sách địa điểm; tự chuyển 2D khi WebGL 2 không khả dụng hoặc mất context.
- Tổng kết và tạo nhiệm vụ không trùng khi gửi lại; phân công HR/Facilities theo loại vấn đề.
- Lọc nhiệm vụ theo bộ phận, ưu tiên, trạng thái hoặc từ khóa; ghi người phụ trách và phương án hỗ trợ.
- Vòng phản hồi: cần xử lý → đang chuẩn bị → chờ xác nhận → nhân viên xác nhận hoặc yêu cầu xem lại.
- Lịch sử cập nhật, hạn trước ngày bắt đầu một ngày, cảnh báo quá hạn. Ngày bắt đầu mặc định là ngày hiện tại tại Việt Nam + 7 ngày.
- Lưu phiên bằng localStorage, kiểm tra dữ liệu khi khôi phục, xuất JSON, đặt lại demo có xác nhận.
- Giao diện responsive, dialog dùng bàn phím, tùy chọn giảm chuyển động theo hệ điều hành.

## Kịch bản trình diễn khoảng 3 phút

1. Chọn **Lối đi không có bậc thang** và **Phụ đề & tài liệu họp** rồi bắt đầu.
2. Ở chặng 08:30, chọn **Cần xác minh** cho lối vào; lưu ghi nhận.
3. Chọn chặng 09:30, ghi yêu cầu phụ đề cho buổi họp Lotus.
4. Vào **Tổng kết trải nghiệm**, bấm **Tạo 2 nhiệm vụ chuẩn bị**.
5. Đổi **Vai trải nghiệm** ở góc trên sang **HR & Facilities**. Mở nhiệm vụ họp, bắt đầu chuẩn bị, nhập phương án rồi gửi xác nhận.
6. Đổi về **Nhân viên**, mở nhiệm vụ và **Xác nhận phương án**. Có thể thử **Yêu cầu xem lại** trước khi xác nhận.
7. Để diễn lại: **Tùy chọn & dữ liệu → Đặt lại demo**.

Nút “Hoàn thành chặng” ghi tiến độ trải nghiệm; bạn cũng có thể đi thẳng đến một chặng bằng timeline. Các thao tác xem điểm 3D đều có cách dùng tương đương trong danh sách địa điểm.

## Kiểm thử trình duyệt

```sh
npx playwright install chromium
npm run test:e2e
npm run test:production
```

Playwright tự chạy Vite trên cổng 5173 nếu chưa có server. Kiểm thử dùng Chromium với bộ dựng phần mềm để chạy cả khi môi trường không có GPU. Ảnh chụp lưu trong `test-results/`; trace giữ lại khi có lỗi.

Unit test kiểm tra phân công, chống trùng, ngày hạn/múi giờ, quy tắc chuyển trạng thái, dữ liệu hỏng và tham chiếu tuyến đi. E2E kiểm tra vòng phản hồi nhân viên/HR, lưu phiên, reset, 3D, fallback 2D, mobile, chỉnh sửa bản nháp, điều khiển dialog bằng bàn phím, giảm chuyển động, mất WebGL context và lỗi ghi localStorage. Axe kiểm tra tự động màn hình hành trình ở chế độ 2D; đây không phải chứng nhận khả năng tiếp cận toàn bộ sản phẩm.

`test:production` build lại và chạy kiểm tra nhanh bản production tại cổng 5174, sau đó tự tắt preview server. Cổng này cần còn trống.

## Cấu trúc

```text
src/app/                 Khung app, điều hướng, vai demo, tùy chọn
src/data/                Văn phòng, địa điểm, tuyến, lịch trình và checklist
src/features/simulator/  Scene 3D, bản đồ 2D và hành trình
src/features/onboarding/ Chọn điều kiện tiếp cận
src/features/issues/     Form ghi nhận và tổng kết
src/features/tasks/      Dashboard, phản hồi và lịch sử
src/store/               Trạng thái chung và các action
src/lib/                 Quy tắc nhiệm vụ, ngày giờ và persistence
src/types/               Kiểu TypeScript và schema xác minh dữ liệu
tests/                   Unit và end-to-end
```

Thay dữ liệu văn phòng trong `src/data/office.ts`, lịch trình trong `src/data/journey.ts`, bố cục 3D trong `src/features/simulator/OfficeScene.tsx`. Mặt bằng 2D hiện dựng theo cùng sơ đồ mẫu; khi đổi mặt bằng cần cập nhật cả hai cách hiển thị. Các ảnh JPG gốc trong workspace không bị sửa hoặc dùng làm tài sản của ứng dụng.

## Giới hạn hiện tại

- Đây là văn phòng hư cấu. Thông tin tiếp cận chưa được xác minh thực tế; không dùng kích thước mô hình để kết luận mức đáp ứng.
- Mọi dữ liệu ở trình duyệt hiện tại, theo origin. Dùng `localhost`, `127.0.0.1`, cổng khác hoặc máy khác sẽ tạo vùng dữ liệu riêng.
- Đổi vai là công cụ demo, không phải đăng nhập/phân quyền. Không gửi email, ticket hoặc thông báo đến HR thật.
- Hoàn tất nhiệm vụ nghĩa là nhân viên đã xác nhận phương án trong demo, không phải xác minh cơ sở vật chất thực tế.
- Di chuyển theo tuyến có sẵn; chưa có đi bộ tự do, va chạm vật lý, backend, video hoặc đồng bộ lịch doanh nghiệp.
- localStorage lỗi/không cho phép: phiên tạm vẫn dùng được và hiện thông báo. Nếu dữ liệu cũ bị lỗi, ứng dụng không ghi đè cho đến khi bạn xác nhận reset.
- Bộ dựng 3D được tách thành chunk nhưng vẫn là phần tải lớn nhất. Hiệu năng thực cần kiểm tra thêm trên laptop/điện thoại dùng để trình diễn; chế độ 2D luôn có sẵn.

Kế hoạch và đường nâng cấp pilot: [DAY_ZERO_SIMULATOR_PLAN.txt](DAY_ZERO_SIMULATOR_PLAN.txt).
