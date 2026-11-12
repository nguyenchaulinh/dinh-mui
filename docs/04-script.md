# ĐINH MÙI: Kịch bản full hành trình (bản nháp 1)

Ngày 12/11/2026. Đi kèm [02-plan.md](02-plan.md) (plan đang chạy) và [03-cameo.md](03-cameo.md) (quy tắc nhân vật nhại).

> **Cập nhật 12/11 (sau khi chốt 3D 100%):** đây là kịch bản gốc. Mỗi chặng giờ là một **bản đồ đi lại được** (xem [05-gameplay.md](05-gameplay.md)), không còn là cảnh xem + hộp thoại. **Số hiệu ứng trong các bảng dưới là bản nháp, nguồn thật là `src/content/v1.json`** (đã cân bằng lại: Lầy tốn Ví, Khéo tốn thêm Sức). Hiện chỉ chặng 5 được dựng thành bản đồ đi lại; lời thoại các chặng 3, 4, 6 đã gỡ khỏi `v1.json` và còn trong lịch sử git (commit `442c7d9`), sẽ chuyển lại khi làm bản đồ tương ứng.

**Hướng đã chốt:** mỗi chặng là một cảnh 3D low-poly mà người chơi đi lại và nói chuyện với nhân vật (kịch bản gốc ghi là "camera dẫn"). Hành trình đi từ thành phố (Hà Nội, Đà Nẵng hoặc Sài Gòn) về quê rồi quay lại thành phố.

**Chưa làm chi tiết (theo yêu cầu):** tỉnh quê cụ thể của từng thành phố. Kịch bản dùng "quê" chung theo vùng (Bắc, Trung, Nam).

---

## 0. Tổng quan

### 0.1 Luồng chơi

```
Mở đầu ─ chọn vai + thành phố
  1. Săn vé            (thành phố, vài tuần trước Tết)
  2. Tất niên ở phố    (văn phòng hoặc ký túc xá, quanh 23 tháng Chạp)
  3. Ra bến            (đường phố ngày 28 tháng Chạp)
  4. Đường về          (bến xe / xe khách / xe máy / đi nhờ xe → cổng làng)
  5. Bước vào nhà      (chiều 28 tháng Chạp)
  6. Mâm cơm tất niên  (29 tháng Chạp)
  7. Giao thừa         (đêm 29 tháng Chạp)
  8. Mùng 1            (xông đất, lì xì)
  9. Quay lại phố      (mùng 4–5) ─ twist góc nhìn của mẹ
Kết thúc ─ danh hiệu + thẻ share │ (màn riêng) Sao kê Tết
```

### 0.2 Bảng chặng

| # | Chặng | Bối cảnh 3D | Ngày trong game | Số lựa chọn | Cameo | Bản |
|---|---|---|---|---|---|---|
| 0 | Mở đầu | Bản đồ 3D thu nhỏ: 3 thành phố, đường về quê | – | chọn vai, chọn phố | Bé Dê | v1 |
| 1 | Săn vé | Văn phòng / phòng KTX, màn hình điện thoại | vài tuần trước Tết | 2 + mini-game | Chị Chốt Đơn (gốc) | v1 |
| 2 | Tất niên ở phố | Tiệc công ty / liên hoan lớp, phòng trọ | quanh 23 Chạp (30/1) | 3 | MC Chớp Nhoáng (v1.1) | v1 |
| 3 | Ra bến | Đường phố đông, xe chở hoa, chợ hoa | 28 Chạp (4/2) | 2 | Anh Shipper Tết (gốc) | v1 |
| 4 | Đường về | Bến xe, xe giường nằm, quốc lộ, trạm dừng | 28 Chạp | 3 | Thái Gara 99, Chú Ba Triết Lý (gốc) | v1 |
| 5 | Bước vào nhà | Cổng làng, sân, chó nhà, bàn nước | chiều 28 Chạp | 3 | Bà Tám Nhóm Chat (gốc) | v1 |
| 6 | Mâm cơm tất niên | Nhà trên, mâm cỗ, bàn thờ | 29 Chạp (5/2) | 4 | Duy Đèn Cầy; Bà Năm Siêu To, Tân Một Tô, bi-a (sau) | v1 |
| 7 | Giao thừa | Sân đêm, bàn thờ, TV chiếu pháo hoa | đêm 29 Chạp | 2 | Thầy Phong Thủy Mạng (gốc) | v1 |
| 8 | Mùng 1 | Cổng nhà buổi sáng, đầu ngõ | mùng 1 (6/2) | 3 + mini-game | Dương Gió Mùa | v1 |
| 9 | Quay lại phố | Sân sáng sớm, sân khấu twist, xe rời làng, căn phòng ở phố | mùng 4–5 (9–10/2) | 2 | MC Mít Ướt | v1 |

**Ngày dương lịch** lấy từ [01-research.md](01-research.md) mục 1. Một số ngày là tự tính từ mùng 1 (6/2/2027), cần kiểm tra lại trước khi hiện trong game.

**Thời lượng:** khoảng 25 lựa chọn + 2 mini-game + các đoạn cắt cảnh ngắn, ước tính 12–14 phút. Research đặt mục tiêu 8–12 phút. Nếu playtest thấy dài, gộp chặng 2 với 3, và chặng 7 vào 6.

### 0.3 Quy ước

- **Chỉ số:** **H** = Hòa khí, **S** = Sức chịu đựng, **V** = Ví. Ví dụ `H+5 S-5 V-10`. Mọi số là nguyên.
- **Kiểu đáp:** Khéo / Thật thà / Lầy / Phản đòn.
- **Thẻ mẹo:** `[T01]`... xem mục 3. Thẻ ghi **CẦN NGUỒN** thì chưa được đưa vào bản phát hành.
- **Cờ (flag):** `{ve-lua}`, `{xe-khach}`... dùng để rẽ nhánh. Engine hiện chưa có, xem mục 6.
- **Bản:** `(v1.1)`, `(v1.2)` = phần làm sau. Không ghi gì = v1.
- **Persona:** **SV** = sinh viên năm cuối, **ĐL** = mới đi làm, **ĐT** = độc thân 27+.

---

## 1. Biến thể theo thành phố

Dùng chung một bộ cảnh, đổi đạo cụ, hoa, ánh sáng và giọng thoại theo thành phố đã chọn. Nếu người chơi chọn cả 3, mỗi chặng lấy ngẫu nhiên một biến thể, và mâm cỗ có món của cả ba miền ("mâm cỗ liên vùng").

