# Solar System Explorer — Tài liệu thiết kế

- **Ngày:** 2026-10-29
- **Trạng thái:** Chờ duyệt
- **Người đặt yêu cầu:** Tuan Luu
- **Ký hiệu trong tài liệu:** mục đánh dấu **[Quyết định của AI]** là lựa chọn do Claude đưa ra khi người dùng giao quyền, chưa được người dùng chọn trực tiếp. Mọi mục khác là do người dùng quyết định hoặc đã đồng ý rõ ràng.

---

## 1. Mục đích và lý do

Một web app giúp **bất kỳ ai tò mò về thiên văn** (học sinh, sinh viên, người lớn) **hình dung** được hệ Mặt Trời một cách trực quan, chân thực và ấn tượng. Phần lớn người dùng truy cập bằng **điện thoại**.

Dự án có mục đích thứ hai, quan trọng ngang mục đích đầu: **làm mẫu cho cách setup Claude Code / AI agent** trong một dự án thật, sao cho:

- người dùng hiểu từng phần setup dùng để làm gì;
- bất kỳ AI model nào mở dự án ra đều nắm được bối cảnh, quy ước, vấn đề còn tồn tại, và thêm tính năng mà không phá vỡ cái đã có;
- công việc **tiếp tục được sau khi bị gián đoạn** (gập máy, mất mạng) mà không phải làm lại từ đầu;
- sau khi spec và plan được duyệt, việc triển khai **chạy tự động hoàn toàn**, không cần con người quyết định giữa chừng.

Dự án là **dự án cá nhân, mục đích giáo dục, phi thương mại**.

## 2. Mục tiêu, không-mục-tiêu, phản-mục-tiêu

### Mục tiêu (bản đầu tiên — v1)
1. Mở trang là thấy toàn cảnh hệ Mặt Trời 3D, nền dải Ngân Hà, các hành tinh quay quanh Mặt Trời.
2. Chạm/click vào một thiên thể → camera bay mượt tới gần → bảng thông tin chi tiết hiện ra.
3. Khám phá tự do: xoay, zoom kiểu Google Maps, trên cả chuột và cảm ứng.
4. **Tour Guide** tự dẫn dắt qua các thiên thể, có **giọng thuyết minh** và phụ đề.
5. Song ngữ **Tiếng Việt / English**, có nút chuyển.
6. Âm thanh nền không gian + hiệu ứng "vút" khi bay, có nút bật/tắt.
7. **Mobile-first**: chạy mượt trên điện thoại tầm trung.
8. Bộ setup AI (CLAUDE.md, AGENTS.md, docs, hooks, commands, theo dõi tiến độ) đầy đủ và có giải thích.
9. Sẵn sàng deploy lên GitHub Pages.

### Không-mục-tiêu (không làm trong v1, ghi vào backlog — mục 15)
- Tỉ lệ kích thước/khoảng cách thật của vũ trụ (đã chọn "đẹp, dễ thấy hết").
- Vị trí hành tinh theo ngày giờ thật (ephemeris), thanh trượt thời gian.
- Vệ tinh ngoài Mặt Trăng (Io, Europa, Titan…), sao chổi, tàu vũ trụ.
- Âm thanh "sonification" của NASA cho từng hành tinh.
- Tài khoản người dùng, backend, cơ sở dữ liệu, CMS.
- Ngôn ngữ thứ ba.
- VR/AR.

### Phản-mục-tiêu (nếu xảy ra thì coi như thất bại dù "chạy được")
- Trông giống bài tập đồ hoạ: hành tinh màu trơn, không texture thật, không có ánh sáng/bóng tối.
- Giật, lag hoặc nóng máy trên điện thoại tầm trung; tải quá lâu trên 4G.
- Thuyết minh sai số liệu, chung chung, hoặc lệch khỏi thứ đang hiển thị.
- Âm thanh tự phát làm người dùng giật mình.
- Tour ép người dùng: không thoát được, hoặc chạy lại mỗi lần vào trang.
- AI agent sau này đọc dự án mà không hiểu quy ước, phải đoán, rồi phá vỡ cấu trúc.
- Bị gián đoạn thì phải chạy lại từ đầu.

## 3. Trải nghiệm người dùng

### 3.1 Màn hình toàn cảnh (Overview)
- Nền: dải Ngân Hà thật (skybox/texture bầu trời sao), cảm giác lơ lửng giữa không gian.
- Mặt Trời ở trung tâm, phát sáng (bloom), là nguồn sáng duy nhất của cảnh. Mặt hành tinh quay về phía Mặt Trời sáng, mặt kia tối.
- Các hành tinh quay quanh Mặt Trời theo quỹ đạo và tự quay quanh trục.
- Có vẽ đường quỹ đạo mờ.
- Khi hover (desktop), hoặc luôn luôn với hành tinh nhỏ, hiện nhãn tên để dễ chọn. **[Quyết định của AI]**
- Góc camera mặc định: nhìn chéo từ trên xuống, thấy toàn bộ các quỹ đạo tới Sao Diêm Vương trên màn hình dọc của điện thoại.
- Gợi ý thao tác ở cạnh dưới: "Kéo để xoay · Cuộn/chụm để zoom · Chạm vào hành tinh".

