# ĐINH MÙI: Lối chơi điều khiển nhân vật (góc nhìn thứ ba)

Ngày 12/11/2026. Đi kèm [02-plan.md](02-plan.md) và [04-script.md](04-script.md).

**Vấn đề:** bản thử hiện tại chỉ có cảnh 3D để xem và khung đối đáp. Người chơi không điều khiển gì, nên cảm giác như đọc truyện tranh có hình động.

**Mục tiêu:** người chơi **điều khiển nhân vật của mình ở góc nhìn thứ ba**, đi lại trong từng cảnh, tự tìm tới người khác và đồ vật để tương tác, giống cảm giác Một Ngày Làm Chó. Đối đáp có lựa chọn vẫn giữ, nhưng chỉ là **một** trong nhiều kiểu tương tác.

**Không làm:**
- **Nhiều người chơi chung một con phố** như Một Ngày Làm Chó. Game vẫn chơi một người, để tránh nhóm G1 trong Nghị định 147 (xem 01-research mục 6.1).
- **Thế giới mở liền mạch.** Mỗi chặng là một **bản đồ nhỏ có ranh giới** (cỡ 30×30 m), qua chặng thì chuyển bản đồ.

---

## 1. Vòng lặp chơi mới

1. **Vào chặng:** cắt cảnh ngắn, rồi hiện 2–4 **nhiệm vụ** trên màn hình. Ví dụ chặng Ra bến: "Mua quà về quê", "Ra tới bến xe".
2. **Đi lại tự do:** nhân vật chạy, đi, mang đồ. Người trong cảnh có hành vi riêng: đứng tán gẫu, đi lang thang, đi theo lộ trình, **đuổi theo bạn để hỏi**.
3. **Lại gần ai hoặc vật gì** thì hiện nút hành động: *Nói chuyện / Chào / Đưa lì xì / Nhặt / Lên xe*...
4. **Nói chuyện:** máy quay sà vào, bong bóng thoại hiện trên đầu, lựa chọn như hiện tại. Toàn bộ engine và kịch bản đã có được giữ nguyên.
5. **Hành động có hậu quả** lên 3 chỉ số: bị xe quẹt (Sức −), chào đủ người lớn (Hòa khí +), bỏ sót ai (Hòa khí −), chạy nhiều (Sức −), làm rơi quà...
6. **Xong nhiệm vụ** thì cắt cảnh và sang chặng sau.

---

## 2. Các kiểu tương tác

| Tương tác | Ở chặng | Cách chơi | Ảnh hưởng |
|---|---|---|---|
| Nói chuyện | Mọi chặng | Lại gần, bấm nút, chọn câu đáp | Như kịch bản hiện tại |
| Chào hỏi | 5, 6, 8 | Bấm nút cúi chào khi đứng trước người lớn | Hòa khí + nhỏ; bỏ sót người lớn thì Hòa khí − |
| **Né câu hỏi** | 5 | Họ hàng đuổi theo, câu hỏi bay ra thành bong bóng. Né được thì giữ sức; trúng thì bị kéo vào hội thoại | Sức, Hòa khí |
| Nhặt, mang đồ | 3, 9 | Giỏ quà, vali, thùng xốp mẹ gói. Mang đồ thì đi chậm, va chạm có thể làm rơi | Ví, Hòa khí |
| Đưa đồ | 6, 8 | Đi tới từng đứa trẻ đưa lì xì; mời trà; gắp thức ăn ở mâm | Ví, Hòa khí |
| Băng qua đường | 3 | Dòng xe máy chở đào/mai chạy liên tục; bị quẹt thì mất sức | Sức |
| Lên xe, lái xe máy | 3, 4 | Gọi xe ôm, hoặc tự chạy xe máy trên quốc lộ: né ổ gà, xe khách, dừng nghỉ ở trạm | Sức, Ví |
| Né ống kính | 5 | Bà Tám đi theo quay livestream | Hòa khí, Sức |
| Chơi với chó Vàng | 4, 5, 8 | Vuốt ve, ném dép cho nó nhặt | Sức + |
| Khoảnh khắc cameo | 6, 8 | Xem Duy Đèn Cầy review; **nhảy cùng Dương Gió Mùa** (bấm theo nhịp) khi xông đất | Hòa khí |
| Điện thoại | 1, 7 | Mở feed săn vé (mini-game), nhóm chat gia đình có link lừa | Ví |

