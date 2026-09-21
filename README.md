# Day Zero — Workplace Simulator

Trải nghiệm văn phòng như một trò chơi khám phá. Bản demo ưu tiên người dùng xe lăn: thiết lập kích thước xe trước khi vào map, tự di chuyển, gặp đồng nghiệp và nhấn **F** để tìm hiểu người hoặc đồ vật ở gần. Map phủ toàn bộ trang, có góc nhìn thứ nhất / thứ ba, toàn cảnh và chế độ toàn màn hình thật.

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
2. Bấm **Bắt đầu trải nghiệm** để vào map: chuột tự ẩn, di chuột là xoay góc nhìn, không cần giữ nút. Khi quay lại, số đo cũ được điền sẵn; xác nhận **Vào văn phòng** rồi map mới tải. Đóng bảng thiết lập không bỏ qua bước này.
3. Di chuyển đến gần một đồ vật. Khi gợi ý xuất hiện, nhấn **F** hoặc bấm nút tương tác để mở thông tin.
4. Với cửa, bấm **Mở cửa** trong bảng thông tin, đóng bảng rồi tự điều khiển xe đi qua.
5. Ghi nhận điều cần xác minh tại chính đồ vật đó. Mở **Menu → Tổng kết trải nghiệm** để tạo nhiệm vụ chuẩn bị. **Nhật ký / J** chứa lịch trình, danh mục đồ vật và đồng nghiệp.

| Điều khiển | Hành động |
| --- | --- |
| W / ↑ | Tiến về phía trước theo hướng nhìn |
| S / ↓ | Lùi lại, giữ hướng nhìn |
| A / ← | Di chuyển ngang sang trái |
| D / → | Di chuyển ngang sang phải |
| Q / E | Xoay xe tại chỗ trái / phải |
| Giữ Shift | Di chuyển chậm để căn qua cửa |
| F | Tương tác đồ vật ở gần, trong khoảng 1,35 m từ tâm nhân vật đến bề mặt |
| V | Chuyển qua lại góc nhìn thứ nhất / thứ ba |
| J | Mở nhật ký, lịch trình và danh mục đối tượng |
| N | Chọn điểm đến; hiện vạch đường hoặc tự đi |
| P | Bắt đầu / dừng tự đi tới điểm đã chọn |
| H | Bật / tắt giọng hướng dẫn theo ngôn ngữ đã chọn |
| Enter | Khóa lại chuột sau Esc hoặc khi trình duyệt chặn khóa tự động |
| Escape | Đóng bảng thông tin hoặc trả chuột cho trình duyệt; có thể thoát toàn màn hình tùy trình duyệt |
| Di chuột / vuốt trên cảnh 3D | Quay hướng xe, nhìn lên/xuống; kéo chuột là phương án dự phòng khi không khóa được |
| Nút tâm ngắm | Chuyển giữa góc nhìn thứ nhất và toàn cảnh |
| Đặt lại góc nhìn | Nhìn ngang trở lại; giữ vị trí và hướng xe |
| Nút Toàn màn hình | Dùng toàn màn hình trình duyệt, khóa và ẩn chuột trên máy dùng chuột |
| Di chuột khi đã khóa | Nhìn quanh mà không cần giữ nút chuột |

Mặc định mở **góc nhìn thứ nhất**. Camera đặt tại tâm xe, cao bằng mặt ngồi + 65 cm (giả định minh họa, không phải số đo cơ thể cá nhân); nhân vật đi bộ dùng tầm mắt 1,60 m. Không có rung/lắc đầu hoặc zoom khi di chuyển. Di chuột ngang hoặc Q/E quay cả xe và camera, vẫn xét va chạm khi xoay; di chuột dọc nhìn lên/xuống. WASD tính theo hướng nhìn, A/D đi ngang và S lùi không tự quay camera. Đây là điều khiển khám phá bằng dấu chiếm chỗ hình chữ nhật, không mô phỏng cơ học bánh xe hoặc sức đẩy. Trong toàn cảnh/2D, WASD vẫn di chuyển theo màn hình như trước. Cuộn chuột chỉ phóng to ở toàn cảnh.

**Góc nhìn thứ ba** bám sau xe, thấy được nhân vật và kích thước xe. Camera thu gần nếu tường hoặc đồ vật chắn đường nhìn; không đổi vị trí xe khi nhấn V. Cả hai góc nhìn dùng chung WASD/F, va chạm và hướng xe. V không hoạt động khi nhập liệu hoặc mở dialog.

