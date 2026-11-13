# ĐINH MÙI: Bàn giao tiến độ (13/11/2026)

Viết để tiếp tục phát triển trên máy khác. Đi kèm [09-ke-hoach-tiep-theo.md](09-ke-hoach-tiep-theo.md) (các giai đoạn A–H) và [08-thiet-ke-choi-truoc-que.md](08-thiet-ke-choi-truoc-que.md).

## 1. Đang ở đâu

Nhánh `feature/chang-ra-ben` (dựa trên `main` = `3bf0f66`). Typecheck sạch, **437 test xanh**, build sạch.

| GĐ (docs/09) | Trạng thái | Ghi chú |
|---|---|---|
| A. Kiểm tra bằng mắt | **Xong** (khổ 360×640) | Sửa 3 lỗi: nhãn khoảng cách mũi tên bị xuống dòng; bảng "Việc cần làm" che bong bóng khi hội thoại; bong bóng đứng một mình tràn mép (`soloSide` trong `speech.ts`). Chưa chụp lại tư thế ngồi và chó Pomeranian sau thay đổi của máy kia |
| B. Chặng "Ra bến" | **Xong** | Bản đồ `ra-ben` (set `pho-tet`). Đã chạy trọn chặng bằng bot trên Chrome headless: mua quà, lấy giỏ, lên xe buýt, sang thẻ "Bước vào nhà" |
| C. Chặng "Đường về" | **Dở**: có cảnh 3D + vùng đi lại, **chưa có nội dung** | Xem mục 3 |
| D. Mâm cơm | Chưa | Có vật liệu ở nhánh `wip/chang-3-6-hanh-trinh` (mục 4) |
| E–H | Chưa | Không đụng tới |

### Đã làm ở nhánh này
- `src/scene3d/walk.ts`: `PHO_TET` (hằng số hình học dùng chung cho hình dựng và va chạm), `phoPots()`, `buildPhoTet()`. Chỉ đi lại trên **vỉa hè bắc** (z từ -3.7 tới -1.7); lòng đường có xe máy chạy chỉ để nhìn, người chơi không vào được (không có cơ chế băng đường ở nền mới).
- `src/scene3d/props-street.tsx`: `GiftStall`, `BusStop`. `sets.tsx` (`PhoTet`) dùng `phoPots()` + hai prop này, vỉa hè hạ thấp còn 5 cm (người đứng ở y = 0).
- `registry.ts`: spot phố Tết (`sap-qua`, `do-qua`, `shipper`, `xe-om`, `ben`, `len-xe`) và trạm dừng (`thai-gara`, `chu-ba`, `quan`, `do-banh-mi`, `xe-khach`, `be-de`).
- `v1.json`: chặng `ra-ben` giữa `cuoi-nam` và `buoc-vao-nha`; nhân vật `co-ban-qua`, `bac-xe-om`; cảnh `rb-mua-qua`, `rb-shipper-hoi`, `rb-xe-om`; bản đồ `ra-ben` (3 NPC, 2 đồ vật, 4 nhiệm vụ, đích `ra-ben-xong`).
- Cảnh 3D **trạm dừng chân** (`set-tram-dung.tsx`, `walk-tram-dung.ts`, `walk-tram-dung.test.ts` 55 ca, `walkKit.ts`) đã đăng ký ở `walk.ts` (`ROAM_SETS`), `sets.tsx` (`SetView`, `envOf`), `registry.ts`. Còn thiếu bản đồ trong `v1.json`.
- Test mới: `walkPhoTet.test.ts` (hình học, loang lưới 10 cm), `soloSide` trong `speech.test.ts`. Test cũ đã cập nhật cho 3 chặng (`content.test.ts`: danh sách chặng, hồ sơ né câu hỏi có `ra-ben: 0`).

