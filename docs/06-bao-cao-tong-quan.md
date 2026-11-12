# ĐINH MÙI: Báo cáo tổng quan (kịch bản, lối chơi, hệ thống, rà soát, kế hoạch)

Ngày 12/11/2026. Đây là bản chụp trạng thái thật của repo sau khi đọc code, `v1.json` và các tài liệu 01–05, kèm 323 test pass, typecheck sạch, build thành công.

> **Cập nhật sau khi gỡ luồng hộp thoại (12/11, commit `6ca0340` trở đi).** Báo cáo này viết **trước** khi bỏ luồng hộp thoại, nên các mục sau đã lỗi thời: **mục 1** (không còn hai lối chơi: chỉ còn 3D đi lại), **mục 2.2** (luồng hộp thoại đã gỡ), **mục 4** (E5 đã gỡ vì cần scene bvn-4; E8 đổi thành kết thúc theo kỹ năng, cờ `dodged:5`; phân bố mới ở `src/content/content.test.ts`), **mục 9.2** (đã có: `ErrorBoundary`, CI, email liên hệ qua biến môi trường, thẻ chặng) và **mục 10 giai đoạn 0–1** (đã làm phần lớn). Hiện trạng chính xác nằm ở README và các bảng trạng thái trong 02-plan, 05-gameplay.

**Cách đọc:** mỗi mục ghi rõ cái nào **đang chạy trong code**, cái nào **mới có trong kịch bản/plan**, cái nào **mình đề xuất mới** (đánh dấu *Đề xuất*). Nguồn sự thật cho số liệu game là [src/content/v1.json](../src/content/v1.json), không phải bảng số trong [04-script.md](04-script.md) (bảng đó là bản nháp, đã lệch sau đợt cân bằng ngày 12/11).

---

## 1. Game này là gì

Game web 3D low-poly về quê ăn Tết Đinh Mùi (2027). Người chơi chọn **vai** (sinh viên năm cuối / mới đi làm / độc thân 27+) và **thành phố xuất phát** (Hà Nội / Đà Nẵng / Sài Gòn, chọn 1 hoặc cả 3), rồi đi qua hành trình về quê. Họ hàng liên tục hỏi những câu ai cũng sợ (lương, người yêu, cân nặng, "con nhà người ta"). Mỗi câu đáp đổi ba chỉ số, cuối game ra **danh hiệu**.

- Chơi một người, miễn phí, không tài khoản, không thu dữ liệu (đã quyết ở plan).
- Giọng hài, kết ấm: mọi kết thúc khép bằng "Dù sao vẫn phải về nhà".
- Thẻ "mẹo thật" có nguồn sau một số lựa chọn (chống lừa đảo vé Tết, rượu bia, cách né câu hỏi...).
- Stack: Vite + React 19 + TypeScript + Three.js (React Three Fiber, drei). Nội dung trong JSON, engine hội thoại thuần.

**Hai lối chơi hiện cùng tồn tại nhưng chưa nối với nhau:**

| Lối chơi | Là gì | Trạng thái |
|---|---|---|
| **Luồng hộp thoại** (nút "Lên đường về quê") | Cảnh 3D để xem + khung thoại có lựa chọn, đi hết 4 chặng rồi ra danh hiệu | Chạy hết, có kết thúc |
| **Chế độ đi lại** (nút "Thử chế độ đi lại") | Điều khiển nhân vật góc nhìn thứ ba trong sân nhà, nói chuyện/vuốt ve/né câu hỏi, làm nhiệm vụ | Chạy, nhưng không có kết thúc và không nối vào luồng chính |

Đã chốt (12/11): **đi lại là chế độ chính**. Việc gộp xem mục 10.

---

## 2. Kịch bản A–Z

### 2.1 Hành trình 9 chặng theo kịch bản ([04-script.md](04-script.md))