### 3.2 Tỉ lệ hiển thị
Đã chọn **"đẹp, dễ thấy hết"** thay vì tỉ lệ thật. Ràng buộc:
- Giữ đúng **thứ tự** quỹ đạo và **thứ tự kích thước tương đối** giữa các hành tinh.
- Khoảng cách được nén (ví dụ theo hàm log hoặc căn bậc), kích thước được phóng to. Mặt Trời thu nhỏ để không nuốt các quỹ đạo trong.
- Giữ đúng **tỉ lệ chu kỳ quỹ đạo** giữa các hành tinh, nhưng tua nhanh: 1 năm Trái Đất ≈ 60 giây. **[Quyết định của AI]**
- Tự quay: tua chậm lại để dễ nhìn, giữ đúng chiều. Sao Kim và Sao Thiên Vương quay ngược.
- Độ nghiêng trục đúng thực tế (Trái Đất 23,4°, Sao Thiên Vương ~98°…).
- Mọi hằng số tỉ lệ nằm ở **một file cấu hình duy nhất**, không rải rác trong code.
- Trong UI có một dòng nhỏ ghi rõ "Kích thước và khoảng cách không theo tỉ lệ thật" (song ngữ).

### 3.3 Chọn thiên thể và bay camera
- Chạm/click vào thiên thể click được → camera **bay mượt** (có easing, khoảng 1,5–2,5 giây) tới khoảng cách nhìn đẹp, có tính theo bán kính hiển thị của thiên thể.
- Trong lúc xem gần, camera **bám theo** thiên thể (thiên thể vẫn quay quanh Mặt Trời).
- Người dùng kéo để xoay quanh thiên thể, zoom gần/xa trong giới hạn hợp lý (không chui vào trong).
- Thiên thể vẫn tự quay quanh trục khi đang xem gần.
- Nút **"← Quay về toàn cảnh"** bay camera về góc nhìn mặc định.
- Vùng chạm cho thiên thể nhỏ được nới rộng (hitbox lớn hơn hình hiển thị), vì trên điện thoại hành tinh nhỏ rất khó chạm trúng. **[Quyết định của AI]**

### 3.4 Bảng thông tin
- **Desktop / màn hình ngang rộng:** bảng ở **góc trái**, trong suốt mờ (glass), như bản phác thảo đã duyệt.
- **Mobile / màn hình hẹp:** **ngăn kéo dưới đáy** (bottom sheet) chiếm khoảng 50% màn hình, có tay nắm, vuốt lên để mở rộng đọc thêm, vuốt xuống để thu gọn. Thiên thể được đẩy lên nửa trên khung hình.
- Nội dung, theo ngôn ngữ đang chọn:
  - tên;
  - loại (hành tinh đất đá / khí khổng lồ / băng khổng lồ / hành tinh lùn / sao / vệ tinh) và thứ tự tính từ Mặt Trời;
  - số liệu chính: đường kính, khối lượng (so với Trái Đất), khoảng cách trung bình tới Mặt Trời, chu kỳ quỹ đạo, chu kỳ tự quay, nhiệt độ trung bình, số vệ tinh đã biết, trọng lực bề mặt;
  - mô tả ngắn (2–4 câu);
  - 3–5 "sự thật thú vị";
  - nguồn dữ liệu.
- Mặt Trời và Mặt Trăng dùng bộ trường phù hợp với chúng. Trường nào không áp dụng thì ẩn đi, không hiện "N/A".

### 3.5 Thanh điều khiển chung
Luôn hiện, gọn, đặt ở góc trên:
- nút ngôn ngữ **VI / EN**;
- nút loa (bật/tắt toàn bộ âm thanh);
- nút **Tour** (bắt đầu/dừng tour);
- nút "Thông tin/Credits": ghi nguồn texture (bắt buộc theo giấy phép CC BY 4.0), nguồn dữ liệu NASA, giọng đọc tạo bằng TTS.

Các nút có kích thước chạm tối thiểu 44×44 px.

### 3.6 Ngôn ngữ
- Hỗ trợ **vi** và **en**. Mọi chuỗi trong giao diện, dữ liệu thiên thể, phụ đề và file thuyết minh đều có đủ cả hai.
- Ngôn ngữ mặc định lấy theo trình duyệt: bắt đầu bằng `vi` thì dùng tiếng Việt, còn lại dùng tiếng Anh. Lựa chọn của người dùng được lưu trong `localStorage`. **[Quyết định của AI]**
- Đổi ngôn ngữ giữa chừng tour: phụ đề và giọng đọc chuyển sang ngôn ngữ mới, bắt đầu lại đoạn thuyết minh của điểm dừng hiện tại.

### 3.7 Âm thanh
- **Mặc định tắt.** Chỉ phát sau khi người dùng bật nút loa (cũng là thao tác mở khoá âm thanh của trình duyệt).
- Trạng thái bật/tắt được lưu trong `localStorage`. Kể cả khi đã lưu là "bật", âm thanh chỉ bắt đầu sau tương tác đầu tiên của người dùng, do chính sách của trình duyệt.
- **Nhạc nền:** âm thanh không gian trầm, êm, lặp vô hạn, **tạo bằng code** (Web Audio API: oscillator, filter, noise…), không dùng file nhạc.
- **Hiệu ứng "vút":** nhẹ, phát khi camera bắt đầu bay tới thiên thể hoặc về toàn cảnh, cũng tạo bằng code.
- **Thuyết minh:** file mp3 tạo sẵn (mục 3.8). Khi đang thuyết minh, nhạc nền **tự giảm âm lượng** (ducking) rồi tăng lại sau.
- Toàn bộ âm thanh đi qua **Web Audio API** (GainNode), vì Safari trên iOS không cho chỉnh `HTMLAudioElement.volume` bằng code. Có thể dùng `HTMLAudioElement` làm nguồn, nối qua `MediaElementAudioSourceNode`.

