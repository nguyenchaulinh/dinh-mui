# ĐINH MÙI: Review đồ họa và kế hoạch nâng cấp

Ngày 15/11/2026. Dựa trên ảnh chụp chặng 1 và chặng 2 của chủ dự án, đọc lại toàn bộ code dựng cảnh / nhân vật, và số đo từ các file model. **Mình không xem được hình chạy thật**, nên mọi nhận xét về hình ảnh đều từ ảnh bạn gửi; các con số hiệu năng ở mục 2.4 là **ước lượng tĩnh**, phải đo lại trước khi tin.

## 1. Kết luận ngắn

Đồ họa "xấu" không do một lỗi, mà do bốn thứ chồng lên nhau:
1. **Hình khối thô:** nhà phố, xe máy, hoa Tết vẫn là hộp / cầu ghép, mỗi mặt một màu phẳng, không chi tiết nhỏ ở cự ly gần (camera chỉ cách vật 2 m).
2. **Ánh sáng phẳng:** không bóng đổ, không tối ở góc (AO), không phối màu theo giờ; vật không "dính" xuống đất.
3. **Nhân vật trùng nhau:** 24 nhân vật chỉ dùng 8 thân model, kiểu tóc bị bỏ qua, mặt không đổi được.
4. **Ngân sách vẽ chưa được đo:** ước lượng phố Tết đang vào khoảng 1.500 draw call, quá cao cho điện thoại. Thêm chi tiết kiểu cũ (mỗi chi tiết một mesh) sẽ làm tệ đi, nên **phải trả nợ hiệu năng trước khi thêm chi tiết**.

Đề xuất: giữ phong cách low-poly nhưng làm cho **nhất quán và có chiều sâu** (smooth shading, AO nướng sẵn, bóng đổ, màu theo giờ), không đuổi theo "ảnh thật" (không khả thi với model CC0 và điện thoại).

## 2. Review chi tiết

### 2.1 Ảnh chặng 2 (phố Tết), từng điểm

| # | Quan sát | Nguyên nhân (suy ra từ code và ảnh; cột này chưa kiểm bằng cách chạy) |
|---|---|---|
| 1 | Hai ba mảng phẳng khổng lồ chiếm nửa trái màn hình (xanh lá, đỏ, hồng) | Nhiều khả năng: người chơi đi trên vỉa hè rộng 2 m sát mặt tiền, camera nằm gần tường nhà. Mặt tiền là một hộp một màu (trát) |
| 2 | Ô cửa sổ là hình chữ nhật vàng to, nhìn như bảng quảng cáo | `ShopFront` đè một tấm phẳng vàng lên cửa sổ tối; không có kính, rèm, song |
| 3 | Mảng xám trắng + xanh ở góc dưới trái | Có thể là mái hiên hoặc biển hiệu của nhà gần camera, nhìn từ sát nên to và trơn (chưa xác định được món nào) |
| 4 | Xe máy: mũ là quả cầu xám khổng lồ, thân cylinder, không mặt, không tay chân thật | `Motorbike` ghép ~20 khối; người lái là cylinder + icosahedron |
| 5 | Cây mai / quất trên xe là khối đa diện xanh với chấm cam | `BlossomTree` mỗi bông là một mesh; tán là một khối cầu |
| 6 | Cột đèn đen, rất to, đầu đèn quá khổ | model Quaternius phóng lên cao 4.2 m, tay đèn 1.4 m |
| 7 | Mọi vật nhìn như "dán" trên nền | không bóng đổ, không AO; chỉ có đĩa bóng mờ ở vài chỗ |
| 8 | Nhân vật: tay chân mảnh, tư thế cứng, mặt trống | model Quaternius dạng thân người thật; màu phẳng |

Cái **đã tốt** và nên giữ: bố cục phố (đường, vạch kẻ, dây cờ, vỉa hè lát gạch), màu tường đa dạng, nhạc điệu màu đỏ Tết, texture vỉa hè và nhựa đường.

### 2.2 Nhân vật