| # | Chặng | Bối cảnh | Nội dung chính | Trạng thái |
|---|---|---|---|---|
| 0 | Mở đầu | Bản đồ VN thu nhỏ, Bé Dê nhảy lên | Chọn vai, chọn thành phố. Chỉ số khởi đầu theo vai | Có màn chọn bằng nút (chưa có bản đồ 3D) |
| 1 | Săn vé | Văn phòng/KTX, màn hình điện thoại | Đồng nghiệp hỏi mua vé chưa; **mini-game lướt feed vé** (5 bài, 1 thật 4 lừa, chọn cách về `{xe-khach}`/`{xe-may}`/`{chua-ve}`); mẹ gọi video (chỉ thấy nửa mặt). Lựa chọn "Phản đòn: ở lại" rồi xác nhận dẫn tới **E4 "Tết xa nhà"** | **Chưa làm** |
| 2 | Tất niên ở phố | Tiệc công ty (ĐL/ĐT) hoặc liên hoan lớp + cúng ông Táo (SV) | Sếp hỏi thưởng Tết; mời bia (chỉ từ chối); nhóm chat bàn lì xì con sếp; thả cá chép. Quiz MC Chớp Nhoáng ở v1.1 | **Chưa làm** |
| 3 | Ra bến | Phố Tết đông nghẹt, xe chở đào/mai | Mua quà (giỏ to / hộp vừa / "con về là quà"); ra bến bằng xe buýt / xe ôm (gặp Anh Shipper Tết) / nhờ bạn | **Có** (rb-1, rb-2, rb-shipper), dạng hộp thoại, chưa đi lại được |
| 4 | Đường về | Bến xe, xe giường nằm, quốc lộ, trạm dừng; Thái Gara 99; Chú Ba Triết Lý | Rẽ nhánh theo cờ từ chặng 1; đi nhờ xe cũ; trạm dừng có bẫy quét mã | **Chỉ có** cắt cảnh đến đầu làng (dv-den-lang): chó Vàng chạy ra đón |
| 5 | Bước vào nhà | Sân nhà quê, bàn trà, họ hàng ngồi kín | Cô Hai hỏi theo vai; Bác Cả bình luận ngoại hình (Bé Dê chen vào); Bà Tám livestream; ĐT có thêm "mùng 2 gặp thử" → cờ `{xem-mat}` | **Có** (bvn-1..4) + **chế độ đi lại** |
| 6 | Mâm cơm tất niên ("boss fight") | Nhà trên, mâm cỗ 3 miền, bàn thờ | Duy Đèn Cầy review mâm cỗ; Bác Cả "con nhà người ta"; Chú Ba mời rượu (chỉ từ chối); **combo cả mâm hỏi cùng lúc** | **Có** (mc-intro..mc-ket), dạng hộp thoại |
| 7 | Giao thừa | Sân đêm, TV chiếu pháo hoa | Nhóm chat có link lừa; thầy phong thủy livestream trên TV của mẹ; đếm ngược | **Chưa làm** |
| 8 | Mùng 1 | Cổng nhà buổi sáng | **Dương Gió Mùa xông đất**; **mini-game chia lì xì**; tin nhắn "hỗ trợ BHXH" lừa đảo; ĐT có buổi xem mắt mùng 2 (`{hop-nhau}`) | **Chưa làm** |
| 9 | Quay lại phố | Sân sáng sớm, sân khấu twist, xe rời làng, phòng trọ | Mẹ nhét đồ; **twist: góc nhìn của mẹ** do MC Mít Ướt đọc, nối với lịch sử lựa chọn; câu hỏi cuối "Tết sau con có về nữa không?"; thùng xốp với mảnh giấy "Ăn uống đầy đủ nghe con" | **Chưa làm** |

Tổng kịch bản: khoảng 25 lựa chọn + 2 mini-game + cắt cảnh, ước 12–14 phút. Đang có: **4/9 chặng**, 21 scene (13 hội thoại luồng chính, 4 cắt cảnh, 4 chỉ mở qua NPC trong chế độ đi lại), 55 lựa chọn.

### 2.2 Luồng chơi thật đang chạy (luồng hộp thoại)

Số quyết định mỗi lượt khoảng 9–11, chơi vài phút.

1. **Chọn vai + vùng** → thẻ chặng "Ra bến" → **rb-1** Bé Dê: mua quà (3 lựa chọn, câu mở đầu đổi theo vùng: mưa phùn Hà Nội / gió sông Đà Nẵng / nắng Sài Gòn).
2. **rb-2** ra bến bằng gì. Chọn "xe ôm" thì có thêm cắt cảnh **rb-shipper** (Anh Shipper Tết: "Tết của anh bắt đầu sau đơn cuối cùng...").
3. **dv-den-lang** (cắt cảnh): cổng làng / đường cát / cầu gỗ tùy vùng, chó Vàng ra đón, Bé Dê: "Chặng khó nhất ở trong nhà".
4. **Bước vào nhà** (sân nhà, câu thoại đổi giọng theo vùng: "răng/rứa/mô" cho Trung, "nghen/hông" cho Nam):
   - Cô Hai hỏi theo vai: ĐL hỏi lương, ĐT hỏi sao chưa lập gia đình, SV hỏi ra trường làm gì.
   - **bvn-2** Bác Cả: "Béo ra hay gầy đi?" (Bé Dê chen: "không phải chủ đề Tết").
   - **bvn-3** Bà Tám giơ điện thoại quay, gửi nhóm chat gia đình.
   - **bvn-4** (chỉ ĐT) Cô Hai: mùng 2 gặp thử. Chọn "Dạ để con xem lịch" bật cờ `xem-mat`.
5. **Mâm cơm tất niên** (cắt cảnh mc-intro, Ông thắp hương xong mời ăn):
   - **mc-1** Duy Đèn Cầy review bánh chưng ("vị của sự đoàn viên chưa chín").
   - **mc-2 / mc-2-sv** Bác Cả: "Con Ngân nhà bác Tư mua nhà rồi" (bản SV: "có công ty nhận rồi").
   - **mc-3** Chú Ba mời rượu (có thẻ mẹo T05: đã uống thì không lái).
   - **mc-4** Bé Dê: **combo cả mâm hỏi cùng lúc**, chọn chiến thuật: gắp mời từng người / đứng dậy trả lời một lần / hỏi chuyện Tết xưa của ông / hỏi ngược lương.
   - **mc-ket** (cắt cảnh): "Bản thử dừng ở đây" → ra danh hiệu.