Mọi tương tác vẫn theo quy tắc an toàn ở 04-script mục 7: không có rượu khi lái xe, không cờ bạc, không pháo nổ, cameo chỉ ở vai tích cực.

---

## 3. Kỹ thuật

- **Điều khiển:**
  - Điện thoại: joystick ảo bên trái, nút hành động bên phải.
  - Máy tính: WASD hoặc phím mũi tên, E hoặc Space để tương tác.
  - Tự viết, không thêm thư viện.
- **Camera:** bám sau lưng nhân vật, chuyển động mượt; kéo màn hình để xoay; tự nâng lên khi bị tường che; chuyển sang góc hội thoại khi đang nói chuyện. Camera dẫn và cắt cảnh hiện có vẫn dùng cho các đoạn cắt cảnh.
- **Va chạm:** tự viết trên mặt đất (hình tròn cho người, hình hộp cho tường, bàn, xe), không dùng engine vật lý để giữ nhẹ cho điện thoại. Chỉ cân nhắc Rapier (thêm khoảng 1–2 MB) nếu thật sự cần.
- **NPC:** máy trạng thái đơn giản (đứng, lang thang, tuần tra, đuổi theo, đi theo), tránh vật cản cơ bản.
- **Dữ liệu:** mỗi chặng có thêm phần **bản đồ** trong JSON: điểm xuất phát, NPC (vị trí, hành vi, hội thoại gắn với họ), đồ vật, vùng kích hoạt, nhiệm vụ. Engine thêm lớp **nhiệm vụ** dùng chung hệ thống cờ đã có. Validate và test mở rộng tương ứng.
- **Nhân vật:** tạm dùng nhân vật dựng bằng code như hiện tại. Ở bước nâng cấp art thì chuyển sang model CC0 có xương (Quaternius) cùng bộ animation đi, chạy, vẫy, ngồi, cầm đồ (kiểm tra license từng pack).
- **Hiệu năng:**
  - Tối đa khoảng 15 NPC mỗi chặng.
  - Đám đông và xe cộ dùng instancing.
  - Vật ở xa giảm chi tiết.
  - Đo FPS trên điện thoại ở mỗi điểm dừng.

---

## 4. Lộ trình làm lần lượt

Mỗi bước kết thúc bằng một bản chạy được. Ở các **điểm dừng**, bạn thử trên điện thoại rồi mới đi tiếp.