### 3.8 Tour Guide
- **Lộ trình (14 đoạn = giới thiệu + 12 điểm dừng thiên thể + kết thúc):**
  1. Giới thiệu (góc toàn cảnh)
  2. Mặt Trời
  3. Sao Thủy
  4. Sao Kim
  5. Trái Đất
  6. Mặt Trăng
  7. Sao Hỏa
  8. Vành đai tiểu hành tinh
  9. Sao Mộc
  10. Sao Thổ
  11. Sao Thiên Vương
  12. Sao Hải Vương
  13. Sao Diêm Vương
  14. Kết thúc (bay về toàn cảnh)

  Mỗi đoạn có một file thuyết minh riêng cho mỗi ngôn ngữ, tổng cộng 14 × 2 = 28 file.
- **Mỗi điểm dừng:**
  - camera bay tới;
  - bảng thông tin mở ra;
  - camera **xoay chậm quanh** thiên thể;
  - thuyết minh phát kèm phụ đề;
  - **thuyết minh xong mới** chuyển sang điểm kế tiếp (nghỉ khoảng 1,5 giây).
- **Khi âm thanh đang tắt:** tour vẫn chạy. Mỗi điểm dừng kéo dài bằng thời lượng file thuyết minh (đã biết trước), phụ đề chạy theo thời gian đó, và hiện gợi ý "🔊 Bật tiếng để nghe thuyết minh".
- **Phụ đề:**
  - hiện theo từng câu, khớp thời gian với giọng đọc;
  - thời điểm từng câu lấy từ dữ liệu ranh giới câu/từ mà Edge TTS trả về khi tạo file;
  - nếu không lấy được dữ liệu đó thì chia theo tỉ lệ số ký tự (phương án dự phòng).
- **Điều khiển tour:** Tạm dừng/Tiếp tục, ← Trước, Tiếp →, ✕ Thoát. Thanh tiến độ "5/14".
- **Người dùng chạm/kéo/zoom vào cảnh 3D** → tour **tạm dừng** (thuyết minh dừng), trả quyền điều khiển, hiện nút "Tiếp tục tour".
- **Tự chạy lần đầu:** lần đầu vào trang (chưa có cờ trong `localStorage`), tour tự bắt đầu sau khoảng 3 giây khi cảnh đã tải xong. Ngay khi bắt đầu thì đặt cờ. Từ lần sau, vào thẳng chế độ tự do, người dùng bấm nút Tour để xem lại.
- **Kịch bản thuyết minh:**
  - mỗi đoạn 20–40 giây, khoảng 60–110 từ tiếng Việt / 50–100 từ tiếng Anh;
  - cụ thể, có số liệu và chuyện thú vị, khớp với thứ đang hiển thị trên màn hình;
  - giọng văn thân thiện, như người dẫn chương trình khoa học;
  - kịch bản tiếng Anh viết tự nhiên theo kiểu tiếng Anh, không dịch máy từng câu.

### 3.9 Màn hình tải
- Hiện màn hình tải có tiến độ (%) trong khi tải texture cơ bản.
- Cảnh chỉ hiện khi có đủ texture tối thiểu, không bao giờ hiện hành tinh trắng trơn.
- Nếu trình duyệt không hỗ trợ WebGL: hiện thông báo song ngữ thân thiện.

## 4. Danh sách thiên thể

| Thiên thể | Click được | Trong tour | Ghi chú |
|---|---|---|---|
| Mặt Trời | ✓ | ✓ | Nguồn sáng, bloom, bề mặt có chuyển động nhẹ (shader hoặc xoay texture) |
| Sao Thủy | ✓ | ✓ | |
| Sao Kim | ✓ | ✓ | Texture bầu khí quyển; quay ngược |
| Trái Đất | ✓ | ✓ | Ngày/đêm (đèn thành phố ở mặt tối), mây, quầng khí quyển |
| Mặt Trăng | ✓ | ✓ | Quay quanh Trái Đất, luôn quay một mặt về Trái Đất |
| Sao Hỏa | ✓ | ✓ | |
| Vành đai tiểu hành tinh | ✗ (không chọn từng viên) | ✓ | Hàng nghìn hạt (InstancedMesh/Points); tour bay tới góc nhìn đẹp của vành đai |
| Sao Mộc | ✓ | ✓ | |
| Sao Thổ | ✓ | ✓ | Vành đai trong suốt có texture alpha, đổ bóng lên vành đai nếu hiệu năng cho phép |
| Sao Thiên Vương | ✓ | ✓ | Nghiêng ~98°, có vành đai mờ (tuỳ chọn) |
| Sao Hải Vương | ✓ | ✓ | |
| Sao Diêm Vương | ✓ | ✓ | Ghi rõ "hành tinh lùn", giải thích vì sao bị phân loại lại năm 2006 |

## 5. Đồ hoạ và độ chân thực

