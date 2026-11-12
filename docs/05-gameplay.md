# ĐINH MÙI: Lối chơi điều khiển nhân vật (góc nhìn thứ ba)

Ngày 12/11/2026. Đi kèm [02-plan.md](02-plan.md) và [04-script.md](04-script.md).

**Vấn đề:** bản thử hiện tại chỉ có cảnh 3D để xem và khung đối đáp. Người chơi không điều khiển gì, nên cảm giác như đọc truyện tranh có hình động.

**Mục tiêu:** người chơi **điều khiển nhân vật của mình ở góc nhìn thứ ba**, đi lại trong từng cảnh, tự tìm tới người khác và đồ vật để tương tác, giống cảm giác Một Ngày Làm Chó. Đối đáp có lựa chọn vẫn giữ, nhưng chỉ là **một** trong nhiều kiểu tương tác.

**Không làm:**
- **Nhiều người chơi chung một con phố** như Một Ngày Làm Chó. Game vẫn chơi một người, để tránh nhóm G1 trong Nghị định 147 (xem 01-research mục 6.1).
- **Thế giới mở liền mạch.** Mỗi chặng là một **bản đồ nhỏ có ranh giới** (cỡ 30×30 m), qua chặng thì chuyển bản đồ.

---

## 1. Vòng lặp chơi mới

1. **Vào chặng:** thẻ chặng ngắn (cắt cảnh 3D là bước sau), rồi hiện 2–4 **nhiệm vụ** trên màn hình. Ví dụ chặng Ra bến: "Mua quà về quê", "Ra tới bến xe".
2. **Đi lại tự do:** nhân vật chạy, đi, mang đồ. Người trong cảnh có hành vi riêng: đứng tán gẫu, đi lang thang, đi theo lộ trình, **đuổi theo bạn để hỏi**.
3. **Lại gần ai hoặc vật gì** thì hiện nút hành động: *Nói chuyện / Chào / Đưa lì xì / Nhặt / Lên xe*...
4. **Nói chuyện:** máy quay sà vào, bong bóng thoại hiện trên đầu, lựa chọn như hiện tại. Toàn bộ engine và kịch bản đã có được giữ nguyên.
5. **Hành động có hậu quả** lên 3 chỉ số: bị xe quẹt (Sức −), chào đủ người lớn (Hòa khí +), bỏ sót ai (Hòa khí −), chạy nhiều (Sức −), làm rơi quà...
6. **Xong nhiệm vụ đích** thì sang chặng sau (chặng cuối thì ra màn kết thúc).

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
- **Camera:** bám sau lưng nhân vật, chuyển động mượt; kéo màn hình để xoay; tự nâng lên khi bị tường che; chuyển sang góc hội thoại khi đang nói chuyện. (Camera dẫn kiểu cắt cảnh đã gỡ ngày 12/11; cắt cảnh sau này sẽ dựng lại trong chính bản đồ.)
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