| Bước | Việc | Ước tính | Điểm dừng |
|---|---|---|---|
| 0 | Đẩy code lên GitHub | xong | |
| 1 | **Đã làm 12/11:** bộ điều khiển (bàn phím, joystick, kéo xoay), va chạm, camera bám, vùng đi lại sân nhà 3 miền, `npm run perf`. Còn chờ: bạn thử trên điện thoại thật | xong code | **Chờ bạn thử máy thật** |
| 3 | **Đã làm 12/11:** bản đồ, NPC và nhiệm vụ khai báo trong JSON (`maps` trong v1.json) có validate chặt; lớp nhiệm vụ dựa trên cờ (talked:/petted:/dodged:/quest:), thưởng chỉ số, nhiệm vụ tổng hợp | xong code | |
| 4 (một phần) | **Đã làm 12/11:** cơ chế **né câu hỏi** của họ hàng (Dì Út bắn bong bóng bay thẳng về chỗ bạn đứng; trúng thì bị kéo vào hội thoại theo vai, né được thì tính điểm; né 3 câu hoàn thành nhiệm vụ). Chưa làm: Bà Tám livestream, mâm cơm gắp mời | xong code | **Chờ bạn thử máy thật** |
| 2 | **Đã làm 12/11:** lại gần NPC hiện lời nhắc "[E] Nói chuyện X" (chạm được trên điện thoại), bấm thì mở hội thoại sẵn có (chỉ số đổi, thẻ mẹo, camera dựng khung hai người); NPC ngồi/đứng/lang thang/đuổi theo (chó Vàng, bé Bin). Review độc lập tìm ra và đã sửa lỗi kẹt người chơi trong hẻm | xong code | **Chờ bạn thử máy thật** |
| 1 (kế hoạch gốc) | **Bộ điều khiển:** nhân vật đi/chạy, joystick + bàn phím, camera bám, va chạm. Thử trong cảnh sân nhà | 2–3 ngày | **Có**: cảm giác điều khiển + FPS trên điện thoại |
| 2 | **Tương tác cơ bản:** lại gần thì hiện nút, mở hội thoại sẵn có, bong bóng thoại, chào hỏi; NPC đứng, lang thang, đuổi theo | 2–3 ngày | **Có**: chơi chặng Bước vào nhà bản tương tác |
| 3 | **Lớp nhiệm vụ + schema bản đồ** trong JSON, validate, test | 2 ngày | |
| 4 | **Chặng 5 + 6 đầy đủ:** né câu hỏi, chơi với chó, Bà Tám livestream, mâm cơm gắp mời | 3 ngày | **Có**: playtest vòng 1 với vài người |
| 5 | **Chặng 3 + 4:** đi phố, mua quà, băng qua đường, xe ôm; lái xe máy quốc lộ, trạm dừng chân | 4 ngày | |
| 6 | **Chặng 1 + 2:** văn phòng/KTX đi lại, điện thoại săn vé; tiệc tất niên đi giữa các bàn | 3 ngày | |
| 7 | **Chặng 7, 8, 9:** giao thừa, xông đất và nhảy cùng Dương Gió Mùa, đi lì xì từng đứa, mẹ gói đồ, twist | 4 ngày | |
| 8 | **Nâng cấp art:** model có xương, animation, âm thanh CC0 | song song từ bước 4 | |
| 9 | Tối ưu điện thoại, thẻ share, analytics, playtest, sửa lỗi | 4 ngày | **Có**: trước khi ra mắt |

Tổng khoảng **24–28 ngày làm việc**, chưa tính thời gian bạn thử và góp ý ở các điểm dừng. Vì vậy **mốc v1 ngày 15/12 không còn kịp cho đủ 9 chặng tương tác.**

---

## 5. Lịch ra mắt: cần bạn chọn

| Phương án | Nội dung | Ưu | Nhược |
|---|---|---|---|
| **A (khuyên dùng)** | **Bản sớm khoảng 20/12**: chặng 3–6 tương tác (ra bến, đường về, bước vào nhà, mâm cơm). **Bản đầy đủ 9 chặng khoảng 10/1/2027** | Có bản chơi được sớm để sửa lỗi và đăng devlog; bản đầy đủ vẫn trước đỉnh mùa Tết (giữa tháng 1 đến Ông Công Ông Táo 30/1) | Hai lần ra mắt, phải giữ nhịp truyền thông |
| B | Ra một lần khoảng 5/1/2027 với đủ 9 chặng | Một lần ra mắt hoàn chỉnh | Ít thời gian sửa lỗi trước đỉnh mùa; không có bản sớm để gom người chơi |

---

## 6. Ảnh hưởng tới những gì đã có

- **Giữ nguyên:** engine hội thoại, `v1.json`, test, cắt cảnh, camera dẫn, bộ cảnh và đạo cụ 3D.
- **Mở rộng:** cảnh 3D thành bản đồ đi lại được (thêm ranh giới, va chạm, khoảng trống để đi).
- **Kịch bản 04-script:** giữ lời thoại; mỗi chặng thêm phần "bản đồ và tương tác" khi tới bước tương ứng.
- **Rủi ro:**
  - Điều khiển bằng joystick ảo trên điện thoại khó làm cho "sướng tay".
  - Độ mượt khi có nhiều NPC.
  - Phạm vi lớn.

  Vì vậy có điểm dừng ngay sau bước 1 để quyết sớm.