- **8 thân model cho 24 nhân vật:** `nu-thuong-ngay` ×5 (Bà Tám, Dì Út, Tú, Mẹ, Cô Bán Quà), `nam-hoodie` ×4, `nam-vest` ×4, `nam-tho` ×3, `nu-cong-so` ×3, `nam-nong-dan` ×3. Cùng một thân, chỉ khác màu áo và phụ kiện.
- **`hairStyle` (ngắn / búi / dài / trọc) bị bỏ qua** với mọi model có xương: chỉ màu tóc đổi được. Chú Ba Ăn Nhậu "trọc" vẫn có tóc; cô "tóc dài" vẫn tóc ngắn.
- Không đổi được mặt, thân hình (chỉ trẻ / người lớn / người già qua tỉ lệ), không có trang phục theo dịp (áo dài, áo khoác dày, tạp dề đã có).
- Đã làm trong các đợt trước: phụ kiện gắn xương (kính, balo, thẻ, tạp dề...), trang phục theo vai, pháp tuyến mượt. Chưa đủ để các nhân vật trông khác nhau.
- Chó Vàng (Pomeranian) ổn so với phần còn lại.

### 2.3 Cảnh, theo từng bản đồ

| Cảnh | Hiện trạng | Điểm yếu chính |
|---|---|---|
| Lớp học / văn phòng | Nhiều nhất: model CC0, texture sàn, cửa sổ thật, chữ treo tường, nhà cao tầng nền, tủ TV | Phòng vẫn trống ở giữa, không có vách ngăn, máy in, bình nước; ánh sáng phẳng |
| Phố Tết | Có texture, dây cờ, cột đèn model, nhà bên kia đường | Mục 2.1; hiệu năng nặng nhất |
| Sân nhà | Hàng rào, chuối, sân gạch | Nhà, cổng, tre, dừa vẫn dựng bằng khối; thiếu ao, vườn, giàn |
| Trạm dừng chân | Dựng riêng, đã gộp geometry (tốt nhất về hiệu năng) | Hình khối đơn giản; không được thêm model do quy tắc hiệu năng của file |
| Nhà trên (mâm cơm) | Chưa có bản đồ chơi | Chưa chạm tới |

### 2.4 Ngân sách vẽ (ước lượng tĩnh, chưa đo)

Đếm số khối (mesh) mỗi thứ, nhân số lượng trong phố Tết:

| Thành phần | Mesh mỗi cái | Số lượng | Ước lượng |
|---|---|---|---|
| Nhà ống + `ShopFront` | ~15 + ~15 | ~14 | ~420 |
| Nhà bên kia đường (`FarShop`) | ~7 | ~14 | ~100 |
| Xe máy đang chạy | ~24 (không hàng) | 14 | ~340 |
| Xe máy đậu | ~9 | 6 | ~55 |
| Cây hoa Tết (mỗi bông một mesh, ~40 mesh/cây) | ~40 | ~13 (chậu + hàng trên xe) | ~520 |
| Dây cờ, vạch qua đường, đèn lồng, sạp, trạm | | | ~140 |
| Nhân vật + phụ kiện | | ~5 | ~50 |
| **Tổng** | | | **~1.600 draw call** |

Mục tiêu hợp lý cho điện thoại tầm trung: **dưới 400 draw call và dưới 250 nghìn tam giác mỗi cảnh** (cần xác nhận ở mục 5). Cách đo: bổ sung hiển thị `renderer.info.render.calls` và số tam giác vào bộ đếm FPS (`src/scene3d/FpsProbe.tsx`) rồi đo từng cảnh trên điện thoại của bạn.

## 3. Kế hoạch

Thứ tự theo phụ thuộc: **đo, rồi hiệu năng, rồi ánh sáng, rồi hình khối.** Làm ngược lại (thêm hình khối trước) sẽ phải làm lại.