Bé Dê là người dẫn truyện/chốt ý. Nhân vật nhại (Duy Đèn Cầy) có `parody: true` và bản thay thế trung tính (Chú Tư).

---

## 3. Lối chơi và hệ thống

### 3.1 Chỉ số và đáp

Ba chỉ số 0–100, nguyên: **Hòa khí (H)**, **Sức chịu đựng (S)**, **Ví (V)**. Chỉ số khởi đầu mặc định 50, đổi theo vai:

| Vai | H | S | V |
|---|---|---|---|
| Sinh viên năm cuối | 50 | 60 | 30 |
| Mới đi làm | 50 | 50 | 45 |
| Độc thân 27+ | 50 | 40 | 60 |

Bốn kiểu đáp (nhãn trên nút): **Khéo / Thật thà / Lầy / Phản đòn**.

- **Khéo**: +Hòa khí, tốn Sức (đợt cân bằng 12/11: đã tăng giá Sức thêm 3).
- **Thật thà**: −Hòa khí, +Sức.
- **Lầy**: +Hòa khí và +Sức, **nay tốn 5 Ví** (trước đó miễn phí nên gần như luôn là lựa chọn tốt nhất).
- **Phản đòn**: −10 đến −15 Hòa khí, +8 đến +10 Sức. Xuất hiện ít (5 lựa chọn), là "bẫy hài".

Chỉ số nào về 0 ở giữa game thì game **kết thúc ngay**. Sau mỗi lựa chọn hiện phản ứng của nhân vật, và đôi khi **thẻ "Mẹo thật"** (có nguồn). Hiện chỉ có 2 thẻ: T03 (né câu hỏi riêng tư), T05 (rượu bia không lái xe).

### 3.2 Biến thể vùng và vai

- Chọn nhiều vùng thì mỗi scene lấy một vùng theo `seed` ngẫu nhiên của lượt chơi (cùng lượt thì scene nào ra vùng đó cố định).
- **Câu thoại chính đổi giọng theo vùng ở 15/21 scene.** Nhưng **lựa chọn và phản ứng gần như chưa đổi** (chỉ 1/55 lựa chọn có `textByRegion`, 3/55 có `replyByRegion`). Cảnh 3D đổi nhà, cổng, hoa, cây, mâm cỗ theo miền.
- Vai quyết định scene nào hiện (`personas`) và scene nào đổi lời (ví dụ Cô Hai ở bvn-1).

### 3.3 Cờ, điều kiện, lịch sử

Mọi thứ chạy trên cờ (flag) và lịch sử `sceneId/choiceId`: scene, dòng thoại, lựa chọn, kết thúc đều lọc được theo cờ/lịch sử/vai/vùng. Cờ chế độ đi lại tự sinh: `talked:<npc>`, `petted:<npc>`, `dodged:1|3|5`, `hit:1`, `quest:<id>`. `validateContent` bắt cờ gõ sai, tham chiếu sai, set 3D/vị trí/góc máy sai.

---

## 4. Các kết thúc

Duyệt từ trên xuống, cái đầu tiên khớp thắng. Điều kiện hiện tại trong `v1.json` (sau đợt cân bằng):

| Mã | Danh hiệu | Điều kiện | Mô tả |
|---|---|---|---|
| E1 | Bị cả họ unfollow | H ≤ 15 | Nhóm chat gia đình vẫn còn bạn, chỉ là không ai thả tim nữa. |
| E2 | Ngủ gục trước giao thừa | S ≤ 0 | Bạn thức dậy thì đã mùng 2... |
| E3 | Cháy ví giữa đường | V ≤ 0 | Bé Dê cho mượn tiền vé. Lãi suất: một nụ cười. |
| E5 | Có hẹn mùng 2 | cờ `xem-mat` | Cô Hai đã đặt lịch giúp bạn. |
| E6 | Ví rỗng tim đầy | V ≤ 20 và H ≥ 60 | Ví mỏng nhưng cả nhà ôm bạn thật chặt. |
| E7 | Cháu ngoan quốc dân | H ≥ 70 | Cả họ khen, riêng bạn cần ngủ ba ngày. |
| E8 | Chiến thần né câu hỏi | S ≥ 75 (**tạm**) | Không câu nào chạm được bạn. |
| E9 | Về quê sống sót | mặc định | Không hoàn hảo, nhưng bạn đã về. |

**E4 còn thiếu, và kịch bản ĐÃ định nghĩa nó:** E4 **"Tết xa nhà"** (ở 04-script mục 4): người chơi chọn "Phản đòn: năm nay con ở lại làm thêm" ở cuộc gọi video của mẹ (chặng 1), Bé Dê hỏi "Chắc chưa?", xác nhận thì kết thúc ngay. Gọi video lúc giao thừa, mẹ vẫn cầm máy sai góc. Kết thúc này **không làm được cho tới khi có chặng 1**. Ở lượt trước mình đã đưa 3 ý tưởng E4 khác (A/B/C) mà **bỏ sót việc này**, nên bạn nên cân nhắc lại: E4 của kịch bản gốc là kết thúc có cảm xúc và đã có nội dung, còn các ý tưởng A/B chỉ là kết thúc "lấp chỗ trống" theo chỉ số. Đề xuất: **để E4 chờ chặng 1**, dùng ý tưởng B (hoặc ID khác) cho kết thúc thứ 9 theo chỉ số nếu bạn vẫn muốn có thêm.