Toàn màn hình dùng Fullscreen API; map chiếm 100% chiều rộng/cao, không có viền trang hay sidebar. Pointer Lock tự kích hoạt từ thao tác vào map, ẩn con trỏ và nhận chuyển động chuột liên tục ngay cả khi chưa toàn màn hình. Mở hồ sơ/Menu/Nhật ký sẽ trả chuột để thao tác; bấm nút đóng/tiếp tục trong bảng sẽ thử khóa lại. Esc trả chuột và không tự khóa lại ngoài ý muốn; Enter tiếp tục chơi. Nếu trình duyệt chặn API, hiện thông báo và vẫn dùng map phủ trang, kéo chuột hoặc cảm ứng. Trên màn hình cảm ứng không yêu cầu khóa chuột. Trình tự gọi API và yêu cầu tương tác người dùng tham chiếu [Pointer Lock 2.0](https://www.w3.org/TR/pointerlock-2/).

## Dẫn đường và giọng nói

Nhấn **N**, chọn đồ vật/đồng nghiệp rồi chọn **Hiện đường đi** hoặc **Tự đi đến đây**. Đường vàng xuất hiện trực tiếp trên sàn 3D và bản đồ 2D, có khoảng cách còn lại. **P** bật/dừng tự đi tới điểm đã chọn; WASD/mũi tên/Q/E hoặc F cũng dừng tự đi để trả quyền điều khiển. Mở dialog/rời tab tạm dừng di chuyển.

Đường được tìm bằng A* trên lưới 25 cm, có trạng thái hướng xe và 8 hướng di chuyển. Các đoạn được nối thẳng khi đủ chỗ, kể cả đường chéo, thay cho zigzag theo trục. Xe xoay theo hướng đoạn đường rồi tiến; camera thứ nhất/thứ ba cùng bám hướng xe, chuyển động chuột ngang không bẻ hướng trong lúc tự đi. Mọi đoạn đi và xoay đều kiểm tra vùng chiếm chỗ xe; đây vẫn là hỗ trợ khám phá, chưa mô phỏng động học xe lăn thật. Đường dự tính trạng thái cửa mở; tự đi chỉ mở cửa khi đến gần và cung quét không vướng xe/người. Đến trong tầm F thì dừng. Nếu gặp vật cản động, xe chờ; có thể tự điều khiển hoặc chọn đường lại. Xe quá rộng/không đủ chỗ căn hướng sẽ báo chưa tìm được đường, không đi xuyên khung. Đường đến đồng nghiệp đi lại lấy vị trí lúc chọn; nếu họ đã rời vị trí, chọn dẫn đường lại.

Chọn **Tiếng Việt / English** ở màn thiết lập hoặc thanh công cụ trong map (nhấn Esc để hiện chuột). Lựa chọn được lưu khi tải lại trang. Giao diện, hướng dẫn, phụ đề, tên phòng và thông tin đối tượng đổi theo ngôn ngữ; tên riêng và nội dung người dùng nhập được giữ nguyên.

Giọng hướng dẫn dùng Web Speech API, chọn giọng `vi-VN` hoặc `en-US` theo ngôn ngữ. Đọc mục tiêu, bắt đầu/chờ/dừng/đến nơi; **phụ đề luôn ở phía dưới màn hình**, kể cả khi tắt tiếng bằng H. Có nút **Nghe lại**. Không dùng microphone. Chất lượng giọng phụ thuộc giọng cài trên máy; thiếu giọng hoặc lỗi phát sẽ hiện thông báo, phụ đề và đường vàng vẫn hoạt động. Hủy hàng đợi cũ khi đổi ngôn ngữ/chỉ dẫn, tắt giọng hoặc rời trang.

## Gặp đồng nghiệp

**J → Nhật ký** có ba mục riêng: **Lịch trình**, **Đồ vật** (22 đối tượng) và **Đồng nghiệp** (7 người). Chọn người ở xa không mở hồ sơ từ xa; cần đến trong tầm tương tác.

Trong hồ sơ đồng nghiệp, chọn **Gửi thư**, nhập lời nhắn (1–1500 ký tự) rồi **Gửi lời nhắn**. Lịch sử riêng theo từng người và được lưu cùng phiên trên trình duyệt. **Chưa gửi email hoặc chuyển tin tới người thật**; muốn gửi thật cần bổ sung backend. Xuất báo cáo chứa cả lời nhắn; đặt lại demo xóa chúng.

Có **7 nhân vật mẫu**: Mai Linh (HR), Đức Minh (buddy), Hoài An (Facilities) và 4 người đi lại là Quang Huy, Thanh Thảo, Hải Nam, Bảo Yến. Người đi bộ theo tuyến trong khu vực, có cử động tay/chân, dừng khi bạn đến gần và khi mở dialog. Mô hình, va chạm, vị trí F, hồ sơ và bản đồ 2D cùng lấy vị trí hiện tại; không dùng tọa độ cũ để tương tác. Đến gần rồi nhấn F xem chân dung minh họa, vai trò, đội nhóm, lời giới thiệu và nội dung hỗ trợ. Hình chân dung SVG được tạo cục bộ; đây là người giả lập, chưa có hội thoại AI.

Nút mũi tên trên màn hình dùng được bằng chạm/chuột, hoặc giữ Enter/Space khi nút có focus. Bàn phím không điều khiển xe khi đang nhập liệu, mở dialog hoặc rời khỏi vùng trò chơi. Chọn chặng chỉ thay đổi mục tiêu; tự đi được bật riêng bằng N/P. **Về lối vào** đặt lại vị trí và hủy đường hiện tại.

## Không gian và tỷ lệ

- Một mặt bằng liên tục rộng **24 m × 20,5 m** gồm sảnh ngoài, mở rộng từ 18 m × 16,5 m. Các phòng, hành lang và khoảng trống rộng hơn; bàn ghế và xe giữ nguyên kích thước mét.
- **1 đơn vị 3D = 1 mét**. Ô lưới là 1 m. Cùng một hệ tỷ lệ cho xe, cửa, bàn, ghế và dụng cụ.
- 22 đồ vật có thông tin sử dụng và 7 đồng nghiệp có hồ sơ, tổng cộng 29 điểm khám phá. Khung cửa, tường, bàn ghế, máy nước, máy in, đồ dùng và người có va chạm.
- Xe thay đổi chiều rộng/dài thực theo số đo nhập; không chỉ đổi nhãn. Hướng quay của xe được xét trong kiểm tra va chạm.
- Cửa phải mở trước khi đi qua. Quá trình kiểm tra mở/đóng xét toàn bộ cung quét để tránh cánh cửa xuyên người.
- Cửa tăng rộng 20 cm: lối vào **146 cm**, khu làm việc **104 cm**, Lotus **105 cm**, nhà vệ sinh **96 cm**. Khung/tường và bảng thông tin cùng cập nhật. Xe rộng 105 cm bị chặn ở cửa 96 cm. Mỗi cửa có biển tên phòng ở cả hai phía phía trên khung.
- Hình minh họa đồ vật, mô hình 3D và dữ liệu va chạm dùng chung `objectParts()`. Hình chi tiết phóng to để đọc; vật trong văn phòng luôn giữ tỷ lệ mét.
- Góc nhìn thứ nhất/thứ ba có tường kín. Góc thứ nhất ẩn cơ thể; góc thứ ba hiện nhân vật (tạm ẩn nếu camera phải thu quá sát). Trong toàn cảnh, phần trên tường trong suốt để quan sát nhân vật; va chạm giữ nguyên.
- Nhấn F hoặc nút tương tác để mở thông tin; kéo nhìn không tự mở đối tượng.
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
- `src/data/colleagues.ts`: 7 hồ sơ nhân vật mẫu, tuyến đi lại, màu mô hình và thông tin hỗ trợ.
- `src/lib/navigation.ts`: tìm đường có hướng xe, đi chéo và rút gọn các đoạn an toàn.
- `src/lib/npcMotion.ts`: cập nhật người đi bộ, nhường xe và kiểm tra vật cản.
- `src/features/simulator/useVoiceGuide.ts`: giọng Việt/Anh, phụ đề, hủy hàng đợi và thông báo lỗi.
- `src/lib/i18n.ts`, `src/data/objectEnglish.ts`: bản dịch giao diện và hướng dẫn đồ vật; hình học dùng chung.
- `src/features/simulator/ColleagueInspector.tsx`: hồ sơ đồng nghiệp và chân dung minh họa cục bộ.
- `src/features/simulator/useGameDisplay.ts`: đồng bộ Fullscreen / Pointer Lock, xử lý lỗi trình duyệt.
- `src/styles/game.css`: map phủ màn hình, HUD, nhật ký/menu và màn thiết lập trước khi chơi.
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