| GĐ | Việc | Kết quả kiểm được | Ước lượng |
|---|---|---|---|
| **0. Đo** | Hiển thị draw call / tam giác / bộ nhớ trong bộ đếm FPS; ghi số đo 5 cảnh trên điện thoại của bạn; chụp bộ ảnh tham chiếu (cùng góc camera) cho mỗi cảnh trước và sau | Bảng số đo thật thay cho bảng ước lượng 2.4; ngân sách được chốt | 1 ngày |
| **1. Hiệu năng** | Hàm gộp geometry tĩnh (`mergeGeometries` + màu đỉnh) cho nhà, đạo cụ; `InstancedMesh` cho bông hoa, cờ, vạch; xe máy gộp thành 1-2 mesh; cây hoa Tết gộp | ≤ 400 draw call mỗi cảnh; test đếm số mesh trong JSX giữ mức tối đa như `set-tram-dung` đang làm | 3-4 ngày |
| **2. Ánh sáng và màu** | AO nướng sẵn vào màu đỉnh (tối góc, tối chân tường); bóng đổ thật cho nhân vật và vật gần camera (một đèn, bản đồ bóng nhỏ, tắt khi FPS tụt); chỉnh tone mapping và bảng màu theo giờ (chiều Tết ấm, hoàng hôn sân nhà); tuỳ chọn bloom / vignette | Ảnh tham chiếu: vật không còn "dán"; FPS không tụt quá ngưỡng | 2-3 ngày |
| **3. Phố** | Bộ mặt tiền theo mô-đun (tầng trệt cửa hàng, ban công, mái, cửa sổ có kính / rèm / song) gộp geometry; texture mặt tiền vẽ bằng canvas có biển hiệu chữ (tên + địa chỉ, mục 4); dây điện chằng chịt, biển hiệu vuông góc phố, điều hoà, quạt; **camera phố**: tự nâng góc nhìn hoặc làm mờ nhà gần khi sát tường để không còn mảng phẳng che màn hình | So ảnh 2.1: mục 1, 2, 3, 7 hết | 5-6 ngày |
| **4. Nhân vật** | Bộ tóc riêng gắn xương Head (ngắn, búi, dài, trọc, tóc bạc) thay tóc của model; ít nhất 12 thân khác nhau (thêm model CC0 có xương, hoặc biến thể tỉ lệ đầu / vai / chiều cao); lớp trang phục (áo dài Tết, áo khoác phao, áo len, khăn) gắn xương; tỉ lệ đầu hơi lớn hơn (dễ thương, dễ đọc ở cự ly xa); vài dáng đứng chờ khác nhau | Trong một cảnh không có hai NPC cùng dáng; test số cặp (thân, tóc, áo) không trùng | 4-6 ngày |
| **5. Xe cộ và cây** | Xe máy dựng lại bằng `ExtrudeGeometry` (thân cong) và `LatheGeometry` (bánh có hoa lốp), người lái có tay chân; cây đào / mai / quất mới: thân và cành sinh theo luật, bông bằng instancing; tối ưu texture các cây CC0 đã bỏ vì nặng (giảm xuống 256 px) | So ảnh 2.1: mục 4, 5, 6 hết | 3-4 ngày |
| **6. Các cảnh còn lại** | Áp dụng bộ mặt tiền và bóng cho sân nhà, trạm dừng chân (qua cách riêng vì quy tắc hiệu năng), nhà trên; lớp học / văn phòng thêm vách ngăn, máy in, bình nước | Mỗi cảnh qua bộ ảnh tham chiếu | 4-5 ngày |
| **7. Địa điểm và tên** | Mục 4 | Test: mọi tên và địa chỉ trong nội dung có trong bảng `places`; không còn "trạm xe buýt" chung chung | 2 ngày |
| **8. UI và QA** | Thẻ tên địa điểm khi vào chặng; chỉnh HUD, dock theo màu mới; chạy đo trên điện thoại | Bảng số đo 5 cảnh đạt ngân sách | 2-3 ngày |

Tổng ước lượng **25-35 ngày làm việc** (chưa tính thời gian bạn xem ảnh và góp ý ở mỗi mốc). Ba mốc nên dừng để bạn xem: sau GĐ 2 (cảm giác ánh sáng), sau GĐ 3 (phố), sau GĐ 4 (nhân vật).