### 4.1 Phân bố kết thúc (mô phỏng toàn bộ đường đi luồng chính, engine thật)

Mỗi đường đi coi như xác suất như nhau; chỉ để so sánh, không phải hành vi người chơi thật.

| Vai | Kết thúc phổ biến |
|---|---|
| sinh-vien | E6 43%, E9 34%, E8 15%, E3 8% |
| moi-di-lam | E9 68%, E6 16%, E8 8%, E7 4%, E1 3% |
| doc-than-27 | E9 53%, E5 32%, E8 2%, E7 7%, E1 3%, E2 ~1% |

Còn lệch: **E6 chiếm 43% của sinh viên** (Ví khởi đầu 30), **E7 hầu như biến mất** (0–7%), E8 sẽ đổi sang điều kiện cờ `dodged:3` khi gộp đi lại. Có test khóa: mọi kết thúc tới được, không kết thúc nào quá 75% của một vai, mỗi "Lầy" luồng chính phải tốn thứ gì đó.

---

## 5. Nhân vật người chơi

**Điều khiển** ([src/game/input.ts](../src/game/input.ts), [RoamControls.tsx](../src/game/RoamControls.tsx)):

- Máy tính: **WASD / phím mũi tên** đi, **Shift** chạy, **kéo chuột** xoay camera, **E / Space / Enter** tương tác. Không có phím nhảy.
- Điện thoại: **joystick ảo bên trái**, kéo ở bất cứ đâu để xoay camera, nút **"Tương tác"** bên phải. Đẩy joystick quá 85% thì tự chạy. Máy tính thêm `&touch` để thử joystick.

**Chuyển động** ([movement.ts](../src/game/movement.ts), hàm thuần, có test): đi 2.2 m/s, chạy 4.2 m/s, tăng tốc 16 m/s², hãm 24 m/s² (dừng gọn để đứng đúng chỗ tương tác), xoay mặt 12 rad/s. Thân người chơi là vòng tròn bán kính 0.35 m. Đầu vào hỏng (NaN) coi như 0, không sinh lỗi. **Chạy không tốn Sức** (doc 05 từng ghi "chạy nhiều Sức −", chưa làm).

**Va chạm** ([collision.ts](../src/game/collision.ts)): tự viết trên mặt đất (hình tròn và hộp xoay), trượt dọc tường, không dùng engine vật lý. Người chơi **không** va chạm với NPC đi lại (chó, Bin), để NPC đứng chắn hẻm không nhốt người chơi; NPC tự tránh người chơi. Vùng đi lại có ranh giới; hiện chỉ có sân nhà (`san-nha`) với 3 phong cách miền.

**Camera** ([camera.ts](../src/game/camera.ts)): bám sau lưng, cách 5.6 m, nghiêng xuống ~15°, làm mượt (hằng số ~0.1 s). Kéo để xoay ngang (không xoay dọc). Tường che thì camera co lại. Khi nói chuyện chuyển sang **góc dựng khung cả hai người ở nửa trên màn hình** (khung thoại che nửa dưới).

**Hoạt hình** ([Figure.tsx](../src/scene3d/Figure.tsx)): nhân vật dựng bằng code (low-poly, nhận diện qua màu và phụ kiện, không dựng mặt giống người thật). Bộ chuyển động: idle, talk, wave, dance, sit, walk, cry; Bé Dê và chó có bộ riêng. Người chơi chỉ dùng **walk/idle** (chưa có hoạt hình chạy riêng).

---

## 6. NPC hoạt động thế nào

Ba hành vi ([npc.ts](../src/game/npc.ts), thuần, có test), khai báo trong `maps` của JSON:

| Hành vi | Cách hoạt động |
|---|---|
| `stand` | Đứng yên; người chơi lại gần trong `aware` thì quay mặt về phía họ. Người **ngồi** (spot có `seated`) luôn đứng yên, không quay, dù dữ liệu ghi gì |
| `wander` | Nghỉ 1.5–4.5 s rồi đi tới điểm ngẫu nhiên trong bán kính `leash` quanh vị trí gốc. Kẹt quá 0.8 s thì đổi điểm |
| `approach` | Người chơi trong `aware` thì đi tới, dừng ở `stopDist`, quay mặt; có dải trễ 0.25 m chống chớp đi/dừng. Kẹt quá 1.5 s thì "bỏ cuộc" 3 s (đi lang thang) rồi thử lại |

Số ngẫu nhiên dùng bộ sinh giả ngẫu nhiên (mulberry32) theo hạt giống nên test lặp lại được.

### Dàn NPC của bản đồ `san-nha`