| | Hà Nội | Đà Nẵng | Sài Gòn |
|---|---|---|---|
| Thời tiết | Rét, mưa phùn, trời xám | Gió, se lạnh, nắng nhẹ | Nắng, khô |
| Văn phòng | Cửa sổ nhìn mái phố, áo khoác dày treo ghế | Cửa sổ nhìn sông và cầu | Tòa cao tầng, máy lạnh, cây xanh |
| Phố ngày Tết | Xe máy chở cành đào, cờ đỏ trên phố | Chợ hoa ven sông, mai vàng | Xe chở chậu mai, đường hoa |
| Bến (tên tham khảo, kiểm tra lại trước khi dùng tên thật) | Bến xe phía Nam / phía Tây | Bến xe trung tâm | Bến xe Miền Tây / Miền Đông |
| Quê (chung, chưa ghi tỉnh) | Làng đồng bằng: cổng làng, lũy tre, ao, nhà mái ngói, sân gạch | Làng miền Trung: nhà mái thấp, gió, cát hoặc chân núi | Miệt vườn: kênh rạch, cầu gỗ, vườn cây, hiên rộng |
| Hoa trong nhà | Đào, quất | Mai | Mai vàng |
| Mâm cỗ (đạo cụ) | Bánh chưng, giò lụa, thịt đông, dưa hành, nem rán, canh măng, xôi gấc | Bánh tét, nem chua, tré, dưa món, thịt heo ngâm mắm | Bánh tét, thịt kho hột vịt, canh khổ qua, củ kiệu, lạp xưởng |
| Giọng họ hàng | "cháu", "thế", "nhỉ", "bao giờ" | "răng", "rứa", "mô", "tê" | "nhen", "hông", "vậy đó", "nghen" |

**Ví dụ câu chào của Cô Hai theo 3 giọng:**
- Hà Nội: "Về rồi đấy à? Ngồi đây cô hỏi cái, giờ lương tháng bao nhiêu rồi?"
- Đà Nẵng: "Về rồi đó hả con? Ngồi xuống đây, răng rồi, lương tháng nhiêu rồi?"
- Sài Gòn: "Về rồi hả con? Ngồi đây cô hỏi nè, giờ lương tháng nhiêu rồi?"

Giọng Trung và Nam cần người địa phương đọc duyệt trong playtest. Món ăn và hoa là đạo cụ trong cảnh; nếu đưa lên thẻ mẹo thì phải có nguồn (T11).

**Lưu ý khi làm tỉnh quê sau này:** năm 2025 Việt Nam đã sáp nhập nhiều tỉnh, nên tên tỉnh quê trong game phải theo địa giới hiện hành. Cần kiểm tra lại khi làm.

---

## 2. Kịch bản từng chặng

### Mở đầu: "Về quê sống sót"

**Cảnh 3D:** bản đồ Việt Nam thu nhỏ kiểu đồ chơi, ba thành phố là ba đảo nhỏ phát sáng, các con đường tỏa về những ngôi làng. Bé Dê (linh vật năm Mùi) nhảy lên giữa bản đồ.

> **Bé Dê:** "Năm nay là năm của Dê, nên Dê dẫn bạn về quê. Về thì dễ, sống sót mới khó."

1. **Chọn vai:** SV / ĐL / ĐT. Hiện thẻ mô tả ngắn.
2. **Chọn thành phố:** Hà Nội / Đà Nẵng / Sài Gòn / Cả 3. Camera zoom vào thành phố đã chọn rồi chuyển sang chặng 1.

Chỉ số khởi đầu: mặc định 50/50/50.
- SV: `V 30`, S 60 (nghèo nhưng khỏe).
- ĐL: `V 45`.
- ĐT: `S 40`, V 60.

---

### Chặng 1: Săn vé

**Cảnh 3D:**
- **ĐL/ĐT:** văn phòng chiều muộn, đèn bàn, laptop, cốc cà phê nguội.
- **SV:** phòng KTX, giường tầng, mì gói, quần áo phơi.

**Camera:** từ toàn cảnh thành phố (theo biến thể) lướt vào cửa sổ, rồi zoom vào điện thoại trên tay nhân vật. UI feed hiện lên phủ màn hình.

**1.1 · Đồng nghiệp Hùng (ĐL/ĐT) / bạn cùng phòng Na (SV)**
> "Mua vé Tết chưa? Năm nay nghe nói vé cháy sớm lắm."

| Kiểu | Đáp | Hiệu ứng | Phản ứng |
|---|---|---|---|
| Khéo | "Để tối nay săn, săn được rủ ông/bà đi chung." | H+3 S-3 | "Nhớ đó nghe, đừng có bỏ tui." |
| Thật thà | "Chưa, nhìn giá vé mà muốn ở lại luôn." | S+3 | "Ở lại thì Tết ai nấu cơm cho mà ăn?" |
| Lầy | "Tui đi bộ về, vừa tiết kiệm vừa giảm cân." | S+5 | "Đi tới nơi là qua Rằm luôn đó." |

**1.2 · Mini-game "Lướt feed vé Tết"**
Năm bài đăng trượt lên trên màn hình điện thoại. Người chơi chạm để chọn nơi mua vé.

| Bài đăng | Thật / lừa | Nếu chọn |
|---|---|---|
| Trang chính thức của nhà xe/đường sắt, có tổng đài | Thật | V-10, nhận vé `{co-ve}` |
| Fanpage "VÉ TẾT GIÁ SỐC" đòi cọc 50% vào tài khoản cá nhân | Lừa | V-20 S-10 `{ve-lua}` [T01] |
| "Pass lại vé rẻ hơn 20%, inbox nhanh" | Lừa | V-15 S-5 `{ve-lua}` [T01] |
| "Suất nội bộ, vé giờ chót, còn 2 vé" | Lừa | V-15 S-5 `{ve-lua}` [T02] |
| **Chị Chốt Đơn** livestream: "Còn 3 vé cuối nha cả nhà, chốt đơn đi!" | Lừa | V-20 S-5 `{ve-lua}` [T02] |

Sau mini-game, chọn **cách về** (nếu chưa bị lừa): xe khách giường nằm `{xe-khach}` (V-0, đã tính trong vé) / tự chạy xe máy `{xe-may}` (V+5, sẽ tốn sức ở chặng 4) / "Để tính sau" `{chua-ve}`.

> **Bé Dê** (nếu `{ve-lua}`): "Vé không có, tiền cọc cũng không. Thôi, tới bến rồi tính."

**1.3 · Mẹ gọi video**
Màn hình điện thoại chuyển sang cuộc gọi. Mẹ cầm máy quá gần, chỉ thấy nửa mặt (gag quen thuộc).
> **Mẹ:** "Bao giờ con về? Mẹ ngâm gạo, mua lá rồi đó."

| Kiểu | Đáp | Hiệu ứng | Ghi chú |
|---|---|---|---|
| Khéo | "Dạ 28 con về, mẹ đừng làm nhiều quá." | H+5 | |
| Thật thà | "Dạ con còn đang tính, vé khó quá mẹ." | H-3 S+3 | |
| Lầy | "Mẹ nghiêng máy lên chút, con chỉ thấy cái cằm." | H+3 S+3 | Mẹ: "Thấy cằm là được rồi." |
| Phản đòn | "Năm nay con ở lại làm thêm, mẹ ạ." | H-10 | Nhánh ẩn: Bé Dê hỏi lại "Chắc chưa?". Xác nhận thì sang **kết thúc E4 "Tết xa nhà"**, không xác nhận thì quay về chọn lại. |