### Cân bằng kết thúc (đã đo, 1500 lượt mô phỏng/vai)
Thêm chặng làm lệch phân bố; đã chỉnh số liệu chặng `ra-ben` cho gần trung hòa. Kết quả hiện tại (Hà Nội, né vừa đủ): sinh viên E3 "cháy ví" 34% (trước 26%), độc thân 27+ E7 57% (ngưỡng 60%); né giỏi: E8 sinh viên 56% (ngưỡng 50%). **Ví của sinh viên (30) rất nhạy**: mỗi khoản chi thêm đẩy E3 lên nhiều. Mọi chặng mới phải đo lại bằng `sampleJourney` (`src/content/simulate.ts`) trước khi chốt số.

## 2. Cách chạy và kiểm tra
- `npm run dev`, nhảy thẳng vào bản đồ: `/?roam=ra-ben&persona=sinh-vien&region=ha-noi&fps` (xem README). `roam` là id **bản đồ**.
- `npm test`, `npm run typecheck`, `npm run build`.
- File trong repo dùng **CRLF** (autocrlf). Khi viết script sửa file hàng loạt, phải giữ CRLF.
- Chụp ảnh khổ điện thoại: Chrome headless + CDP, `Emulation.setDeviceMetricsOverride` 360×640. Phím: WASD, `E` tương tác, `A`–`D` chọn đáp án.
- Vùng đi lại là dữ liệu thuần: viết test loang lưới (mẫu: `walkCuoiNam.test.ts`, `walkPhoTet.test.ts`) thay vì tin vào mắt.

## 3. Việc kế tiếp: hoàn tất GĐ C "Đường về" (trạm dừng chân)

Cảnh 3D đã sẵn. Cần làm trong `v1.json` (+ chỉnh test), theo khuôn của `ra-ben`:

1. **Nhân vật** (model CC0 có sẵn trong `public/models`):
   - `chu-ba-triet-ly` ("Chú Ba Triết Lý", livestream khoá học đổi đời; gợi ý model `nam-vest`, áo trắng).
   - `thai-gara` ("Thái Gara 99", nhân vật nhại, `parody: true`, `fallbackId: "anh-ho"`) và `anh-ho` (bản trung tính). Nhân vật nhại chỉ nhận diện qua trang phục/đạo cụ, vai tích cực (docs/04 mục 7).
2. **Cảnh** (viết mới theo schema hiện tại, không có `stageId`/`stage3d`): `dv-triet-ly` (câu chào bán khoá học; lựa chọn "quét mã giữ chỗ" là bẫy: Ví giảm mạnh, gắn thẻ mẹo T06), `dv-thai-gara` (giới thiệu xe cũ; có lựa chọn Thái Gara nói "không uống giọt nào vì còn lái" gắn T05), và một cảnh sự kiện đầu chặng `dv-tren-xe` (Bé Dê: người bên cạnh ngủ gục lên vai bạn, lựa chọn Khéo/Thật thà/Phản đòn, đây là chỗ Sức hao).
   Lời thoại gốc nằm trong nhánh WIP (mục 4): `git show wip/chang-3-6-hanh-trinh:src/content/v1.json`, tìm `roam-thai-gara`, `roam-triet-ly`.
3. **Thẻ mẹo T06** (có nguồn, docs/04 mục 3): "Dịp Tết, kẻ gian dùng link nhận quà, khuyến mãi, "giải hạn" để lừa chuyển tiền. Không bấm link lạ, không chuyển khoản cho người lạ." Nguồn: Bộ Công an (qua Báo Lào Cai). T11–T13 vẫn "CẦN NGUỒN", **không dùng**.
4. **Bản đồ `tram-dung`** (set `tram-dung`): 
   - NPC: `thai-gara` (spot `thai-gara`, đứng), `chu-ba-triet-ly` (spot `chu-ba`, đứng, có `ambush` với câu kiểu "Chuyển khoản giữ chỗ nha!", `hitSceneIds: ["dv-triet-ly"]`).
   - Đồ vật: `banh-mi` (pickup, spot `do-banh-mi`, `effects` Sức +, Ví -2), `xe-khach` (exit, spot `xe-khach`, `requires` đã lấy bánh mì, `lockedLine`).
   - Sự kiện đầu chặng `dv-tren-xe` (kiểm tra validator có cho `when` rỗng; nếu không thì dùng điều kiện luôn đúng như `regions` đủ 3 vùng).
   - Nhiệm vụ: `nghi-chan` (nhặt bánh mì), `gap-anh-ho`, `ne-ma-qr` (né 3), đích `ve-toi-lang`.