| NPC | Vị trí | Hành vi | Tương tác | Chi tiết |
|---|---|---|---|---|
| Cô Hai | ghế 1 (ngồi) | stand | "Nói chuyện" | Câu hỏi theo vai (bvn-1-dl/dt/sv). Xong thì lần sau chỉ nói câu chào lại |
| Bác Cả | ghế 2 (ngồi) | stand | "Nói chuyện" | bvn-2 (ngoại hình) |
| Bà Tám | ghế 3 (ngồi) | stand | "Chào" | bvn-3 (livestream) |
| Chó Vàng | góc sân | approach 1.9 m/s, nhận ra bạn trong 6 m, dừng 1.0 m | "Vuốt ve" (tầm 1.5 m) | **Một lần**: +8 Sức, rồi câu lặp |
| Bé Bin | góc trái sân | approach 2.6 m/s, nhận ra trong 9 m | "Nói chuyện" | Đòi lì xì: scene roam-bin (có Ví) |
| **Dì Út** | cuối sân | wander 1.0 m/s, bán kính 2.2 m | "Nói chuyện" | **Bắn bong bóng câu hỏi** (xem 6.1) |

Mỗi NPC chỉ nói chuyện **một lần** (đánh dấu để không lặp hội thoại và không cộng chỉ số hai lần), sau đó là câu `after`.

### 6.1 Cơ chế bong bóng câu hỏi của Dì Út ([bubbles.ts](../src/game/bubbles.ts))

- Cách người chơi 2.5–9 m thì Dì Út bắn: chu kỳ 3.5 s (nhân ngẫu nhiên 0.8–1.2), **lần đầu sau 5.25 s** để người chơi kịp nhìn quanh. Bong bóng bay thẳng về **vị trí người chơi lúc bắn** (3 m/s, không bám theo), tối đa 8 bóng cùng lúc.
- Câu hỏi hiện thành chữ và theo vai: SV "Ra trường làm gì?", ĐL "Lương bao nhiêu rồi?", ĐT "Bao giờ cưới?"...
- **Trúng** (chạm vòng 0.35 + 0.2 m): bị kéo vào hội thoại theo vai (roam-ut-sv/dl/dt), xóa hết bóng đang bay, Dì Út nghỉ 6 s, cờ `hit:1`. Trúng thì **không** tính là "đã nói chuyện xong" (vẫn chủ động nói lại được).
- **Né**: bóng đã đi qua người chơi sau khi từng lướt trong 4 m mà không trúng → "Né được!" và đếm. Đếm tới 1, 3, 5 sinh cờ `dodged:n`. Bóng bị tường/ghế chặn **không** tính né (chống núp né miễn phí).
- Đang hội thoại: xóa hết bóng, không bắn thêm, ân hạn 3 s sau khi đóng.

---

## 7. Cách tương tác

**Vòng tương tác** ([interact.ts](../src/game/interact.ts), [RoamScreen.tsx](../src/game/RoamScreen.tsx)):

1. Lại gần NPC (≤ 2.1 m, trong nón ±80° phía trước; rất gần ≤ 1.0 m thì bất kể hướng). Nếu nhiều người, chọn theo điểm = khoảng cách + 1.2 × góc lệch (người bạn đang quay mặt về ai thì chọn người đó, kể cả khi chó chạy sát bên).
2. Hiện nút **"[E] Nói chuyện / Chào / Vuốt ve + tên"**, bấm phím hoặc chạm nút (trên điện thoại). Giữ mục tiêu cũ thêm 0.5 m để NPC chạy lăng xăng không làm nút chớp tắt.
3. Bấm: người chơi dừng và quay mặt về NPC, **hội thoại mở**, camera sà vào, thế giới tạm dừng.
4. Hội thoại dùng lại nguyên engine cũ: chọn câu đáp → phản ứng (+ thẻ mẹo) → "Tiếp". Chỉ số và cờ áp lên state **mới nhất** (không đè mất cờ vừa bật).

**Nhiệm vụ** (nút "Nhiệm vụ n/4" góc trái): 4 nhiệm vụ trong JSON.

| Nhiệm vụ | Mục tiêu | Thưởng |
|---|---|---|
| Chào hỏi họ hàng | Nói chuyện Cô Hai, Bác Cả, chào Bà Tám | +8 H |
| Né câu hỏi của Dì Út | Né 3 câu | +10 S |
| Làm bạn với lũ nhỏ | Vuốt ve Vàng, nói chuyện Bin | +4 H |
| Qua ải sân nhà | Hoàn thành cả 3 nhiệm vụ trên | +5 H, +5 S |

Toast thông báo (né được, trúng câu hỏi, hoàn thành nhiệm vụ) tự biến mất. Khi hoàn thành "Qua ải sân nhà" hiện chỉ có toast: **chưa có cắt cảnh/chặng kế**.

Các kiểu tương tác doc 05 hứa nhưng **chưa có**: nhặt/mang đồ, đưa lì xì, băng qua đường, lên xe/lái xe máy, né ống kính livestream, gắp mời ở mâm, nhảy theo nhịp cùng Dương Gió Mùa, điện thoại (feed vé, nhóm chat).

---

## 8. Tuyến âm thanh

### 8.1 Hiện trạng: **chưa có gì**