---

### Chặng 2: Tất niên ở phố

**Thời điểm:** quanh 23 tháng Chạp (30/1, ngày Ông Công Ông Táo).

#### 2A. ĐL/ĐT: tiệc tất niên công ty

**Cảnh 3D:** sảnh tiệc nhỏ, bàn tròn, băng rôn "Year End Party", sân khấu có micro. Đồng nghiệp mặc áo dài hoặc vest.

**Camera:** quét ngang các bàn, dừng ở bàn người chơi. Khi có quiz thì camera xoay về sân khấu.

**2A.1 · Sếp đi chúc từng bàn**
> **Sếp:** "Năm nay em thấy công ty thế nào? Thưởng Tết vừa lòng chưa?"

| Kiểu | Đáp | Hiệu ứng | Phản ứng |
|---|---|---|---|
| Khéo | "Dạ năm nay em học được nhiều, năm sau em cố hơn nữa ạ." | H+5 S-5 | "Tốt, năm sau giao thêm việc." |
| Thật thà | "Dạ thưởng hơi mỏng so với công sức ạ." | H-5 S+5 V+5 | Sếp ghi chú vào điện thoại. Đầu năm được xét lại. |
| Lầy | "Dạ thưởng nhiêu em cũng mang về khoe mẹ hết ạ." | H+3 S+3 | "Khoe thì khoe, đừng khoe con số." |

**2A.2 · Đồng nghiệp rót bia** *(rượu bia chỉ xuất hiện ở ngữ cảnh cảnh báo)*
> **Đồng nghiệp:** "Tết mà, một ly thôi!"

| Kiểu | Đáp | Hiệu ứng | Phản ứng |
|---|---|---|---|
| Khéo | "Em đi xe máy, em xin nước ngọt, cụng ly vẫn nhiệt tình." | H+2 S+3 [T05] | "Ok, nước ngọt cũng là ly." |
| Thật thà | "Em không uống được, thật ạ." | H-2 S+5 | |
| Lầy | "Em uống bằng mắt, nhìn ly của anh là say rồi." | H+5 | Cả bàn cười. |

Không có lựa chọn "uống rồi lái xe". Nếu cần nói đến chuyện uống, chỉ để nhân vật gọi xe về, kèm [T05].

**2A.3 · Nhóm chat công ty bàn mức lì xì con sếp**
Tin nhắn liên tục hiện lên: "Mọi người lì xì con sếp bao nhiêu?", "Năm ngoái chị bỏ 500", "Thôi theo mức chung đi".

| Kiểu | Đáp | Hiệu ứng |
|---|---|---|
| Khéo | Theo mức chung của nhóm | V-10 H+5 [T04] |
| Thật thà | Bỏ mức vừa với túi mình | V-5 H-2 |
| Lầy | Gửi sticker "đang suy nghĩ" rồi im lặng | S+5 H-3 |

**2A.4 · Quiz tất niên với MC Chớp Nhoáng (v1.1)**
MC lao lên sân khấu, đồng hồ đếm ngược 3 giây mỗi câu. Ba câu đố về Tết: năm nay năm con gì, dấu hiệu vé Tết lừa đảo, ngày Ông Công Ông Táo. Mỗi câu đúng H+2 V+3 (giải thưởng nhỏ). Ở v1 tạm thay bằng màn **bốc thăm may mắn** do sếp rút.

#### 2B. SV: liên hoan cuối kỳ + cúng ông Táo ở phòng trọ

**Cảnh 3D:** lớp học kê bàn liên hoan (bánh kẹo, nước ngọt), sau đó chuyển về phòng trọ với một mâm cúng nhỏ trên bàn học.

**2B.1 · Thầy/cô chủ nhiệm**
> "Năm cuối rồi, ra trường em định làm gì?"

| Kiểu | Đáp | Hiệu ứng | Phản ứng |
|---|---|---|---|
| Khéo | "Dạ em đang thực tập, có kế hoạch rồi ạ." | H+5 S-5 | "Tốt, nhớ cập nhật thầy." |
| Thật thà | "Dạ em chưa biết, em hơi lo ạ." | S+5 | "Lo là bình thường. Chưa biết thì đi hỏi." |
| Lầy | "Dạ ra trường em đi tìm việc ạ." | S+3 | "Câu trả lời không sai nhưng vô dụng." |

> Bé Dê: "Câu này về quê sẽ còn được hỏi thêm khoảng... ba mươi lần nữa."

**2B.2 · Góp tiền mua mâm cúng ông Táo**
Bạn cùng phòng: "Mỗi đứa góp 50 nghìn mua cá chép với mâm cúng nhé."
- Góp đủ, đi mua cùng: V-5 H+5
- Góp tiền nhưng xin ngủ: V-5 S+5
- "Tao góp tinh thần": H-5 S+3

**2B.3 · Thả cá chép ở hồ gần trường**
Lựa chọn: thả cá rồi mang túi nilon về bỏ thùng rác (H+3 [T14]) / thả cả túi (H-5, Bé Dê nhắc). Thẻ T14 **CẦN NGUỒN**.

---

### Chặng 3: Ra bến

**Thời điểm:** ngày 28 tháng Chạp (4/2), ngày đầu kỳ nghỉ Tết của công chức theo research.

**Cảnh 3D:** đường phố giờ tan tầm đông nghẹt. Xe máy chở cành đào, chậu mai, cây quất. Đèn đỏ, xe buýt, shipper chở hàng chất cao.

**Camera:** quay bám theo nhân vật đeo balo, kéo theo vali.

**3.1 · Mua quà về quê** (ở cửa hàng đầu ngõ)

| Kiểu | Đáp | Hiệu ứng |
|---|---|---|
| Khéo | Giỏ quà to có nơ đỏ | V-15 H+5 |
| Thật thà | Vài hộp bánh vừa túi tiền | V-5 |
| Lầy | "Con về là món quà lớn nhất rồi." | H-3 S+3 |

**3.2 · Ra bến bằng gì**

| Lựa chọn | Hiệu ứng | Cảnh |
|---|---|---|
| Xe buýt | V-1 S-10 | Đứng ép giữa xe, vali kẹp giữa hai chân |
| Xe ôm công nghệ | V-5 S-3 | Kẹt cạnh **Anh Shipper Tết** chở 20 thùng hàng |
| Nhờ bạn chở | H+3 S-5 | Bạn chở luôn cả giỏ quà, giỏ quà bị bẹp một góc |

> **Anh Shipper Tết:** "Em ơi, Tết của anh bắt đầu sau đơn cuối cùng. Mà đơn cuối thì chưa bao giờ tới."

Biến thể thành phố: Hà Nội mưa phùn, áo mưa phấp phới; Đà Nẵng gió từ sông thổi bay mũ; Sài Gòn nắng, kính râm, mai vàng kín phố.

---

### Chặng 4: Đường về

**Cảnh 3D:** dùng một trong ba đường đi, tùy cờ từ chặng 1.