| Bước | Việc | Ước tính | Điểm dừng | Trạng thái |
|---|---|---|---|---|
| 0 | Đẩy code lên GitHub | | | xong |
| 1 | **Bộ điều khiển:** đi/chạy, joystick + bàn phím, camera bám, va chạm, vùng đi lại sân nhà 3 miền, `npm run perf` | 2–3 ngày | **Có**: cảm giác điều khiển + FPS trên điện thoại | xong code 12/11; **chờ bạn thử máy thật** |
| 2 | **Tương tác cơ bản:** lại gần NPC hiện nút, mở hội thoại, chỉ số đổi, thẻ mẹo, camera dựng khung hai người; NPC đứng/ngồi/lang thang/đuổi theo (chó Vàng, bé Bin) | 2–3 ngày | **Có**: chơi chặng Bước vào nhà | xong code 12/11; **chờ bạn thử máy thật** |
| 3 | **Lớp nhiệm vụ + schema bản đồ** trong JSON (`maps`), validate chặt, thưởng chỉ số | 2 ngày | | xong 12/11 |
| 4 (một phần) | **Né câu hỏi:** Dì Út bắn bong bóng bay thẳng về chỗ bạn đứng; trúng thì bị kéo vào hội thoại theo vai, né được thì tính điểm (3 câu xong nhiệm vụ, 5 câu mở kết thúc "Chiến thần né câu hỏi"). Còn thiếu: Bà Tám livestream, mâm cơm gắp mời | 3 ngày | **Có**: playtest vòng 1 với vài người | một phần xong 12/11 |
| 4b | **Gỡ luồng hộp thoại, 3D 100%:** chặng trỏ thẳng tới bản đồ, kết thúc khi xong nhiệm vụ đích hoặc chỉ số về 0, màn chọn vai và màn kết thúc | | | xong 12/11 |
| 5 | **Chặng 3 + 4:** đi phố, mua quà, băng qua đường, xe ôm; lái xe máy quốc lộ, trạm dừng chân | 4 ngày | | chưa |
| 6 | **Chặng 6 (mâm cơm):** đi quanh nhà trên, gắp mời, boss "cả mâm hỏi cùng lúc" | 3 ngày | | chưa |
| 7 | **Chặng 1 + 2:** văn phòng/KTX đi lại, điện thoại săn vé; tiệc tất niên đi giữa các bàn | 3 ngày | | chưa |
| 8 | **Chặng 7, 8, 9:** giao thừa, xông đất và nhảy cùng Dương Gió Mùa, đi lì xì từng đứa, mẹ gói đồ, twist | 4 ngày | | chưa |
| 9 | **Nâng cấp art + âm thanh CC0** (model có xương, animation, SFX/nhạc) | song song từ bước 5 | | chưa |
| 10 | Tối ưu điện thoại, thẻ share, analytics, playtest, sửa lỗi | 4 ngày | **Có**: trước khi ra mắt | chưa |

Tổng khoảng **24–28 ngày làm việc**, chưa tính thời gian bạn thử và góp ý ở các điểm dừng. Vì vậy **mốc v1 ngày 15/12 không còn kịp cho đủ 9 chặng tương tác.**

---

## 5. Lịch ra mắt: cần bạn chọn

| Phương án | Nội dung | Ưu | Nhược |
|---|---|---|---|
| **A (khuyên dùng)** | **Bản sớm khoảng 20/12**: chặng 3–6 tương tác (ra bến, đường về, bước vào nhà, mâm cơm). **Bản đầy đủ 9 chặng khoảng 10/1/2027** | Có bản chơi được sớm để sửa lỗi và đăng devlog; bản đầy đủ vẫn trước đỉnh mùa Tết (giữa tháng 1 đến Ông Công Ông Táo 30/1) | Hai lần ra mắt, phải giữ nhịp truyền thông |
| B | Ra một lần khoảng 5/1/2027 với đủ 9 chặng | Một lần ra mắt hoàn chỉnh | Ít thời gian sửa lỗi trước đỉnh mùa; không có bản sớm để gom người chơi |

---

## 6. Ảnh hưởng tới những gì đã có

- **Giữ nguyên:** engine hội thoại (làm lớp hội thoại khi nói chuyện với NPC), `v1.json`, test, bộ cảnh và đạo cụ 3D. **Đã gỡ 12/11:** luồng hộp thoại độc lập, cắt cảnh và camera dẫn kiểu cũ.
- **Mở rộng:** cảnh 3D thành bản đồ đi lại được (thêm ranh giới, va chạm, khoảng trống để đi).
- **Kịch bản 04-script:** giữ lời thoại; mỗi chặng thêm phần "bản đồ và tương tác" khi tới bước tương ứng.
- **Rủi ro:**
  - Điều khiển bằng joystick ảo trên điện thoại khó làm cho "sướng tay".
  - Độ mượt khi có nhiều NPC.
  - Phạm vi lớn.

  Vì vậy có điểm dừng ngay sau bước 1 để quyết sớm.