Không có âm thanh trong code (không `Audio`/`AudioContext`, không file âm thanh, không nút tắt tiếng). Tài liệu chỉ nói: "vài SFX CC0, nhạc nền tạm bỏ ở v1" (02-plan mục 4); "chỉ dùng nhạc tự làm hoặc CC0 để host không gỡ vì bản quyền" (mục 3.7); không pháo nổ (04-script mục 7); cameo Dương Gió Mùa có "nhạc nổi lên" (04-script 8.1) và doc 05 nói nhảy theo nhịp. Không có đặc tả âm thanh nào khác.

### 8.2 *Đề xuất* thiết kế tuyến âm thanh

**Nguyên tắc:** (1) nguồn chỉ là tự làm hoặc CC0, kiểm license từng pack, có mục ghi nguồn trong màn credit; (2) **không clone giọng, không lấy giọng/nhạc thật của người được nhại**; (3) **không tiếng pháo nổ** (pháo hoa chỉ phát nhỏ, qua bộ lọc "TV"); (4) tắt tiếng được ngay, nhớ lựa chọn; (5) dung lượng: âm thanh của chặng đầu ≤ ~1 MB, còn lại tải khi vào cảnh.

**Các lớp (bus):** nhạc nền · âm trường (ambience) · hiệu ứng (SFX) · "tiếng lẩm bẩm" của nhân vật. Khi hội thoại mở thì **hạ (duck)** nhạc và ambience.

| Lớp | Nội dung đề xuất | Gắn vào |
|---|---|---|
| Nhạc nền | Chủ đề menu; chặng phố (hối hả); chặng quê (ấm, nhạc cụ dân gian bằng synth tự làm); mâm cơm (hài, có "VS" kiểu đối kháng khi hiện thẻ tên họ hàng); giao thừa (tĩnh, đếm ngược); twist MC Mít Ướt (piano + nghẹn); câu kết mỗi kết thúc | `Stage` trong JSON (`music`) |
| Ambience theo cảnh/vùng | Phố Tết: xe máy, còi, chợ hoa. Sân nhà: gà gáy, gió lũy tre (Bắc) / sóng, gió cát (Trung) / ếch nhái, nước kênh (Nam). Nhà trên: bát đũa, TV Tết nhỏ, họ hàng rì rầm | set + `RegionStyle` |
| Bước chân | Gạch (Bắc), cát (Trung), ván cầu (Nam); đi và chạy khác nhịp; thump nhẹ khi va tường | `walking` trong `Player`, `RegionStyle` |
| Hội thoại | Nút theo kiểu đáp (Khéo: chuông nhẹ; Thật thà: gõ gỗ; Lầy: boing; Phản đòn: trống "tách" rồi **im lặng ba giây** đúng như phản ứng "cả sân im lặng"); thẻ mẹo: "ting" + giấy; phản ứng chỉ số: lên/xuống | `choose()` / `TalkPanel` |
| Bong bóng câu hỏi | Bắn "pop/vút"; bay qua suýt trúng "vèo" + chime nhỏ khi tính né; trúng "bốp" + khựng nhạc | `onShoot`, `onDodge`, `onHit` có sẵn trong `RoamView` |
| Nhiệm vụ | Jingle ngũ cung ngắn khi hoàn thành; jingle lớn hơn khi "Qua ải" | `completeQuests` trong `RoamScreen` |
| NPC | Giọng "lẩm bẩm" tổng hợp theo cao độ riêng (Bé Dê cao, Ông trầm), thay cho lồng tiếng; chó sủa/thở khi chạy tới và khi vuốt; Bin cười khúc khích | `speaking` của `Figure` |
| Cameo | Dương Gió Mùa vào bằng nhịp tự soạn, **không** lấy nhạc thật | cảnh xông đất (chặng 8) |
| Kết thúc | Mỗi danh hiệu một stinger ngắn (E1 buồn hài, E7 rực rỡ, E9 ấm) | `endingId` |

**Kỹ thuật:** một module nhỏ bọc **Web Audio API** (không thêm thư viện), phần chọn "sự kiện → tiếng" viết thuần để test được, giống phần còn lại của repo. Mở khóa âm thanh ở **lần chạm đầu tiên** (nút "Lên đường về quê", vì iOS/Chrome yêu cầu cử chỉ người dùng), tự tạm dừng khi tab ẩn. JSON thêm trường (`music`, `ambience`) và `validateContent` kiểm tra id âm thanh có tồn tại. Hỗ trợ trợ năng: mọi sự kiện quan trọng đã có chữ (toast), không để âm thanh là kênh thông tin duy nhất.

---

## 9. Rà soát: thừa, thiếu, lệch

### 9.1 Chất lượng code (tốt)

- 323 test pass (14 file), typecheck strict (`noUnusedLocals`, `noUncheckedIndexedAccess`) sạch, build 375 ms.
- Quét export: chỉ **1 export không ai dùng** (`SET_IDS` trong `registry.ts`) và **1 chỉ test dùng** (`keysToVector` trong `input.ts`). Code gần như không có rác.
- Bundle: JS tổng ~1.26 MB, gzip ~350 KB; chunk `sets` (three + drei + dựng cảnh) **951 KB (250 KB gzip)**, Vite cảnh báo >500 KB. Chặng đầu tải chậm hơn mức cần.

### 9.2 Thiếu

