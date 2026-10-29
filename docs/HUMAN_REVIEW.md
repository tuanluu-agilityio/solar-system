# Việc cần người kiểm tra

Agent không nghe được âm thanh, không cầm điện thoại thật và không phán xét được "đẹp". Hãy đi qua danh sách này và đánh dấu `[x]` khi xong.

## 1. Âm thanh

- [ ] Nghe âm nền (ambient): nhẹ, không gây khó chịu, lặp không giật.
- [ ] Nghe tiếng whoosh khi bay giữa các hành tinh: không quá to, không bị cắt.
- [ ] Nghe đủ 28 file giọng đọc trong `public/audio/narration/` (14 điểm dừng x 2 ngôn ngữ; giọng vi `vi-VN-HoaiMyNeural`, en `en-US-AvaNeural`): phát âm tên riêng, con số, nhịp đọc, không bị cụt đuôi.
- [ ] Phụ đề khớp với giọng đọc khi chạy Tour Guide ở cả hai ngôn ngữ.

## 2. Đọc lại nội dung

- [ ] Mô tả và sự thật (facts) tiếng Việt và tiếng Anh: `src/data/content/vi.ts`, `src/data/content/en.ts`. Số liệu vật lý ở `src/data/bodies.ts`; đối chiếu NASA nếu nghi ngờ.
- [ ] Kịch bản thuyết minh: `src/data/tour/vi.json`, `src/data/tour/en.json`. Sửa chữ thì chạy lại `npm run narration` (cần mạng và `.venv`): chỉ đoạn đổi mới được sinh lại; commit mp3 và `manifest.json`.
- [ ] Lời từ chối "kích thước và khoảng cách không theo tỉ lệ" và phần Credits (Solar System Scope CC BY 4.0, NASA, Edge TTS) hiện đúng ở cả hai ngôn ngữ.

## 3. Điện thoại thật (iOS và Android)

- [ ] Đo FPS trên máy tầm trung thật (Android 2023, iPhone 12): tổng quan và khi focus Sao Thổ cần giữ ít nhất 30 FPS; dòng log `[quality]` trong console không được hạ bậc liên tục. Lần đo tự động (Task 29) chạy trên Chromium desktop giả lập Pixel 7 với throttle CPU x4, GPU là Intel Arc chứ không phải GPU điện thoại (xem `docs/decisions/0005-performance-results.md`).
- [ ] Cảm ứng: kéo để xoay, chụm để zoom, chạm hành tinh để bay tới; chạm vào cảnh khi Tour đang chạy sẽ tạm dừng tour.
- [ ] Bottom sheet thông tin: kéo, mở rộng, thu gọn mượt; nút đủ lớn (từ 44x44 px); khi tour chạy không che hành tinh (xem `docs/screenshots/iphone13-tour-subtitle.png`).
- [ ] Âm thanh trên iOS: mặc định tắt tiếng, chạm để bật; có tiếng trên Safari thật.
- [ ] Xoay ngang/dọc; thanh địa chỉ của trình duyệt không làm vỡ bố cục.

## 4. Hiệu năng desktop

- [ ] Đo lại FPS trên laptop rảnh (cắm điện, không chạy gì khác): `npm run test:perf -- --project=desktop`. Task 29 đo bậc `high` khoảng 50-54 FPS ở tổng quan trên Intel Arc iGPU, 1440x900, dao động lớn giữa các lần chạy (xem `docs/KNOWN_ISSUES.md`). Nếu xác nhận dưới 55 FPS, hạ `bloomResolutionScale` của bậc `high` xuống 0.75 trong `src/quality/tiers.ts` trước tiên. Kết quả ghi ở `docs/perf-results.json`.

## 5. Xem ảnh chụp

- [ ] Xem `docs/screenshots/` (desktop và iPhone 13: tổng quan, Mặt Trời, Trái Đất, Sao Mộc, Sao Thổ, Sao Diêm Vương, sheet mở rộng, phụ đề tour, credits, bản tiếng Việt): bố cục, màu, nhãn, độ đẹp. Chụp lại bằng `npm run test:visual`.
- [ ] Các điểm hình ảnh còn mở: Sao Diêm Vương dùng texture sinh bằng thuật toán, chưa phải bản đồ New Horizons (có trong `docs/BACKLOG.md`); dải Ngân Hà chỉnh tông bằng shader, xem đã đủ rõ chưa; nhãn trong tổng quan đã tránh chồng lấn nhưng nhãn gần ngưỡng có thể nhấp nháy (mục trong BACKLOG).

## 6. KNOWN_ISSUES

- [ ] Đọc `docs/KNOWN_ISSUES.md`. Mục có `(resolved)` đã xong; mục chưa resolved hiện còn một (FPS tổng quan bậc `high` trên desktop, xem mục 4). Quyết định sửa hay chấp nhận.

## 7. Deploy

Mọi task đã merge qua PR nên `main` trên GitHub đã cập nhật. Workflow `.github/workflows/deploy.yml` tự deploy lên GitHub Pages sau mỗi lần merge vào `main`. Trang: https://tuanluu-agilityio.github.io/solar-system/

- [ ] Mở trang trên điện thoại và máy tính: texture tải được, có âm thanh, đổi được ngôn ngữ.
- Pages đã được bật (Source: GitHub Actions). Nếu bị tắt: Settings, Pages, Source: GitHub Actions, rồi chạy lại workflow "Deploy to GitHub Pages" ở tab Actions.
- [ ] Tuỳ chọn: bảo vệ `main` (Settings, Branches, thêm rule cho `main`): bắt buộc PR và bắt buộc check CI `verify` pass trước khi merge. Làm sau khi lần chạy tự động kết thúc.

## 8. Đọc lịch sử

- Trên GitHub: tab Pull requests, mỗi task một PR (kèm kết quả CI).
- Trên máy: `git log --first-parent main --oneline` cho mỗi task một dòng (merge commit).
- Chi tiết từng task: `docs/progress/t<NN>.md`; quyết định kỹ thuật: `docs/decisions/`.

## 9. Tuỳ chọn: siết `.claude/settings.json`

- [ ] Sau khi xong, bỏ bớt quyền không còn cần (ví dụ `git push`, `gh pr merge`, `pip install`, `WebFetch`). Chi tiết từng quyền: `docs/ai-setup.md` mục 3. Thêm tính năng mới sau này: `docs/ai-setup.md` mục 10 và `docs/BACKLOG.md`.