### Việc làm nhanh trong 1-2 ngày (nếu muốn thấy khác biệt sớm)
- Camera phố nâng góc nhìn và lùi xa hơn khi gần tường (xoá mảng phẳng che màn hình).
- Cửa sổ nhà phố: bỏ tấm vàng phẳng, thay bằng ô kính có khung, rèm, một nửa số ô tối.
- Mũ bảo hiểm xe máy thu nhỏ còn nửa, thêm kính; cột đèn thu về cỡ hợp lý.
- Giảm số bông hoa trên xe hàng (gộp thành một mesh).

## 4. Tên địa điểm và địa chỉ

### 4.1 Nguyên tắc
- **Địa điểm công cộng thật** (ga, bến xe, chợ, phố sắm Tết): dùng tên thật và địa chỉ thật **đã xác minh**.
- **Cơ sở tư nhân hư cấu** (sạp quà, quán bánh mì, công ty, trường): tên bịa, dễ nhớ, **không gắn số nhà thật**; chỉ gắn tên đường / vùng thật nếu cần, và ghi "hư cấu" trong tài liệu. Thẻ mở đầu của game đã có câu "mọi nhân vật và tình huống là hư cấu".
- **Không ghi phường / quận:** đơn vị hành chính đã đổi từ 1/7/2025 (nguồn ghi nhận cấp quận bị bãi bỏ) và các nguồn đang ghi khác nhau. Chỉ ghi `số nhà + đường + thành phố`.
- Hiển thị ở ba chỗ: biển hiệu trong cảnh (`TextPlane`), nhãn nút tương tác / việc cần làm, và thẻ chào chặng.

### 4.2 Quyết định (15/11): toàn bộ game ở Hà Nội

Chủ dự án chốt: **mọi nhân vật, địa điểm và tên riêng gắn với Hà Nội**, không lan sang khu vực khác. Đã triển khai:
- `regions` chỉ còn `ha-noi`; xoá 13 câu biến thể theo vùng (Đà Nẵng, Sài Gòn) khỏi `v1.json`. Cơ chế `lineByRegion`... vẫn còn trong engine nhưng nội dung không dùng. Cảnh 3D theo miền (Trung, Nam) vẫn còn trong code nhưng không bao giờ được chọn.
- `src/content/places.ts` là nguồn tên địa điểm công cộng; test `haNoi.test.ts` báo lỗi nếu nội dung nhắc thành phố khác, nhắc "trạm xe buýt", hoặc gắn số nhà lạ vào Ga Hà Nội / phố Hàng Mã.

| Vai trò trong game | Tên trong game | Địa chỉ | Trạng thái |
|---|---|---|---|
| Nhà ga (thay "trạm xe buýt") | **Ga Hà Nội** | **120 Lê Duẩn** (khu A, tàu đường dài) | đã xác minh (nguồn du lịch) |
| Phố sắm Tết | **Phố Hàng Mã** (phố bán đồ trang trí Tết, Hà Nội) | chỉ tên phố | đã xác minh là phố bán đồ trang trí Tết; chưa có số nhà nên không ghi |
| Sạp quà | "Sạp Tết Hàng Mã" (hư cấu, trên phố Hàng Mã) | không số nhà | hư cấu |
| Quán dừng chân giữa quốc lộ | "Quán bánh mì" (hư cấu) | không gắn km | hư cấu |
| Hoa đào | "Đào Nhật Tân" (làng hoa đào nổi tiếng của Hà Nội, chỉ dùng như tên giống hoa) | | tên chung |

Hiển thị: biển "GA HÀ NỘI · 120 Lê Duẩn" treo vuông góc phố ở cuối phố, biển "SẠP TẾT HÀNG MÃ" trên sạp, nhãn nút "Cổng Ga Hà Nội · 120 Lê Duẩn", tiêu đề chặng "Ra Ga Hà Nội" và "Vào Ga Hà Nội", tên cảnh "Phố Hàng Mã, Hà Nội, ngày 28 tháng Chạp".