| Cờ | Cảnh |
|---|---|
| `{co-ve}` + `{xe-khach}` | Bến xe đông nghịt, loa gọi tên nhà xe, rồi vào **trong xe giường nằm**: rèm, đèn tím, người bên cạnh ngáy |
| `{xe-may}` | **Quốc lộ** với đoàn xe máy về quê, xe chở đầy đồ, áo mưa hoặc nắng gắt theo vùng |
| `{ve-lua}` hoặc `{chua-ve}` | Bến xe hết chỗ. **Thái Gara 99** lái xe cũ lướt tới: "Lên đi em, anh họ đây! Đi nhờ không mất tiền, nhưng nghe anh giới thiệu xe thì mất thời gian." |

**4.1 · Trên đường**

*Xe khách:*
> Người bên cạnh ngủ gục lên vai bạn. Xe dừng đón thêm khách, nhét ghế nhựa giữa lối đi.

| Kiểu | Đáp | Hiệu ứng |
|---|---|---|
| Khéo | Để yên cho họ ngủ | H+3 S-8 |
| Thật thà | Nhẹ nhàng đẩy đầu họ về | S+3 |
| Phản đòn | Hỏi nhà xe sao chở quá số khách | S+5 H-3 (Bé Dê: "Đúng, nhưng tài xế không nghe thấy.") |

*Xe máy:*
> Mỏi lưng, đói, trời tối dần.

| Lựa chọn | Hiệu ứng |
|---|---|
| Dừng nghỉ ở cây xăng, ăn tạm | S+5 V-3 [T13] |
| Cố chạy một mạch | S-15 |
| Đi theo đoàn xe đông người cho vui | S-5 H+3 |

*Đi nhờ Thái Gara 99:*
> **Thái Gara 99:** "Con xe này anh nói thật, chủ cũ đi rất giữ gìn, chỉ đi chợ ngày Rằm."

| Kiểu | Đáp | Hiệu ứng | Phản ứng |
|---|---|---|---|
| Khéo | "Xe đẹp anh ơi, nhưng em chưa có nhu cầu ạ." | H+5 S-5 | "Chưa có nhu cầu là sắp có nhu cầu." |
| Thật thà | "Anh cho em ngủ một lát được không ạ?" | S+8 H-2 | Anh mở nhạc to hơn. |
| Lầy | "Anh bớt cho em 99%, em lấy liền." | H+3 S+3 | "Em lấy 1% thôi thì được, cái gương chiếu hậu." [T12] |

**4.2 · Trạm dừng chân**

**Cảnh 3D:** trạm dừng lúc chạng vạng, bàn nhựa, quầy bánh, đèn neon.

> **Chú Ba Triết Lý** (livestream ngay giữa trạm): "Tết này đổi đời! Chỉ một khóa học, tiền tự chảy về túi. Chuyển khoản giữ chỗ, chỉ còn 5 suất!"

| Kiểu | Đáp | Hiệu ứng |
|---|---|---|
| Khéo | Cười, đi mua bánh mì | S+3 V-2 |
| Thật thà | Nói với người bên cạnh đừng chuyển khoản | H+3 [T06] |
| Lầy | Hỏi chú: "Chú đổi đời chưa mà còn đứng đây?" | S+5 |
| *(bẫy)* | Quét mã giữ chỗ | V-20 S-5 [T06] |

*Nếu đi cùng Thái Gara 99:* anh đội mũ nồi, đeo kính râm, tạo dáng chụp ảnh với "fan" ở trạm. Có người mời anh một ly. **Thái Gara 99:** "Anh không uống giọt nào, còn lái cả trăm cây số." [T05]

**4.3 · Đến đầu làng**

**Cắt cảnh 10 giây:** trời chập tối, cổng làng (Bắc) / con đường cát (Trung) / cây cầu gỗ qua kênh (Nam). Con chó nhà (tên **Vàng**) chạy ra, sủa rồi nhận ra chủ, vẫy đuôi.

> **Bé Dê:** "Chặng khó nhất đã xong. Đùa đấy, chặng khó nhất ở trong nhà."

---

### Chặng 5: Bước vào nhà

**Thời điểm:** chiều tối 28 tháng Chạp.

**Cảnh 3D:** sân nhà với cây quất/đào/mai, bàn nước, ấm trà, đĩa hạt dưa. Họ hàng ngồi kín.

**Camera:** góc nhìn người chơi bước qua cổng. Cả sân **đồng loạt quay đầu** (gag). Câu hỏi bay ra thành **bong bóng thoại phóng về phía người chơi** như đạn, người chơi chọn câu nào để "đỡ" trước.

**5.1 · Cô Hai** *(giọng theo thành phố, xem mục 1)*

- **ĐL:** "Giờ lương tháng bao nhiêu rồi?"
- **ĐT:** "Lương cao rồi mà sao chưa lấy vợ/chồng?"
- **SV:** "Ra trường làm gì? Có xin vào nhà nước được không?"

| Kiểu | Đáp | Hiệu ứng | Phản ứng |
|---|---|---|---|
| Khéo | "Dạ cũng đủ sống cô ạ. Mà cô dạo này khỏe không?" | H+5 S-5 [T03] | "Cô khỏe! Mà con ốm đi hay sao ấy..." |
| Thật thà | "Dạ con chưa muốn nói chuyện này ạ." | H-8 S+5 | "Ơ hay, cô hỏi cho vui thôi mà." |
| Lầy | "Đủ mua vé về thăm cô thôi ạ." | H+3 S+5 | "Cái đứa này nhanh miệng ghê!" |
| Phản đòn | "Thế lương của cô bao nhiêu ạ?" | H-15 S+10 | Cả sân im lặng ba giây. |

**5.2 · Bác Cả bình luận ngoại hình**
> "Ơ sao dạo này béo/gầy/đen thế?"

Bé Dê chen vào (đóng khung câu hỏi này là **kém duyên**): "Chuyện cân nặng của người khác thì không phải chủ đề Tết."

| Kiểu | Đáp | Hiệu ứng |
|---|---|---|
| Khéo | "Dạ tại Tết sắp tới nên con tích trữ ạ." | H+3 S-3 |
| Thật thà | "Dạ con thấy bình thường mà bác." | S+3 H-2 |
| Phản đòn | "Bác cũng thế mà bác." | H-10 S+8 |

**5.3 · Bà Tám Nhóm Chat** *(đổi tên từ "Bà Tám Nhóm Zalo" để tránh dùng tên nền tảng thật)*
> Bà giơ điện thoại quay cận mặt: "Cả nhà ơi, cháu về rồi nè! Gửi lên nhóm chat gia đình liền."

| Kiểu | Đáp | Hiệu ứng |
|---|---|---|
| Khéo | Tạo dáng, vẫy tay chào cả nhóm | H+5 S-5 |
| Thật thà | "Bà ơi đừng đăng, con chưa rửa mặt." | H-3 S+5 |
| Lầy | Cướp máy quay ngược lại bà | H+3 S+3 |

