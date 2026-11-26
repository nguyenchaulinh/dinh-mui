# ĐINH MÙI: Bàn giao tiến độ (13/11/2026)

Viết để tiếp tục phát triển trên máy khác. Đi kèm [09-ke-hoach-tiep-theo.md](09-ke-hoach-tiep-theo.md) (các giai đoạn A–H) và [08-thiet-ke-choi-truoc-que.md](08-thiet-ke-choi-truoc-que.md).

## 1. Đang ở đâu

Cập nhật 13/11/2026 (sau khi PR #4 `feature/chang-ra-ben` vào `main`; GĐ C làm ở nhánh `feature/duong-ve`). Typecheck sạch, **442 test xanh**, build sạch.

| GĐ (docs/09) | Trạng thái | Ghi chú |
|---|---|---|
| A. Kiểm tra bằng mắt | **Xong** (khổ 360×640) | Sửa 3 lỗi: nhãn khoảng cách mũi tên bị xuống dòng; bảng "Việc cần làm" che bong bóng khi hội thoại; bong bóng đứng một mình tràn mép (`soloSide` trong `speech.ts`). Chưa chụp lại tư thế ngồi và chó Pomeranian sau thay đổi của máy kia |
| B. Chặng "Ra bến" | **Xong** | Bản đồ `ra-ben` (set `pho-tet`). Đã chạy trọn chặng bằng bot trên Chrome headless: mua quà, lấy giỏ, lên xe buýt, sang thẻ "Bước vào nhà" |
| C. Chặng "Đường về" | **Xong về nội dung** (nhánh `feature/duong-ve`) | Bản đồ `tram-dung` + chặng `duong-ve` giữa `ra-ben` và `buoc-vao-nha`; xem mục 3. **Chưa chạy bằng bot trên trình duyệt** |
| D. Mâm cơm | **Kế tiếp** | Có vật liệu ở nhánh `wip/chang-3-6-hanh-trinh` (mục 4); cần viết tài liệu thiết kế trước (docs/09 mục 4) |
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

## 3. GĐ C "Đường về": đã làm và còn lại

**Đã làm** (`v1.json`, theo khuôn của `ra-ben`):
- Nhân vật `chu-ba-triet-ly` (model `nam-vest`, áo trắng), `thai-gara` (nhại, `fallbackId: anh-ho`, model `nam-tho`, áo xanh ngọc, mũ) và `anh-ho` (bản trung tính).
- Cảnh `dv-tren-xe` (sự kiện đầu chặng, Bé Dê: người bên cạnh ngủ gục lên vai, Sức hao), `dv-thai-gara` (thẻ T05 ở lựa chọn "ly bia"), `dv-triet-ly` (bẫy "quét mã giữ chỗ", thẻ T06).
- Thẻ mẹo T06 (nguồn Bộ Công an qua Báo Lào Cai). T11–T13 vẫn "CẦN NGUỒN", không dùng.
- Bản đồ `tram-dung` (set `tram-dung`): NPC `thai-gara` (đứng), `chu-ba-triet-ly` (đứng, bắn câu hỏi, bị bắt thì vào `dv-triet-ly`); đồ vật `banh-mi` (nhặt, Sức +4, Ví -1) và `xe-khach` (cửa ra, chỉ mở khi đã lấy bánh mì); sự kiện `tren-xe` (điều kiện `regions` đủ 3 vùng vì validator không cho `when` rỗng); nhiệm vụ `nghi-chan`, `gap-anh-ho` (thưởng Ví +4: anh họ mừng phong bì), `ne-ma-qr` (né 3), đích `ve-toi-lang`.
- Chặng `duong-ve` giữa `ra-ben` và `buoc-vao-nha`; `content.test.ts` thêm `'tram-dung': 0` vào các hồ sơ né.
- Test mới `walkTramDungMap.test.ts`: mọi NPC / đồ vật có chỗ đứng với tới được từ chỗ xuất phát, chú Ba nằm trong tầm bắn câu hỏi.

**Cân bằng:** bản đầu (bẫy QR -8 Ví, bánh mì -2 Ví) đẩy sinh viên E3 lên 54% và E8 xuống 35% (test đòi trên 50%). Giảm bẫy QR còn -5 Ví, bánh mì -1 Ví, thêm phong bì +4 Ví từ anh họ, bớt Hòa khí ở vài lựa chọn nhỏ để E7 của độc thân 27+ không vượt 60%. Kết quả ổn định qua 3 hạt giống (7, 11, 23).

**Còn lại:**
1. Chạy bot trên trình duyệt (mục 2) để chắc chặng hoàn thành được và xem bằng mắt cảnh trạm dừng; chụp ảnh khổ điện thoại.
2. Hai lựa chọn "Lầy" của anh họ phải tốn gì đó (test `Lầy không còn là lựa chọn miễn phí`): đã gắn Ví -2 và Sức -2.
3. Nếu thêm / đổi số liệu chặng này: đo lại bằng `sampleJourney` trước khi chốt.

## 4. Vật liệu ở nhánh `wip/chang-3-6-hanh-trinh`

Nhánh này dựa trên cơ sở **cũ** (trước refactor 3D-only), **không merge được thẳng**; dùng để tham khảo và chuyển (port) từng phần. Đã qua một vòng review độc lập. Có:
- **Ống kính livestream** (`src/game/lens.ts`, test): Bà Tám đi theo và giơ điện thoại, nón nhìn 24°, đứng yên ~2 s thì bị quay; hiệu chỉnh bằng mô phỏng (`turnRate` 0.35). Bài học: NPC xoay quá nhanh thì không né được bằng cách đi ngang.
- **Dòng xe máy** (`traffic.ts`): vị trí xe là hàm của thời gian dùng chung cho hình và va chạm; có số liệu cho độ khó băng đường. Nền mới chưa có cơ chế này (xe chỉ để nhìn).
- **Mời đồ ăn** (trạm `pickup` + `serve` trên NPC), **trạm/vùng kích hoạt**, **`JourneyScreen` + `carryOver`** (trút cờ riêng của chặng khi sang chặng sau; nếu không, cờ như `talked:be-de` rò sang chặng sau làm nhiệm vụ tự hoàn thành. Nền mới đã gắn id bản đồ vào tên cờ nên có thể không còn cần).
- Nội dung bản đồ `mam-com` (mâm cơm gắp mời, Duy Đèn Cầy, Ông, Bin) và các cảnh kèm theo: nguyên liệu cho **GĐ D**.
Các bài học nội dung từ review: tên nhân vật nhại không được gõ cứng trong tiêu đề nhiệm vụ/nút (kill-switch phải tắt sạch tên); không ghi tên nền tảng thật (TikTok...); không gắn thẻ mẹo vào cảnh không liên quan; cờ nội dung `quest:` trong điều kiện `requires` hợp lệ.

## 5. Việc cần chủ dự án quyết (còn mở)
1. `docs/03-cameo.md` (và dòng liên quan ở `docs/02-plan.md`) **đã công khai trên GitHub** và ghi họ tên thật của những người gắn với vụ án, ghép với tên nhại trong game. Có gỡ khỏi bản công khai và có viết lại lịch sử không: quyết định pháp lý/uy tín của chủ dự án.
2. Host registry nội bộ từng nằm trong lịch sử git công khai (5 commit đầu, chỉ ở `package-lock.json`). **26/11/2026:** đã viết lại lịch sử (`git filter-branch`, đổi URL sang registry công khai; chỉ 5 commit đổi nội dung, đầu mọi nhánh giữ nguyên cây file) và force-push mọi nhánh; mọi hash commit trước đây đã đổi, nên bản clone cũ phải clone lại. **Còn lại:** các ref `refs/pull/1..7/head` trên GitHub vẫn trỏ về commit cũ (kiểm bằng `git ls-remote origin 'refs/pull/*'`), nên chuỗi cũ còn truy cập được bằng URL commit: cần liên hệ GitHub Support để xóa cached view, hoặc tạo repo mới; và báo security@ssi.com.vn. Test `src/repo.test.ts` nay có trên nhánh chính, chặn lockfile ghi lại URL ngoài registry công khai. Máy có `.npmrc` trỏ registry nội bộ thì `npm install` có thể ghi lại URL riêng vào lockfile: đừng commit lockfile khi test này đỏ.
3. Các câu hỏi ở docs/09 mục 3 (E1, nguồn nhạc, thiết bị tối thiểu).
4. Trước khi gộp vào `main`: chạy skill `security-audit`.