5. **Chặng** `duong-ve` giữa `ra-ben` và `buoc-vao-nha` trong `stages`.
6. **Đo cân bằng**: thêm `'tram-dung': 0` vào các hồ sơ `NE_*` trong `content.test.ts`, chạy lại, chỉnh số (đặc biệt chi phí bẫy QR) cho tới khi các ngưỡng test đều đạt. Bẫy QR (-20 Ví) gần như chắc chắn làm sinh viên "cháy ví" quá nhiều: hạ mức hoặc đổi sang chi Sức/Hòa khí.
7. Chạy bot trên trình duyệt (mẫu ở mục 2) để chắc chặng hoàn thành được; cập nhật `docs/09`, README (danh sách `roam`).

Chi tiết cảnh 3D trạm dừng đã được kiểm: vật cản 38 cái, quầy sâu 0.6 m (người chơi đứng được từ z ≥ 3.65 phía nam quầy), xe khách tâm z = 1.4, spawn (-1, 7). `set-tram-dung.tsx` đọc hằng số từ `walk-tram-dung.ts` nên hình và va chạm không lệch.

## 4. Vật liệu ở nhánh `wip/chang-3-6-hanh-trinh`

Nhánh này dựa trên cơ sở **cũ** (trước refactor 3D-only), **không merge được thẳng**; dùng để tham khảo và chuyển (port) từng phần. Đã qua một vòng review độc lập. Có:
- **Ống kính livestream** (`src/game/lens.ts`, test): Bà Tám đi theo và giơ điện thoại, nón nhìn 24°, đứng yên ~2 s thì bị quay; hiệu chỉnh bằng mô phỏng (`turnRate` 0.35). Bài học: NPC xoay quá nhanh thì không né được bằng cách đi ngang.
- **Dòng xe máy** (`traffic.ts`): vị trí xe là hàm của thời gian dùng chung cho hình và va chạm; có số liệu cho độ khó băng đường. Nền mới chưa có cơ chế này (xe chỉ để nhìn).
- **Mời đồ ăn** (trạm `pickup` + `serve` trên NPC), **trạm/vùng kích hoạt**, **`JourneyScreen` + `carryOver`** (trút cờ riêng của chặng khi sang chặng sau; nếu không, cờ như `talked:be-de` rò sang chặng sau làm nhiệm vụ tự hoàn thành. Nền mới đã gắn id bản đồ vào tên cờ nên có thể không còn cần).
- Nội dung bản đồ `mam-com` (mâm cơm gắp mời, Duy Đèn Cầy, Ông, Bin) và các cảnh kèm theo: nguyên liệu cho **GĐ D**.
Các bài học nội dung từ review: tên nhân vật nhại không được gõ cứng trong tiêu đề nhiệm vụ/nút (kill-switch phải tắt sạch tên); không ghi tên nền tảng thật (TikTok...); không gắn thẻ mẹo vào cảnh không liên quan; cờ nội dung `quest:` trong điều kiện `requires` hợp lệ.

## 5. Việc cần chủ dự án quyết (còn mở)
1. `docs/03-cameo.md` (và dòng liên quan ở `docs/02-plan.md`) **đã công khai trên GitHub** và ghi họ tên thật của những người gắn với vụ án, ghép với tên nhại trong game. Có gỡ khỏi bản công khai và có viết lại lịch sử không: quyết định pháp lý/uy tín của chủ dự án.
2. Host registry nội bộ vẫn nằm trong lịch sử git (commit `d344bf9`). `package-lock.json` hiện đã sạch; test `src/repo.test.ts` (chỉ có ở nhánh WIP cũ) từng canh việc này, nên **thêm lại** khi gộp. Máy có `.npmrc` trỏ registry nội bộ thì mỗi lần `npm install` có thể ghi lại URL riêng vào lockfile.
3. Các câu hỏi ở docs/09 mục 3 (E1, nguồn nhạc, thiết bị tối thiểu).
4. Trước khi gộp vào `main`: chạy skill `security-audit`.