- **Texture:**
  - bộ texture của **Solar System Scope** (https://www.solarsystemscope.com/textures/), giấy phép **CC BY 4.0**, ghi nguồn trong màn hình Credits;
  - Sao Diêm Vương không có trong bộ này: dùng texture từ dữ liệu New Horizons của NASA (phạm vi công cộng), hoặc tự tạo nếu không có bản phù hợp. **[Quyết định của AI]**
- **Hai mức độ phân giải:**
  - `low`: ~1K–2K, cho mobile và lần tải đầu;
  - `high`: 4K, chỉ cho desktop, **chỉ tải khi người dùng bay tới thiên thể đó**.
  - Không dùng texture 8K.
- **Nén:** chuyển texture sang **KTX2 (Basis)** nếu pipeline chạy ổn trên Windows. Nếu không thì dùng **WebP** chất lượng cao. Builder chọn, ghi lý do vào ADR.
- **Nền Ngân Hà:** texture `stars_milky_way` của cùng bộ, map lên sphere/skybox rất lớn.
- **Ánh sáng:** PointLight tại Mặt Trời (không suy giảm theo khoảng cách quá mạnh, để các hành tinh xa vẫn thấy được), cộng một chút ambient rất yếu để mặt tối không đen tuyệt đối.
- **Hậu kỳ:** `UnrealBloomPass` (hoặc thư viện `postprocessing`) cho Mặt Trời. Tắt hoặc giảm trên máy yếu.
- **Hiệu ứng đặc biệt:** quầng khí quyển Trái Đất (Fresnel shader), mây Trái Đất quay độc lập, vành đai Sao Thổ trong suốt, bề mặt Mặt Trời "sống".
- **Màu sắc:** tone mapping ACES Filmic, color space sRGB đúng chuẩn.

## 6. Mobile và hiệu năng

- **Thiết kế mobile trước**, rồi mở rộng cho desktop.
- **Ngưỡng bố cục:**
  - `< 768px` chiều rộng, hoặc màn hình dọc: bố cục mobile (bottom sheet);
  - còn lại: bố cục desktop. **[Quyết định của AI]**
- **Cử chỉ:** một ngón xoay, hai ngón chụm để zoom, chạm để chọn. Chặn cuộn trang và zoom trang của trình duyệt khi thao tác trên canvas.
- **Bậc chất lượng** (`low` / `medium` / `high`):
  - chọn ban đầu theo loại thiết bị và `devicePixelRatio`;
  - giới hạn pixel ratio ≤ 2 (mobile ≤ 1,5 ở mức `low`);
  - **tự hạ một bậc** nếu FPS trung bình < 30 trong 3 giây liên tục.
- **Mục tiêu hiệu năng:**
  - ≥ 30 FPS trên điện thoại tầm trung (tham chiếu: Android tầm trung 2023, iPhone 12);
  - ≥ 55 FPS trên laptop có GPU tích hợp.
- **Ngân sách tải:**
  - lần tải đầu (JS + texture `low` + nền) ≤ **8 MB** khi đã nén;
  - JS bundle ≤ 800 KB (gzip);
  - file thuyết minh tải lười theo từng điểm dừng, mỗi file mp3 ~48 kbps mono.
- **Tiết kiệm pin:** tạm dừng vòng render khi tab bị ẩn (`visibilitychange`).

## 7. Nội dung và dữ liệu

- **Nguồn số liệu:** NASA Planetary Fact Sheet (https://nssdc.gsfc.nasa.gov/planetary/factsheet/). **Nguồn mô tả:** NASA Science (https://science.nasa.gov/solar-system/).
- **Nguồn dữ liệu duy nhất (single source of truth):**
  - `src/data/bodies.ts`: số liệu vật lý, tham số hiển thị, đường dẫn texture;
  - nội dung chữ song ngữ nằm cạnh đó (ví dụ `src/data/content/{vi,en}.ts` hoặc cùng file). Builder chọn cấu trúc, nhưng phải có **một** nơi duy nhất cho mỗi loại dữ liệu.
- **Kịch bản tour:** `src/data/tour/{vi,en}` (hoặc tương đương). Đây là **đầu vào** để tạo file âm thanh.
- **Kiểm tra bằng test:**
  - mọi thiên thể đều đủ trường bắt buộc ở cả hai ngôn ngữ;
  - mọi điểm dừng tour có kịch bản và file âm thanh ở cả hai ngôn ngữ;
  - số liệu khớp với một bảng tham chiếu đã đối chiếu từ NASA Fact Sheet (sai số làm tròn cho phép).
- Văn mô tả do AI viết dựa trên nguồn NASA. Người dùng sẽ **đọc lại sau khi xong**, ghi vào danh sách kiểm tra cuối.

## 8. Giọng thuyết minh (TTS)

- **Công cụ:** **Edge TTS** (gói Python `edge-tts`). Người dùng đã dùng công cụ này trước đây, dự án là cá nhân/giáo dục.
- **Giọng đọc:**
  - tiếng Việt `vi-VN-HoaiMyNeural`;
  - tiếng Anh `en-US-AvaNeural` hoặc một giọng neural tự nhiên tương đương. **[Quyết định của AI]**
- **Script tạo âm thanh:** `scripts/generate-narration.py` (hoặc tương đương), đọc kịch bản rồi xuất:
  - `public/audio/narration/<stop-id>.<lang>.mp3`;
  - file phụ đề có mốc thời gian (`.json` hoặc `.vtt`), lấy từ sự kiện ranh giới câu/từ của Edge TTS;
  - một file manifest chứa thời lượng của từng file.
- **Chỉ tạo lại khi kịch bản thay đổi:** so hash nội dung kịch bản với hash lưu trong manifest.
- **File âm thanh được commit vào repo.** Build và CI **không** gọi Edge TTS, nên trang web không phụ thuộc vào dịch vụ đó lúc chạy hay lúc deploy.
- **Nếu Edge TTS lỗi hoặc không truy cập được khi chạy tự động:**
  - thử lại có backoff (3 lần);
  - nếu vẫn lỗi: ghi vào `docs/KNOWN_ISSUES.md`, đánh dấu task là bị chặn, **tiếp tục các task khác**;
  - tour vẫn chạy được ở chế độ chỉ phụ đề, dùng thời lượng ước tính từ độ dài chữ.
- Ghi chú trong Credits: "Giọng đọc được tạo bằng Microsoft Edge TTS".

## 9. Công nghệ **[Quyết định của AI, người dùng đã đồng ý]**

| Hạng mục | Lựa chọn | Lý do |
|---|---|---|
| 3D | **three.js** | Cộng đồng lớn nhất, nhiều ví dụ hệ Mặt Trời, AI viết code tốt nhất; người dùng cũng gợi ý |
| Ngôn ngữ | **TypeScript** (strict) | Kiểu dữ liệu giúp AI agent sau này hiểu và không làm vỡ code |
| Build | **Vite** | Nhanh, đơn giản, hỗ trợ tốt TS và asset |
| UI | **Vanilla TS + CSS**, không React | Giao diện chỉ có vài bảng; React thêm độ phức tạp không đáng |
| Camera | **`camera-controls`** (yomotsu) | Xoay/zoom/bay mượt kiểu Google Maps, hỗ trợ cảm ứng, có sẵn `setLookAt` có transition |
| Hậu kỳ | `three/examples` EffectComposer + UnrealBloomPass, hoặc `postprocessing` | Bloom cho Mặt Trời |
| Âm thanh | Web Audio API (gốc) | Không cần thư viện; chủ động ducking trên iOS |
| i18n | Module tự viết, gọn (dictionary + `t()`) | Chỉ 2 ngôn ngữ, không cần thư viện |
| Unit test | **Vitest** | Đi cùng Vite |
| E2E / ảnh chụp | **Playwright** (Chromium, giả lập iPhone 13, Pixel 7, desktop 1440×900) | Kiểm tra tự động bố cục mobile, luồng chọn, tour, ngôn ngữ |
| Lint / format | ESLint + Prettier | Giữ code nhất quán giữa các agent |
| TTS | Python + `edge-tts` | Mục 8 |
| Deploy | GitHub Pages qua GitHub Actions | Miễn phí, trang tĩnh |

**Không dùng:** React / React Three Fiber, Babylon.js, CesiumJS, thư viện state management, backend.

**Môi trường phát triển:** Windows 11, Node 24, npm 11, Python 3.14. Mọi script npm phải chạy được trên Windows (không giả định bash-only trong `package.json`).

## 10. Kiến trúc (khung, chi tiết để builder quyết)

Tách module theo trách nhiệm. Gợi ý cấu trúc:

```
src/
  main.ts                 # khởi động
  config/                 # hằng số tỉ lệ, bậc chất lượng, thời gian (MỘT nơi)
  data/                   # bodies, nội dung song ngữ, kịch bản tour
  scene/                  # tạo scene, renderer, ánh sáng, skybox, post-processing
  bodies/                 # tạo mesh cho từng loại thiên thể (hành tinh, Mặt Trời, vành đai, Trái Đất đặc biệt…)
  camera/                 # điều khiển camera, bay tới, bám theo
  interaction/            # raycast chọn thiên thể, hitbox
  ui/                     # bảng thông tin, thanh điều khiển, phụ đề, màn tải, credits
  tour/                   # máy trạng thái tour
  audio/                  # AudioEngine: ambient, whoosh, narration, ducking
  i18n/
  quality/                # phát hiện thiết bị, đo FPS, hạ bậc
  state/                  # trạng thái app (đang chọn gì, ngôn ngữ, mute, tour) + sự kiện
scripts/                  # generate-narration, xử lý texture
public/textures/, public/audio/
tests/unit/, tests/e2e/
```

Nguyên tắc:
- Logic thuần (tính quỹ đạo, tỉ lệ, máy trạng thái tour, i18n, chọn bậc chất lượng) **tách khỏi three.js** để test được bằng Vitest mà không cần WebGL.
- Các module giao tiếp qua một store/event bus nhỏ, không gọi chéo lung tung.
- **Cửa sổ kiểm thử:** khi chạy ở chế độ test (ví dụ `?e2e=1`), app expose `window.__app` với các hàm đọc trạng thái (thiên thể đang chọn, trạng thái tour, ngôn ngữ) và hàm "chọn thiên thể theo id". Playwright dùng hàm này, không phải click mò toạ độ pixel. Ở chế độ test còn có thể tắt tự chạy tour và cho phép tua nhanh thời gian.

## 11. Kiểm thử và tiêu chí hoàn thành

**Mỗi task** trong plan phải có tiêu chí "xong" kiểm tra được bằng máy. **Toàn dự án** coi là xong khi:

1. `npm run lint`, `npm run typecheck`, `npm test` (Vitest), `npm run build` đều pass.
2. `npm run test:e2e` (Playwright) pass trên 3 cấu hình (iPhone 13, Pixel 7, desktop), bao phủ:
   - tải trang, không có lỗi console;
   - chọn từng thiên thể click được → bảng thông tin đúng tên/ngôn ngữ;
   - nút quay về toàn cảnh;
   - đổi ngôn ngữ → toàn bộ chuỗi thay đổi;
   - tour: tự chạy lần đầu, không tự chạy lần hai, tạm dừng khi tương tác, next/prev/thoát;
   - nút loa: trạng thái lưu được;
   - bố cục mobile dùng bottom sheet, desktop dùng bảng trái.
3. **Kiểm tra trực quan:** Playwright chụp ảnh các màn hình chính (toàn cảnh, từng thiên thể, mobile/desktop) vào `docs/screenshots/`. Agent **tự xem ảnh** và đối chiếu với checklist chất lượng hình ảnh:
   - texture hiển thị;
   - có mặt sáng/tối;
   - Mặt Trời phát sáng;
   - Ngân Hà hiện;
   - bảng thông tin không che thiên thể;
   - chữ không tràn.

   Kết quả ghi vào file tiến độ của task (`docs/progress/t<NN>.md`). Ảnh chụp **không** dùng làm visual-regression so pixel, vì render WebGL không ổn định giữa các lần chạy.
4. **Hiệu năng:** **[Quyết định của AI]**
   - Chạy một bài đo bằng Playwright Chromium **có giao diện (headed), dùng GPU thật** của máy Windows, ở viewport mobile với CPU throttling ×4. Trong lúc chạy sẽ có cửa sổ trình duyệt tự bật lên.
   - Nếu không bật được GPU (renderer báo SwiftShader/software): FPS **chỉ ghi lại để tham khảo**, tuyệt đối **không** dùng để hạ chất lượng mặc định, vì đồ hoạ phần mềm không phản ánh điện thoại thật. Việc kiểm tra trên điện thoại thật chuyển vào `HUMAN_REVIEW.md`.
   - Chỉ khi đo bằng GPU thật mà FPS dưới mục tiêu mới được giảm chất lượng mặc định của bậc tương ứng. Không bao giờ giảm xuống dưới mức có đủ texture, ánh sáng và bloom cho Mặt Trời (phản-mục-tiêu ở mục 2).
   - Kiểm tra trên điện thoại thật luôn nằm trong `HUMAN_REVIEW.md`.
   - Đo kích thước tải đầu và bundle so với ngân sách ở mục 6; phần này là kiểm tra pass/fail thật.
   - Ảnh chụp ở mục 3 cũng chụp bằng chế độ có GPU nếu có. Nếu ảnh ra trống thì ghi KNOWN_ISSUES và dựa vào kiểm tra qua `window.__app`.
5. Credits đầy đủ (texture CC BY 4.0, NASA, Edge TTS).
6. Bộ setup AI (mục 12) hoàn chỉnh.

**Những việc máy không kiểm được**, ghi vào `docs/HUMAN_REVIEW.md` để người dùng tự làm sau khi xong:
- nghe thử nhạc nền, tiếng "vút", giọng thuyết minh;
- đọc lại văn bản nội dung;
- thử trên điện thoại thật;
- bật GitHub Pages nếu AI chưa tự bật được (mục 13).

## 12. Setup cho AI agent (Claude Code và các AI khác)

### 12.1 File ngữ cảnh
- **`CLAUDE.md`** (gốc repo), Claude Code tự đọc mỗi phiên:
  - dự án là gì và trỏ tới spec;
  - lệnh chạy/test/build;
  - cấu trúc thư mục;
  - **quy tắc bất biến** (ví dụ: dữ liệu thiên thể chỉ ở `src/data`; hằng số tỉ lệ chỉ ở `src/config`; mọi chuỗi UI phải qua i18n và có đủ vi/en; không thêm framework UI; logic thuần phải có unit test; không gọi TTS trong build/CI);
  - quy trình làm việc;
  - cách làm tiếp sau gián đoạn.

  Ngắn gọn, khoảng dưới 150 dòng, chi tiết thì trỏ tới `docs/`.
- **`AGENTS.md`:** cho các AI tool khác (Codex, Cursor, Copilot…). Giữ **một nguồn**: `CLAUDE.md` import/trỏ tới `AGENTS.md`, hoặc ngược lại, để không phải sửa hai nơi. Builder chọn cách, giải thích trong `docs/ai-setup.md`.
- **CLAUDE.md lồng nhau** (tuỳ chọn) trong các thư mục có quy ước riêng, ví dụ `src/data/CLAUDE.md` mô tả cách thêm một thiên thể.
- **Ngôn ngữ:** `CLAUDE.md`, `AGENTS.md`, comment trong code, tên commit viết bằng **tiếng Anh**, vì ít token và mọi model đều hiểu tốt. Tài liệu giải thích dành cho người dùng (`docs/ai-setup.md`, `docs/HUMAN_REVIEW.md`) viết bằng **tiếng Việt**. **[Quyết định của AI]**

### 12.2 Thư mục `docs/`
- `docs/superpowers/specs/`: tài liệu thiết kế (file này).
- `docs/superpowers/plans/`: plan triển khai dạng checklist. **Đây là danh sách task chính thức** (thay cho Trello, người dùng đã đồng ý).
- `docs/progress/`: nhật ký tiến độ, **mỗi task một file** `t<NN>.md` (trạng thái, tóm tắt, kết quả kiểm tra, `DECISION:`, kết luận review). Mỗi task một file để các task chạy song song không ghi đè lên nhau.
- `docs/decisions/`: ADR (Architecture Decision Records), mỗi quyết định kỹ thuật đáng kể một file ngắn: bối cảnh, quyết định, lý do, hệ quả.
- `docs/KNOWN_ISSUES.md`: vấn đề còn tồn tại, nợ kỹ thuật, task bị chặn.
- `docs/HUMAN_REVIEW.md`: việc người dùng cần tự làm/kiểm tra.
- `docs/ai-setup.md`: **giải thích bằng tiếng Việt** từng phần setup (CLAUDE.md, AGENTS.md, hooks, commands, settings, plan/progress) làm gì, vì sao, cách tự chỉnh. Đây là tài liệu học cho người dùng.

### 12.3 Thư mục `.claude/`
- **`settings.json`** (commit). **Người dùng đã chọn cho phép sẵn mọi thứ cần cho lần chạy tự động, để không có lời hỏi quyền nào giữa chừng.**
  - **Cho phép:**
    - `npm install`, `npm ci`, `npm run *`, `npx playwright install chromium`, `npx playwright test`, `npx vitest`, `npx tsc`, `npx eslint`, `npx prettier`, các CLI xử lý texture mà dự án cài qua npm;
    - tạo/dùng Python venv trong repo (ví dụ `.venv/`), `pip install edge-tts` (và phụ thuộc của nó) vào venv đó, `python scripts/*.py`;
    - git: `init`, `add`, `commit`, `status`, `diff`, `log`, `branch`, `checkout`, `switch`, `stash`, `rev-parse`, `show`;
    - đọc/ghi/sửa mọi file trong repo; Node script trong `scripts/` và `.claude/hooks/`;
    - tải file (WebFetch/curl/Node fetch) **chỉ từ**: `solarsystemscope.com`, `*.nasa.gov`, `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org`, `playwright.azureedge.net` (hoặc host tải trình duyệt của Playwright), và kết nối tới dịch vụ Edge TTS (do gói `edge-tts` tự gọi).
  - **Chặn:**
    - push lên `main`, force-push, xoá branch trên remote, `git remote *`, `git reset --hard`, `git clean -fdx`, `git rebase`, `git branch -D`, `gh repo delete`, merge bằng quyền admin;
    - xoá file ngoài repo, `rm -rf` trên đường dẫn ngoài repo;
    - cài gói toàn cục (`npm install -g`, `pip install` ngoài venv);
    - sửa chính `.claude/settings.json` trong lúc chạy tự động.
  - `docs/ai-setup.md` giải thích từng quyền và cách siết lại sau khi chạy xong.
  - Nếu một lệnh cần thiết vẫn bị hỏi quyền (do cú pháp quy tắc không khớp), ghi vào KNOWN_ISSUES để lần sau sửa. Agent không tự nới quyền.
- **Hooks:**
  - `SessionStart`: in ra tóm tắt trạng thái, gồm plan đang chạy, task chưa xong đầu tiên, 5 file tiến độ gần nhất, các PR đang mở, các worktree, và các vấn đề đang mở. Nhờ vậy mọi phiên mới đều biết đang dở việc gì.
  - Hook kiểm tra nhanh (ví dụ typecheck/lint trên file vừa sửa, hoặc chạy trước khi agent kết thúc lượt). Builder chọn thời điểm sao cho không làm chậm quá mức.
  - Script hook viết bằng **Node** để chạy được trên Windows.
- **Slash commands / skills của dự án:**
  - `/resume-work`: đối chiếu plan, worktree, PR đang mở và kết quả CI; với mỗi task dở thì làm tiếp từ đúng bước (kiểm tra, review, PR, chờ CI, merge); rồi tiếp tục theo kế hoạch đợt.
  - `/add-body`: hướng dẫn từng bước thêm một thiên thể mới (dữ liệu, nội dung song ngữ, texture, kịch bản tour, test).
  - `/status`: báo cáo ngắn tiến độ.

### 12.4 Cơ chế làm tiếp sau gián đoạn
Không cấu hình nào giữ được "suy nghĩ" đang chạy dở của một agent khi máy tắt. Cơ chế đáng tin cậy là **trạng thái bền vững trên đĩa + task nhỏ**:

1. Plan chia thành task nhỏ (5–15 phút). Mỗi task có checkbox trong file plan.
2. Xong task: kiểm tra → review → tick checkbox + ghi `docs/progress/t<NN>.md` → push branch → mở PR → CI pass → AI merge. Commit message theo Conventional Commits kèm mã task, ví dụ `feat(t07): ...`.
3. Khi gián đoạn, tối đa mất phần dở dang của **một** task.
4. Phiên mới: hook `SessionStart` đưa trạng thái vào ngữ cảnh. Người dùng gõ `/resume-work`, hoặc `claude --continue` rồi `/resume-work`.
   - Agent kiểm tra `git status`. Nếu có thay đổi chưa commit thuộc task dở thì đánh giá: hoàn thiện nếu hợp lý, nếu không thì `git stash` rồi làm lại task đó.
   - Sau đó tiếp tục.
5. Cơ chế này hoạt động cho cả chế độ subagent: agent điều phối là bên đọc/ghi plan và file tiến độ, subagent chỉ nhận một task.

### 12.5 Phân bổ model và tiết kiệm token
Nguyên tắc (người dùng đã duyệt): dùng model mạnh nhất ở những chỗ mà sai một ly thì đi cả dặm; dùng model rẻ cho việc lặp lại hoặc có khuôn sẵn.

| Bước | Model |
|---|---|
| Brainstorm, spec | Opus |
| Viết plan | Opus |
| Agent điều phối khi thực thi plan (phiên chính) | Sonnet. Người dùng chọn bằng `/model` trước khi chạy |
| Task khó: shader (khí quyển, Mặt Trời, vành đai), camera bay/bám theo, máy trạng thái tour + đồng bộ giọng đọc/phụ đề, AudioEngine, tối ưu hiệu năng/bậc chất lượng | Opus |
| Task thường: UI, i18n, bảng thông tin, thanh điều khiển, test, cấu hình build, setup AI | Sonnet |
| Task máy móc: tải texture, chạy script TTS, tạo file cấu hình/tài liệu khung, di chuyển file | Haiku |
| Viết kịch bản thuyết minh và nội dung mô tả song ngữ | Opus |
| Review từng task (đúng spec + chất lượng code) | Sonnet |
| Xem ảnh chụp màn hình theo checklist trực quan | Sonnet |
| Review tổng thể cuối cùng | Opus |

Cách thực hiện:
- Mỗi task trong plan ghi rõ `model: haiku | sonnet | opus`. Agent điều phối giao việc đúng theo nhãn này, không tự nâng/hạ model trừ khi task thất bại 2 lần với model được gán; khi đó được nâng một bậc và ghi `DECISION:`.
- `.claude/agents/` định nghĩa sẵn các subagent có gắn model, ví dụ `implementer-light` (haiku), `implementer` (sonnet), `implementer-heavy` (opus), `reviewer` (sonnet), `final-reviewer` (opus).

Quy tắc tiết kiệm token:
- `CLAUDE.md` dưới 150 dòng, vì được nạp mỗi phiên. Chi tiết đặt ở `docs/` và chỉ đọc khi cần.
- Hook `SessionStart` là script Node, chỉ in tóm tắt ngắn (task hiện tại, vài dòng log cuối, vấn đề đang mở), không in nguyên file.
- Subagent chỉ nhận nội dung task của nó cùng các đoạn spec/file liên quan, không nhận toàn bộ spec.
- File tiến độ mỗi task giữ ngắn; hook chỉ đọc vài file gần nhất.

### 12.6 Quy tắc chạy tự động (không cần người quyết giữa chừng)
- Mọi quyết định sản phẩm đã nằm trong spec này.
- Gặp chỗ spec chưa nói rõ: agent **tự chọn phương án hợp lý nhất, phù hợp với tinh thần spec**, ghi vào ADR hoặc file tiến độ của task với nhãn `DECISION:`, rồi **làm tiếp**, **không dừng lại hỏi**.
- Gặp lỗi chặn (dịch vụ ngoài lỗi, công cụ không cài được): thử cách thay thế. Nếu vẫn không được thì ghi `docs/KNOWN_ISSUES.md`, đánh dấu task `[blocked]`, chuyển sang task độc lập tiếp theo.
- **Không** được làm vỡ test đang pass để "cho xong". Không sửa/xoá test để né lỗi.
- **Không** push thẳng lên `main`, không force-push, không merge PR khi CI chưa pass.
- **Mỗi task một branch và một PR** (người dùng yêu cầu):
  - Tên branch: `<type>/t<NN>-<slug>`, trong đó `<type>` theo Conventional Commits (`feat`, `fix`, `chore`, `docs`, `test`, `perf`, `ci`, `refactor`). Commit message theo Conventional Commits kèm mã task.
  - AI push branch, mở PR bằng `gh`, chờ **GitHub Actions CI** (lint, typecheck, unit, e2e) chạy trên PR, rồi **tự merge** (merge commit) khi CI pass. Người dùng đã chọn cách này để giữ chạy tự động hoàn toàn; PR vẫn lưu lại trên GitHub để xem lại sau.
  - CI lỗi quá 2 vòng sửa: PR giữ mở, gắn nhãn `blocked`, ghi KNOWN_ISSUES; task phụ thuộc bị bỏ qua, task độc lập chạy tiếp.
- **Chạy song song theo đợt** (người dùng yêu cầu): các task độc lập (logic thuần, script tài nguyên) chạy song song tối đa 3 agent, mỗi agent trong một git worktree riêng (`.worktrees/`). Các task đồ hoạ/giao diện cùng sửa `main.ts` chạy tuần tự. Danh sách đợt nằm trong plan.

## 13. Deploy
- GitHub Actions workflow: build rồi deploy lên **GitHub Pages**, chạy mỗi khi có commit vào `main` (tức mỗi lần PR được merge). Workflow không gọi TTS. Workflow CI riêng (`ci.yml`) chạy trên mọi PR.
- Vite `base` cấu hình theo tên repo (ví dụ `/solar-system/`), dễ đổi trong một chỗ.
- Repo GitHub đã có sẵn: https://github.com/tuanluu-agilityio/solar-system (remote `origin` đã cấu hình).
- AI thử bật Pages bằng `gh api`. Nếu không được, người dùng tự bật trong Settings → Pages → Source: GitHub Actions (ghi trong `HUMAN_REVIEW.md`). Trang sẽ ở https://tuanluu-agilityio.github.io/solar-system/.
- **Nhánh:** repo hiện ở nhánh `master`, chưa có commit. Builder đổi tên/tạo nhánh `main` làm nhánh chính trước commit đầu tiên, và thêm `.superpowers/` vào `.gitignore`.

## 14. Rủi ro và cách giảm

| Rủi ro | Giảm thiểu |
|---|---|
| Hiệu năng mobile kém | Bậc chất lượng, tự hạ bậc, texture `low`, đo FPS có throttling |
| Edge TTS không truy cập được lúc chạy | Retry, chế độ chỉ phụ đề, ghi KNOWN_ISSUES, file mp3 commit nên chỉ cần tạo một lần |
| Agent không tự "thấy" được đẹp/xấu | Ảnh chụp + checklist trực quan; người dùng xem lại cuối |
| Nội dung sai | Bảng tham chiếu NASA + test số liệu; người dùng đọc lại |
| Texture nặng | Nén KTX2/WebP, tải lười bản `high` |
| Âm thanh trên iOS | Toàn bộ qua Web Audio GainNode, mở khoá bằng tương tác |
| WebGL trong Playwright headless | Dùng Chromium với cờ bật WebGL (SwiftShader/ANGLE); nếu không ổn định thì ghi ADR và test luồng qua `window.__app` |

## 15. Backlog cho tương lai (ghi vào `docs/BACKLOG.md`)
- Âm thanh sonification của NASA cho từng hành tinh (nút nghe trong bảng thông tin).
- Các vệ tinh lớn: Io, Europa, Ganymede, Callisto, Titan, Enceladus, Triton.
- Vị trí hành tinh theo ngày thật + thanh trượt thời gian.
- Chế độ "tỉ lệ thật" để so sánh.
- So sánh kích thước hai hành tinh cạnh nhau.
- Sao chổi, tàu vũ trụ (Voyager, JWST).
- Ngôn ngữ thứ ba.
- PWA / dùng offline.

## 16. Để builder quyết định (ghi lại trong ADR)
- Cấu trúc chính xác của file dữ liệu và nội dung song ngữ.
- Công thức nén khoảng cách/kích thước cụ thể (thoả các ràng buộc ở 3.2).
- KTX2 hay WebP.
- `postprocessing` hay EffectComposer của three.
- Cách giữ một nguồn giữa CLAUDE.md và AGENTS.md.
- Thời điểm chạy hook kiểm tra nhanh.
- Kỹ thuật cụ thể cho bề mặt Mặt Trời, khí quyển, bóng vành đai.
- Thiết kế hình ảnh chi tiết của UI (font, màu nhấn, icon), trong tinh thần: tối, kính mờ, tối giản, chữ dễ đọc trên nền vũ trụ.