Nguồn đã tra (đều là trang du lịch / đặt vé, **không phải nguồn chính thức**; nên đối chiếu thêm với Đường sắt Việt Nam trước khi phát hành):
- Ga Hà Nội: [mia.vn](https://mia.vn/cam-nang-du-lich/thong-tin-ve-ga-ha-noi-15502), [Wikipedia](https://wikipedia.com/wiki/Hanoi_station)
- Phố Hàng Mã: [SGGP](https://www.sggp.org.vn/ha-noi-pho-hang-ma-ruc-sac-do-dip-can-tet-post777543.html)

Không ghi tên phường / quận: đơn vị hành chính đã đổi từ 1/7/2025.

### 4.3 Nhân vật mới ở phố Hàng Mã (hư cấu, đều vai tích cực / trung tính)

| Nhân vật | Vai | Cảnh | Ghi chú |
|---|---|---|---|
| Bác Tổ Trưởng | Tổ trưởng dân phố, cầm loa, đeo kính | `rb-to-truong` | nhắc đi bên phải, chỉ đường ra ga; lựa chọn "mượn loa" bị từ chối |
| Cô Trà Đá | Quán trà đá vỉa hè, tạp dề, cốc trà | `rb-tra-da` | trà đá năm nghìn, nhắc nghỉ chân |
| Bà Hai Gánh Đào | Bán đào Nhật Tân, khăn, cành đào | `rb-hoa-dao` | mua cành đào; "mua cả cây rồi mang lên tàu kiểu gì" |

Cùng nhiệm vụ tuỳ chọn "Chào bà con phố Hàng Mã" (thưởng Hòa khí +2). Đã đo lại cân bằng kết thúc (sinh viên E3 ~35%, E8 ~52%, độc thân 27+ E7 ~59%, E2 vẫn đạt được).

**Chưa thêm "Anh Long nghiện" và "Michael Lọ":** xem mục 5, câu hỏi 0.

### 4.4 Cốt truyện đi tàu
Đã chọn cách pha: chặng 2 kết thúc ở **Ga Hà Nội** (lên tàu); chặng 3 mở đầu bằng "Tàu tới ga tỉnh, bạn đổi sang xe khách về huyện", nên cảnh trạm dừng chân quốc lộ và xe khách giữ nguyên. Chặng 1 hỏi "về bằng gì" vẫn còn lựa chọn xe máy. Rẽ nhánh hoàn toàn theo cách về (tàu / xe khách / xe máy) vẫn là việc lớn chưa làm.

## 5. Câu hỏi cần bạn trả lời trước khi bắt đầu

0. **"Anh Long nghiện" và "Michael Lọ" là ai?** Hai tên này chưa có trong hồ sơ nào của dự án. Quy tắc ở [03-cameo.md](03-cameo.md) mục 2.3 và 5.1 loại người có liên quan tới ma túy hoặc vụ án, chỉ cho phép vai tích cực hoặc trung tính, và nội dung ma túy thuộc nhóm bị loại. Nếu đó là người thật, hoặc nhân vật bị mô tả là người nghiện, mình cần bạn cho biết họ là ai, và đề xuất một bản hư cấu không mô tả ai là người nghiện (xem câu trả lời trong cuộc trò chuyện).
1. **Phong cách:** đồng ý giữ low-poly nhưng làm nhất quán (mục 1), không đuổi ảnh thật?
2. **Thư viện:** cho thêm `@react-three/postprocessing` (bloom, vignette, SMAA)? Cần cài từ registry công khai (máy này cần ngoại lệ của IS như trước). Nếu không, mình bỏ hậu kỳ và chỉ dùng ánh sáng + AO nướng.
3. **Tải model CC0 thêm:** cho phép tải thêm nhân vật và bộ nhà từ poly.pizza (mỗi lần bạn duyệt như trước)? Bộ nhà Kenney City Kit còn chưa kiểm được vì bị chặn 429 lần trước.
4. **Ngân sách thiết bị:** thiết bị thấp nhất cần chạy (đề xuất: Android tầm trung, 30 FPS, 400 draw call, 250 nghìn tam giác mỗi cảnh)?
5. **Số nhà phố Hàng Mã và các địa điểm Hà Nội khác** (bến xe Giáp Bát, Mỹ Đình...): bạn có nguồn đáng tin không? Chưa xác minh thì giữ "tên + đường".
6. **Thứ tự:** làm ngay GĐ 0 và 1 (đo, hiệu năng), hay làm trước "việc làm nhanh" để thấy khác biệt sớm?