**5.4 · Chỉ ĐT: "Cô có đứa này được lắm"**
> **Cô Hai:** "Mùng 2 qua nhà cô, gặp thử nghen. Gặp thôi chứ có bắt cưới đâu."

| Kiểu | Đáp | Hiệu ứng |
|---|---|---|
| Khéo | "Dạ để con xem lịch ạ." | H+3 `{xem-mat}` |
| Thật thà | "Dạ con xin phép không đi ạ." | H-5 S+5 |
| Lầy | "Cô mai mối giỏi vậy sao cô không mở công ty?" | H+3 S+3 |

---

### Chặng 6: Mâm cơm tất niên ("Boss fight")

**Thời điểm:** 29 tháng Chạp (5/2), chiều.

**Cảnh 3D:** nhà trên, bàn thờ khói hương phía sau, mâm cỗ đặt giữa (món theo thành phố, xem mục 1), TV bật chương trình Tết.

**Camera:** quay vòng quanh mâm, cận cảnh từng món. Mỗi họ hàng xuất hiện kèm **thẻ tên kiểu game đối kháng**, ví dụ "CÔ HAI · Chuyên mục: Thu nhập".

**Đội hình:** Cô Hai, Bác Cả, Chú Ba Ăn Nhậu, **Duy Đèn Cầy**, em họ Bin (Gen Alpha).

**6.1 · Duy Đèn Cầy review mâm cỗ**
Ánh nến bật lên sau lưng, Duy cầm muỗng như cầm micro.
> "Miếng bánh chưng (bánh tét) này có vị... của sự đoàn viên chưa chín. Còn con thấy sao?"

| Kiểu | Đáp | Hiệu ứng | Phản ứng |
|---|---|---|---|
| Khéo | "Dạ con xin ăn thêm miếng nữa cho chắc ạ." | H+8 S-3 | "Có tâm! Chú thơ chậm một câu tặng con." |
| Thật thà | "Dạ con thấy hơi sống thật." | H-5 S+5 [T11] | "Thật thà là đức tính... dễ bị mời xuống bếp." |
| Lầy | "Chú review thêm món giò đi, con nghe mà đói." | H+5 S+3 | Duy chuyển sang "chế độ thơ", đọc một câu lục bát về giò lụa. |

**6.2 · Bác Cả: "Con nhà người ta"**
> "Con Ngân nhà bác Tư đi làm hai năm mua nhà rồi đấy."

| Kiểu | Đáp | Hiệu ứng | Phản ứng |
|---|---|---|---|
| Khéo | "Dạ giỏi quá, để con xin bí quyết bạn ấy ạ." | H+5 S-5 | |
| Thật thà | "Dạ mỗi người một hoàn cảnh bác ạ." | H-3 S+5 | |
| Lầy | "Dạ con mua được cái nhà... trong game rồi ạ." | H+3 S+5 | Bin: "Game nào, cho em chơi với!" |
| Phản đòn | "Bác ơi, thế bác Tư có hỏi nhà bác chưa?" | H-12 S+8 | |

**6.3 · Chú Ba Ăn Nhậu mời rượu** *(chỉ ở ngữ cảnh cảnh báo)*
> "Một ly thôi, Tết mà, không uống là không nể chú!"

| Kiểu | Đáp | Hiệu ứng |
|---|---|---|
| Khéo | "Con xin phép, mai con chở bà đi chùa ạ." | H+3 [T05] |
| Thật thà | "Con không uống được chú ạ." | H-3 S+3 |
| Lầy | Rót nước chè, nâng ly "trăm phần trăm" | H+5 |

**6.4 · Combo cuối: cả mâm hỏi cùng lúc**
Năm bong bóng câu hỏi bay ra một lượt: lương, người yêu, nhà, cân nặng, "bao giờ có cháu". Người chơi chọn một chiến thuật:

| Chiến thuật | Hiệu ứng | Cảnh |
|---|---|---|
| Khéo: gắp thức ăn mời từng người | H+10 S-15 | Mỗi lần gắp, một bong bóng vỡ |
| Thật thà: đứng dậy trả lời một lần cho cả nhà | H-5 S+10 | Cả nhà vỗ tay hoặc im lặng tùy chỉ số H |
| Lầy: hỏi ông bà chuyện Tết ngày xưa | H+8 [T03] | Ông kể chuyện, cả mâm quên hết câu hỏi |
| Phản đòn: hỏi ngược lương các bác | H-15 S+10 | Bin quay TikTok cảnh này |

Câu hỏi mang định kiến giới (nếu có ở bản sau) luôn được đặt là câu **kém duyên**, có người lớn khác ngắt lời. [T08]

**Phần mở rộng (làm sau):**
- **(Mùa Tết) Bà Năm Siêu To** bê ra nồi canh khổng lồ, ép người chơi ăn thêm: S-5 H+5.
- **(v1.2) Tân Một Tô** ghé tặng "chút quà mọn" là điện thoại đời mới. Cả họ đem ra so sánh với người chơi. [T15]
- **(v1.2) Mini-game "Bi-a mâm cỗ":** hai anh cơ thủ của làng là **Hoàng Sao Hỏa** và **Tuấn Tê-Cơ** ghé chơi. Người chơi dùng đũa làm cơ, chọc quả quýt vào đĩa mứt. Hai anh bắt tay thân thiện, cả họ khen. **Không có yếu tố cá cược, không thắng thua bằng tiền.**

---

### Chặng 7: Giao thừa

**Thời điểm:** đêm 29 tháng Chạp. Năm nay tháng Chạp chỉ có 29 ngày, nên không có "30 Tết" (theo research, cần kiểm tra lại).

**Cảnh 3D:** sân đêm, mâm cúng giao thừa ngoài trời, bàn thờ trong nhà sáng đèn. TV chiếu pháo hoa ở thành phố. Đồng hồ đếm ngược hiện trên màn hình. **Không có pháo nổ trong cảnh.**

**7.1 · Nhóm chat gia đình nổ tung**
200 tin nhắn chúc Tết, xen giữa là một tin: "Nhận lì xì online đầu năm, bấm vào đây!"

| Lựa chọn | Hiệu ứng |
|---|---|
| Bấm thử | V-15 S-5 [T06] |
| Nhắn cả nhóm: "Cả nhà đừng bấm link lạ nhé" | H+5 S-3 [T06] |
| Gửi sticker "Chúc mừng năm mới" rồi tắt máy | S+5 |

**7.2 · Thầy Phong Thủy Mạng livestream trên TV của mẹ**
> "Tuổi Mùi năm nay phạm hạn! Giải hạn chỉ 386 nghìn, chuyển khoản trước giao thừa."

Mẹ đã cầm điện thoại định chuyển.

| Kiểu | Đáp | Hiệu ứng |
|---|---|---|
| Khéo | "Mẹ ơi, để sáng mai con xem kỹ giúp mẹ nhé." | H+5 [T06] |
| Thật thà | "Mẹ, lừa đảo đấy, đừng chuyển." | H-3 S+3 [T06] |
| Lầy | "Năm của Dê mà hạn gì, Dê ngồi đây nè." (Bé Dê vẫy tay) | H+3 S+3 |