| Hạng mục | Ghi chú |
|---|---|
| **Gộp đi lại với luồng chính** | Hiện là hai game rời; đi lại không có kết thúc |
| 5/9 chặng, 2/2 mini-game (feed vé, chia lì xì) | `Scene.ui: 'feed'\|'lixi'` có trong schema nhưng **không code nào đọc** |
| **Âm thanh** | Không có gì (mục 8) |
| **Thẻ chia sẻ danh hiệu** (Canvas/Web Share) | Kênh tăng trưởng chính trong plan; chưa có |
| **Lưu tiến độ** | Tắt tab là mất hết |
| **Analytics đếm lượt** | Chưa có (không cookie, theo plan) |
| **Thẻ mẹo** | 2/9; T10–T15 còn "CẦN NGUỒN" |
| **Nhân vật Mẹ, bố, Ông bà** | Mẹ là trục cảm xúc của twist nhưng chưa có trong `characters` (Ông có) |
| **ErrorBoundary + fallback WebGL** | Content hỏng hay WebGL lỗi là trang trắng |
| **CI** | Không có workflow, `.nvmrc`, `engines` |
| **Email liên hệ + trang credit** | Plan mục 3.3 yêu cầu; hiện chỉ có dòng disclaimer |
| **Đo FPS trên điện thoại thật** | "Điểm quyết định 3D hay 2.5D" vẫn chờ |
| Cảnh 3D còn thiếu | Văn phòng/KTX, sảnh tiệc, bến xe, xe khách, quốc lộ, trạm, sân đêm, sân khấu twist, phòng trọ |

### 9.3 Lệch giữa tài liệu và code

- **04-script vs v1.json:** số hiệu ứng trong script là bản nháp cũ (Khéo −5 Sức, Lầy không tốn Ví). `v1.json` là nguồn thật. Dì Út (trục của chế độ đi lại) **không có** trong kịch bản; Mẹ có trong kịch bản nhưng không có trong dữ liệu.
- **02-plan:** bảng "Trạng thái" ghi "19 test" (nay 323), ghi "Đang chờ duyệt kịch bản" trong khi cũng ghi "đã duyệt"; mốc ra mắt 15/12 đã bị doc 05 xác nhận không kịp.
- **05-gameplay:** bảng lộ trình đánh số bước 1, 3, 4, 2, 1, 2, 3, 4... (trùng và lộn thứ tự giữa "đã làm" và "kế hoạch gốc").
- **README:** mô tả "bước 1, bản thử", chưa phản ánh hiện trạng (nhiệm vụ, né câu hỏi, cân bằng mới).
- **`RoamScreen.tsx:273`:** tiêu đề "Sân nhà" gõ cứng thay vì lấy từ bản đồ.

### 9.4 Cần chủ dự án rà (nội dung/an toàn, mình chỉ nêu)

- **Câu hỏi mang định kiến giới:** 04-script mục 7 quy định luôn đặt là câu **kém duyên, có người ngắt lời**. Bác Cả có Bé Dê chen vào, nhưng "Bao giờ cưới?" / "Bao giờ có cháu?" của Dì Út (bong bóng) và Cô Hai ở bvn-1-dt **chưa có** người ngắt lời. Bạn quyết định có coi đây là chưa tuân thủ không.
- **Nhân vật nhại:** có `parody` + `fallbackId` + test; nên giữ nguyên nguyên tắc "không tag tên thật khi quảng bá".
- **Thẻ mẹo:** chỉ đưa lên khi đã có nguồn thật; T05 chưa đối chiếu văn bản gốc, **không ghi mức phạt**.

### 9.5 Đính chính review trước

Mình từng viết "biến thể vùng gần như chưa dùng". Chính xác hơn: **câu thoại chính đã đổi giọng theo vùng ở 15/21 scene**, nhưng **lựa chọn và phản ứng thì chưa** (1/55 và 3/55).

---

## 10. Kế hoạch: dọn sạch và phát triển tiếp

Nguyên tắc: mỗi bước kết thúc bằng bản chạy được, có test, và là một commit riêng (nhánh riêng, không commit thẳng `main`). Chạy skill `security-audit` trước khi push.

### Giai đoạn 0: Dọn (nửa ngày)

1. **Commit lockfile** đã sạch JFrog; hỏi IS về lịch sử git (host nội bộ nằm trong commit `d344bf9` đã đẩy lên remote).
2. Xóa `SET_IDS` (không ai dùng); quyết định giữ hay bỏ `keysToVector` (chỉ test dùng).
3. Xóa file build cục bộ (`dist/`, `tsconfig.tsbuildinfo`, `.perf*`): đã được `.gitignore`, chỉ để máy gọn.
4. **Đồng bộ tài liệu:** README; 02-plan (trạng thái, mâu thuẫn, lịch); sắp lại bảng lộ trình 05; ghi vào đầu 04-script "số liệu thật ở v1.json"; thêm Dì Út và Mẹ vào danh sách nhân vật.
5. Gỡ tiêu đề gõ cứng ở `RoamScreen.tsx:273` (thêm `title` vào `RoamMap`).
6. Đánh dấu `Scene.ui` là "chưa dùng, dành cho mini-game" trong `types.ts` (hoặc gỡ cho tới khi làm mini-game).
7. **Nền tảng kỹ thuật:** `ErrorBoundary` + màn "máy chưa chạy được 3D" (kèm lối chơi chữ), CI chạy `npm test` + `typecheck` + `build`, `.nvmrc`/`engines`, tách chunk `sets` (three/drei riêng).
8. Thêm email liên hệ và trang credit vào màn kết thúc.

### Giai đoạn 1: Nền tảng gộp (quyết định kiến trúc, ~3–4 ngày)

Đã chốt "đi lại là chế độ chính". Các bước, mỗi bước một commit:

1. `RoamScreen` nhận `GameState` từ ngoài và trả state mới khi thoát (thay vì tự `createGame`).
2. Thêm `mapId` vào `Stage`: vào chặng → cắt cảnh (nếu có) → vào map → hoàn thành nhiệm vụ "qua ải" → sang chặng sau.
3. Kết thúc trong chế độ đi lại: chặng cuối xong thì chọn kết thúc từ chỉ số + cờ, hiện màn danh hiệu; chỉ số về 0 cũng kết thúc.
4. Đổi E8 sang cờ `dodged:3` + Sức tối thiểu; cập nhật test phân bố kết thúc.
5. Nút "Chế độ chữ" (luồng hộp thoại hiện có) làm lối nhẹ cho máy yếu; có test để hai lối ra cùng kết thúc khi cùng lựa chọn.
6. **Lưu tiến độ** (`localStorage`, có khóa phiên bản).

### Giai đoạn 2: Bản sớm (chặng 3–6 chơi được trọn vẹn, ~1–1.5 tuần)

- Map đi lại cho phố Tết (chặng 3) và nhà trên (chặng 6): chọn quà, xe ôm, mâm cỗ gắp mời.
- Nhân vật **Mẹ** (xuất hiện ở cuối chặng 5/6, chuẩn bị cho twist), cảnh cắt đoạn kể.
- Bổ sung thẻ mẹo có nguồn (T04, T06, T07, T09 đã có nguồn trong script), `textByRegion`/`replyByRegion` cho các câu hay nhất.
- Cân bằng vòng hai: E6/E7 (sinh viên E6 43%, E7 ~0%), mô phỏng lại.
- **Thẻ chia sẻ danh hiệu** (Canvas → PNG, Web Share trên điện thoại) và analytics đếm lượt.
- **Đo FPS trên điện thoại thật** (chạy `npm run perf` rồi thử máy thật); nếu không mượt thì quyết định 2.5D **trước khi** làm thêm cảnh.

### Giai đoạn 3: Âm thanh (song song với giai đoạn 2, ~1 tuần)

1. Module Web Audio + nút tắt tiếng + mở khóa lần chạm đầu.
2. SFX giao diện, bước chân, bong bóng, nhiệm vụ (rẻ, hiệu quả lớn nhất).
3. Ambience theo set/vùng, nhạc nền theo chặng, duck khi hội thoại.
4. Trang credit ghi nguồn và license từng file.

### Giai đoạn 4: Hoàn chỉnh hành trình (chặng 1–2, 7–9, ~2–3 tuần)

- **Chặng 1** (săn vé): mini-game feed vé + cuộc gọi mẹ + **E4 "Tết xa nhà"** (kịch bản gốc).
- **Chặng 2**: tiệc tất niên đi giữa các bàn.
- **Chặng 7–9**: giao thừa, xông đất + nhảy cùng Dương Gió Mùa, chia lì xì, mẹ gói đồ, **twist MC Mít Ướt** nối lịch sử lựa chọn.
- Màn **"Sao kê Tết"** riêng, không đặt cạnh MC Mít Ướt (03-cameo).

### Giai đoạn 5: Ra mắt

Playtest 5–10 người (có người Trung và Nam duyệt giọng), tối ưu điện thoại, sửa lỗi, `security-audit`, redeploy. Lịch (bản sớm ~20/12, bản đầy đủ ~10/1/2027) chờ bạn chốt; mình chỉ phân tích, không chốt thay.

### Thứ tự và điểm dừng (đề xuất)

`Dọn (GĐ 0)` → `Đo FPS điện thoại` (điểm dừng) → `Gộp (GĐ 1)` → `Bản sớm + âm thanh (GĐ 2–3)` → playtest vòng 1 (điểm dừng) → `GĐ 4` → `Ra mắt`.

---

## 11. Câu hỏi còn mở cho chủ dự án

1. **E4:** theo kịch bản gốc ("Tết xa nhà", cần chặng 1), hay thêm kết thúc theo chỉ số trước? (mục 4)
2. **Lịch ra mắt:** phương án A (bản sớm ~20/12) hay B (một lần ~5/1)?
3. **Câu hỏi giới tính** của Dì Út/Cô Hai: có thêm người ngắt lời theo quy tắc 04-script mục 7 không?
4. **Lịch sử git:** có xóa host JFrog khỏi lịch sử không (cần IS/chủ repo quyết)?
5. **Phong cách âm thanh** và nguồn (tự làm hay CC0 pack nào).