**Đếm ngược:** cả nhà đứng trước bàn thờ, camera chậm rãi đẩy vào. Màn hình trắng, rồi hiện chữ: **"Chúc mừng năm mới Đinh Mùi!"**

---

### Chặng 8: Mùng 1

**Thời điểm:** sáng mùng 1 (6/2).

**Cảnh 3D:** cổng nhà buổi sáng, áo mới, câu đối đỏ, nắng nhẹ (Nam) hoặc mưa phùn (Bắc).

**8.1 · Xông đất: Dương Gió Mùa**
**Cắt cảnh:** nhạc nổi lên. Ở đầu ngõ, **Dương Gió Mùa** gánh xôi gấc đi tới, vừa đi vừa múa đấm bốc. Camera góc thấp kiểu nhân vật chính xuất hiện.
> **Dương Gió Mùa:** "Xông đất đây! 8386, mãi đỉnh!"

> **Mẹ:** "Ơ, mẹ đã nhờ ai xông đất đâu nhỉ?"

| Kiểu | Đáp | Hiệu ứng |
|---|---|---|
| Khéo | Mời anh vào nhà, nhận xôi | H+8 [T10] |
| Thật thà | "Để bố con xem tuổi đã ạ." | H+2 S-3 |
| Lầy | Tự chạy ra cổng xông đất trước anh | H+3 S+5 |

**8.2 · Mini-game "Chia lì xì"**
Phong bao đỏ xếp trên bàn. Người chơi kéo thanh trượt mức tiền cho từng người. Tổng tiền trừ vào Ví.

| Người nhận | Ảnh hưởng |
|---|---|
| Ông bà | H tăng nhiều |
| Bố mẹ | H tăng nhiều |
| Năm đứa em nhỏ | H tăng ít cho mỗi đứa; bỏ sót một đứa thì H-5 |
| Con sếp (chỉ ĐL/ĐT) | Theo mức đã chọn ở 2A.3 |
| Em Bin (Gen Alpha) | Đòi chuyển khoản qua QR: "Anh/chị quét mã em đi, tiền mặt lỗi thời rồi." |

**SV:** chủ yếu **được nhận** lì xì (V+), nhưng anh chị họ trêu: "Năm sau đi làm rồi là đến lượt em đó."

Lì xì quá sức thì S-5 [T04].

**8.3 · Tin nhắn "hỗ trợ Tết" gửi vào máy của bố**
> "BHXH hỗ trợ Tết 2 triệu, bấm link cập nhật thông tin để nhận."

| Lựa chọn | Hiệu ứng |
|---|---|
| Chặn số, giải thích cho bố | H+5 [T07] |
| Để bố tự xử lý | V-10 H-3 [T07] |

**8.4 · Chỉ ĐT có `{xem-mat}`: buổi xem mắt bất đắc dĩ (mùng 2)**
**Cảnh 3D:** quán cà phê đầu làng, Cô Hai ngồi bàn bên cạnh giả vờ đọc báo.

| Kiểu | Đáp | Hiệu ứng |
|---|---|---|
| Khéo | Nói chuyện lịch sự, kết bạn | H+8 S-5 `{hop-nhau}` |
| Thật thà | "Mình bị cô ép đi, xin lỗi bạn nha." | H-3 S+5 |
| Lầy | Cả hai cùng quay sang hỏi Cô Hai | H+5 S+5 |

---

### Chặng 9: Quay lại phố (twist góc nhìn của mẹ)

**Thời điểm:** sáng mùng 4 hoặc mùng 5 (9 hoặc 10/2).

**Cảnh 3D:** sân nhà sáng sớm, sương. Mẹ nhồi đồ vào thùng xốp: bánh chưng (bánh tét), giò, rau, gà, chai nước mắm.

**9.1 · Mẹ nhét đồ**
> **Mẹ:** "Mang thêm cái này, ở trên đó làm gì có."

| Kiểu | Đáp | Hiệu ứng |
|---|---|---|
| Khéo | Nhận hết, ôm mẹ | H+10 S-5 |
| Thật thà | "Mẹ ơi, nhiều quá con mang không nổi." | H-3 S+5 |
| Lầy | "Mẹ gói luôn con gà sống cho con nuôi ở phòng trọ." | H+5 S+3 |

**9.2 · Twist: góc nhìn của mẹ**
**Cắt cảnh khoảng 30–45 giây, không có lựa chọn:**
1. Camera chuyển sang **góc nhìn của mẹ**. Màn hình hơi mờ như ký ức.
2. Bối cảnh tan thành **một sân khấu tối có một chùm đèn**. **MC Mít Ướt** bước ra, vest lấp lánh, tay cầm khăn giấy, đọc những suy nghĩ của mẹ:
   - "Hỏi lương... vì sợ con ở trên đó không đủ ăn."
   - "Giục cưới... vì sợ sau này con một mình."
   - "Nhét đồ... vì không biết làm gì khác để nói thương con."
3. **Nối với lựa chọn trước đó của người chơi** (đọc từ lịch sử):
   - Nếu 5.1 chọn Phản đòn: "Hôm con cãi Cô Hai, tối đó cô gọi mẹ, hỏi con có ổn không."
   - Nếu 1.3 chọn Lầy: "Mẹ cầm máy sai góc là vì mẹ muốn nhìn con gần hơn."
   - Nếu 6.4 chọn Lầy: "Ông kể chuyện Tết xưa cả buổi, lâu lắm rồi ông mới vui vậy."
4. MC Mít Ướt khóc trước cả người chơi: "Tôi xin lỗi... tôi không chịu nổi những cảnh này."
5. Cắt về hiện tại: mẹ đứng ở cổng vẫy tay, con Vàng chạy theo xe một đoạn.

**9.3 · Câu hỏi cuối**
> **Mẹ:** "Tết sau con có về nữa không?"

Cả bốn nút đều là "Về", mỗi nút một kiểu:
- Khéo: "Dạ về ạ."
- Thật thà: "Về chứ mẹ."
- Lầy: "Về, mẹ nhớ ngâm gạo sớm."
- Phản đòn: "Mẹ hỏi gì kỳ vậy, về chứ sao không."

**Cắt cảnh kết:** xe chạy ngược về thành phố (tua nhanh). Căn phòng trọ trống. Người chơi mở thùng xốp: bánh chưng, giò, và một mảnh giấy viết tay **"Ăn uống đầy đủ nghe con."**

> **Bé Dê:** "Dù sao thì... vẫn phải về nhà."

→ Màn hình **kết thúc** (mục 4). **Sao kê Tết** nằm ở một màn riêng, mở bằng nút trên màn kết thúc, do Bé Dê đọc. **Không bao giờ đặt MC Mít Ướt cạnh Sao kê Tết** (theo 03-cameo, mục 2.2).

---

## 3. Thẻ mẹo thật

Chỉ thẻ có nguồn mới được ra bản phát hành. Thẻ **CẦN NGUỒN** phải tìm nguồn hoặc bỏ.

| Mã | Nội dung (nháp) | Nguồn | Trạng thái |
|---|---|---|---|
| T01 | Vé tàu, xe Tết giá rẻ rao trên mạng kèm yêu cầu đặt cọc là chiêu lừa đã được công an cảnh báo. Mua qua kênh chính thức. | [Báo Văn hóa](https://baovanhoa.vn/phap-luat/ve-tau-tet-gia-re-tran-lan-tren-mang-cong-an-canh-bao-bay-mat-tien-coc-198345.html) | Có nguồn |
| T02 | "Vé giờ chót", "vé hủy", "suất nội bộ" là các chiêu lừa vé quen thuộc. | [VnEconomy](https://vneconomy.vn/canh-giac-truoc-chieu-lua-ve-gio-chot-ve-huy-suat-noi-bo.htm) | Có nguồn |
| T03 | Trả lời nhẹ nhàng rồi chuyển sang kế hoạch, hoặc hỏi thăm lại, là cách nhiều bạn trẻ dùng để né câu hỏi riêng tư mà không mất lòng. | VnExpress, Vietcetera (01-research mục 2.1) | Có nguồn |
| T04 | Một khảo sát độc giả VnExpress cho thấy đa số coi lì xì là áp lực tài chính. Lì xì theo độ thân thiết và theo túi tiền là bình thường. | [VnExpress](https://vnexpress.net/ap-luc-li-xi-4554071.html) | Đối chiếu số liệu với bài gốc trước khi ghi con số |
| T05 | Đã uống rượu bia thì không lái xe. | Nghị định 168/2024 | Đối chiếu văn bản gốc; **không ghi mức phạt** cho đến khi kiểm tra |
| T06 | Dịp Tết, kẻ gian dùng link nhận quà, khuyến mãi, "giải hạn" để lừa chuyển tiền. Không bấm link lạ, không chuyển khoản cho người lạ. | [Bộ Công an qua Báo Lào Cai](https://baolaocai.vn/bo-cong-an-canh-bao-chieu-lua-dao-truc-tuyen-dip-tet-va-mua-le-hoi-post892557.html) | Có nguồn |
| T07 | Có kẻ mạo danh BHXH gửi tin "hỗ trợ Tết" để lấy thông tin và tiền. | [LSVN](https://lsvn.vn/bhxh-viet-nam-canh-bao-thu-doan-lua-dao-ho-tro-tet-a168060.html) | Có nguồn |
| T08 | Một số câu hỏi Tết mang định kiến giới, nên tránh. | [Vietcetera](https://vietcetera.com/amp/vn/5-cau-hoi-phan-biet-gioi-tranh-hoi-dip-le-tet) | Có nguồn, dùng sau |
| T09 | Lịch nghỉ Tết Đinh Mùi của công chức. | [CafeF](https://cafef.vn/bo-noi-vu-thong-bao-lich-nghi-tet-nguyen-dan-dinh-mui-2027-188261010092338947.chn) | Có nguồn, có thể dùng ở chặng 2 |
| T10 | Ý nghĩa tục xông đất. | – | **CẦN NGUỒN** |
| T11 | Mâm cỗ Tết ba miền khác nhau thế nào. | – | **CẦN NGUỒN** |
| T12 | Cảnh giác khi đặt cọc mua xe cũ qua mạng. | – | **CẦN NGUỒN** |
| T13 | Đi xe máy đường dài nên nghỉ giữa chặng. | – | **CẦN NGUỒN** |
| T14 | Thả cá chép ngày ông Táo: không thả túi nilon xuống hồ. | – | **CẦN NGUỒN** |
| T15 | Lừa "đổi điện thoại trợ giá Tết". | – | **CẦN NGUỒN** (v1.2) |

---

## 4. Kết thúc

Kết thúc được chọn theo thứ tự từ trên xuống. Chỉ số về 0 giữa chừng thì kết thúc ngay. Mọi kết thúc đều khép bằng câu **"Dù sao vẫn phải về nhà."**

| Mã | Danh hiệu | Điều kiện | Mô tả nháp |
|---|---|---|---|
| E1 | Bị cả họ unfollow | H = 0 giữa chừng, hoặc H ≤ 15 lúc kết thúc | Nhóm chat gia đình vẫn còn bạn, chỉ là không ai thả tim nữa. |
| E2 | Ngủ gục trước giao thừa | S = 0 giữa chừng | Bạn thức dậy thì đã mùng 2. Không ai trách, chỉ có ảnh bạn ngủ trong nhóm chat. |
| E3 | Cháy ví giữa đường | V = 0 giữa chừng | Bé Dê cho bạn mượn tiền vé. Lãi suất: một nụ cười. |
| E4 | Tết xa nhà | Chọn "ở lại" ở 1.3 và xác nhận | Gọi video với cả nhà lúc giao thừa. Mẹ vẫn cầm máy sai góc. |
| E5 | Suýt thành đôi | ĐT, có `{hop-nhau}` | Cô Hai đã đặt sẵn lịch cho Tết sau. |
| E6 | Ví rỗng tim đầy | V ≤ 20 và H ≥ 60 | Ví mỏng nhưng cả nhà ôm bạn thật chặt. |
| E7 | Cháu ngoan quốc dân | H ≥ 70 | Cả họ khen, riêng bạn thì cần ngủ ba ngày. |
| E8 | Chiến thần né câu hỏi | S ≥ 60 | Không câu nào chạm được bạn. Bin xin học bí kíp. |
| E9 | Về quê sống sót | Mặc định | Không hoàn hảo, nhưng bạn đã về, và năm sau sẽ về nữa. |

---

## 5. Danh sách cảnh 3D và đạo cụ

### 5.1 Cảnh

| Cảnh | Dùng ở chặng | Ghi chú |
|---|---|---|
| Bản đồ Việt Nam thu nhỏ | 0 | Ba "đảo" thành phố, đường phát sáng |
| Văn phòng | 1, 2A | Đổi cửa sổ và thời tiết theo thành phố |
| Phòng KTX + lớp học | 1, 2B | |
| Sảnh tiệc tất niên | 2A | Sân khấu + micro (dùng lại cho quiz) |
| Đường phố ngày Tết | 3 | Một bộ đường phố, ba bộ đạo cụ thành phố |
| Bến xe | 4 | |
| Trong xe giường nằm | 4 | |
| Quốc lộ + trạm dừng chân | 4 | |
| Xe của Thái Gara 99 (bên trong) | 4 | |
| Cổng làng / sân nhà | 4, 5, 8, 9 | Ba biến thể vùng |
| Nhà trên + mâm cỗ + bàn thờ | 6, 7 | Ba thực đơn mâm cỗ |
| Sân đêm giao thừa | 7 | Dùng lại sân nhà, đổi ánh sáng |
| Sân khấu twist (một chùm đèn) | 9 | |
| Phòng trọ ở phố | 9 | |

### 5.2 Đạo cụ mình tự dựng bằng code

Xe máy (kèm cành đào, chậu mai, cây quất, vali), xe khách giường nằm, xe ô tô cũ của Thái Gara 99, xe buýt, gánh xôi, mâm đồng và các món (bánh chưng, bánh tét, giò, xôi gấc, nem, đĩa dưa), bàn thờ, câu đối, phong bao lì xì, thùng xốp, ấm trà, đĩa hạt dưa, TV, đồng hồ đếm ngược, điện thoại (màn hình UI), giỏ quà, cá chép trong túi.

### 5.3 Lấy từ kho CC0 (Kenney, Quaternius; kiểm tra license từng pack)

Nhà phố, đường, cột đèn, cây, xe hơi chung, người có xương + animation (đi, chạy, ngồi, vẫy tay, nhảy), chó.

### 5.4 Nhân vật và dấu hiệu nhận diện

Nhân vật nhại chỉ nhận diện qua trang phục và đạo cụ, không dựng mặt giống người thật.

| Nhân vật | Loại | Dấu hiệu tạo hình | Animation chính |
|---|---|---|---|
| Bé Dê | Gốc | Dê con, khăn quàng đỏ | Nhảy, chỉ tay |
| Mẹ, bố, ông bà | Gốc | Áo len (Bắc) / áo bà ba (Nam) theo vùng | Nấu, vẫy tay, gói đồ |
| Cô Hai, Bác Cả, Chú Ba Ăn Nhậu | Gốc | Màu áo khác nhau, Chú Ba cầm ly | Ngồi, chỉ trỏ, nâng ly |
| Dì Út | Gốc (thêm khi làm chế độ đi lại, chưa có trong kịch bản gốc) | Áo hồng, tóc búi, điện thoại | Đi lang thang, bắn bong bóng câu hỏi theo vai người chơi |
| Bin (Gen Alpha) | Gốc | Tai nghe to, điện thoại | Quay video, nhảy trend |
| Bà Tám Nhóm Chat | Gốc | Điện thoại có gậy selfie | Livestream |
| Chị Chốt Đơn | Gốc | Vòng đèn livestream | Nói nhanh, giơ tay "chốt" |
| Chú Ba Triết Lý | Gốc | Áo sơ mi trắng, dây chuyền, ghế nhựa | Ngồi giảng |
| Thầy Phong Thủy Mạng | Gốc | La bàn to, áo dài the | Xem tay qua màn hình |
| Anh Shipper Tết | Gốc | Áo khoác, thùng hàng chất cao | Lái xe, thở dài |
| **Duy Đèn Cầy** | Nhại | Muỗng như micro, nến phía sau | Review, đọc thơ chậm |
| **Dương Gió Mùa** | Nhại | Gánh xôi, trang phục sặc sỡ | Múa đấm bốc |
| **Thái Gara 99** | Nhại | Sơ mi chủ gara, chùm chìa khóa; ở trạm đội mũ nồi, kính râm | Giới thiệu xe, tạo dáng idol |
| **MC Mít Ướt** | Nhại | Vest lấp lánh, khăn giấy | Nghẹn ngào, lau nước mắt |
| **MC Chớp Nhoáng** (v1.1) | Nhại | Đồng hồ đếm ngược | Nói siêu nhanh |
| **Hoàng Sao Hỏa, Tuấn Tê-Cơ** (v1.2) | Nhại | Áo thi đấu + mũ phi hành gia / vest bi-a | Chọc cơ, bắt tay |
| **Tân Một Tô** (v1.2) | Nhại | Kính, máy ảnh vlog, hoodie | Mở hộp quà |
| **Bà Năm Siêu To** (Mùa Tết) | Nhại | Nồi khổng lồ, tạp dề | Bê nồi |

---

## 6. Yêu cầu với engine (rút ra từ kịch bản)

Engine hiện tại chưa có những thứ sau. Cần thêm trước khi chuyển kịch bản vào JSON:

1. **Cờ (flag):** lựa chọn đặt cờ; scene và kết thúc lọc theo cờ (`{ve-lua}`, `{xe-may}`, `{xem-mat}`, `{hop-nhau}`...).
2. **Kết thúc theo cờ**, không chỉ theo chỉ số (E4, E5).
3. **Lời thoại phụ thuộc lịch sử** cho đoạn twist ở chặng 9.
4. **Biến thể theo thành phố trong cùng một scene** (câu thoại và đạo cụ khác nhau), thay vì tách thành nhiều scene.
5. **Mini-game:** lướt feed (chặng 1), chia lì xì (chặng 8); sau này có quiz (v1.1) và bi-a (v1.2).
6. **Chỉ đạo cảnh 3D trong dữ liệu:** mỗi scene khai báo cảnh, vị trí camera, nhân vật nào làm animation gì, để không phải viết code riêng cho từng đoạn.
7. **Cắt cảnh không có lựa chọn** (đến đầu làng, đếm ngược giao thừa, twist).
8. **Nhánh xác nhận** ("Chắc chưa?") cho kết thúc ẩn E4.

---

## 7. Rà soát an toàn nội dung

| Hạng mục | Cách kịch bản xử lý |
|---|---|
| Rượu bia | Chỉ xuất hiện để từ chối hoặc cảnh báo; không có lựa chọn "uống rồi lái"; Thái Gara 99 nói rõ không uống vì còn lái xe |
| Cờ bạc | Không có đánh bài, bầu cua; bi-a không cá cược, không tiền |
| Pháo | Không có pháo nổ; pháo hoa chỉ chiếu trên TV |
| Ngoại hình, định kiến giới | Luôn đặt là câu kém duyên, có người ngắt lời |
| Dương Gió Mùa | Chỉ xông đất, xôi, "8386", điệu nhảy; **không đụng chuyện gia đình** |
| Duy Đèn Cầy | Chỉ review và thơ chậm; không nhắc các clip từng bị chỉ trích |
| Thái Gara 99 | Không dùng tên hay hình người nổi tiếng khác, không tên phim hay tên gara thật |
| MC Mít Ướt | Chỉ ở đoạn twist; Sao kê Tết ở màn riêng, không cạnh nhau |
| Tân Một Tô | Không tên thương hiệu của gia đình, không đụng vợ con |
| Hoàng Sao Hỏa, Tuấn Tê-Cơ | Vai tích cực, không nhắc tỉ số thua, không cá cược |
| Nền tảng thật | Đổi "Bà Tám Nhóm Zalo" thành "Bà Tám Nhóm Chat"; không dùng logo hay giao diện app thật; "xe ôm công nghệ" thay vì tên hãng |
| Thông tin thật | Chỉ thẻ có nguồn mới lên bản phát hành; ngày tháng tự tính phải kiểm tra lại |

---

## 8. Còn mở

1. **Tỉnh quê cụ thể** của từng thành phố (đang để sau theo ý bạn).
2. **Giọng Trung và Nam:** cần người địa phương duyệt.
3. **Thẻ CẦN NGUỒN:** T10–T15.
4. **Tên thật của bến xe:** kiểm tra lại trước khi dùng.
5. **Độ dài:** cắt hoặc gộp chặng sau playtest nếu vượt 12 phút.
