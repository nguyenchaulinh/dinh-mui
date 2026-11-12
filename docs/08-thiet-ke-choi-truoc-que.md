# ĐINH MÙI: Lối chơi các chặng trước khi về quê

Ngày 12/11/2026. Đi kèm [04-script.md](04-script.md) (lời thoại gốc), [05-gameplay.md](05-gameplay.md) (lộ trình), [07-thiet-ke-ui-ux.md](07-thiet-ke-ui-ux.md) (giao diện).

**Vấn đề:** bản chơi được chỉ có sân nhà, và người chơi chỉ làm được 3 việc: nói chuyện, vuốt chó, né bong bóng câu hỏi. Kịch bản đã có văn phòng, trường học, phố Tết, bến xe nhưng chưa có bản đồ.

---

## 1. Bộ "động từ" của người chơi

Mỗi chặng dùng một tổ hợp khác nhau để không lặp lại cảm giác.

| Động từ | Cách chơi | Dữ liệu | Có từ |
|---|---|---|---|
| Nói chuyện | Lại gần NPC, bấm, chọn câu đáp | `npcs[].action: talk` | đã có |
| Vuốt ve / tặng | Lại gần, bấm, một lần | `npcs[].action: pet` | đã có |
| Né câu hỏi / né việc | **Bấm NÉ đúng lúc** (thay cơ chế né bong bóng từ 12/11 tối, theo phản hồi "phiền"): NPC lao tới, băng rôn báo trước 1.6s kèm câu hỏi trên đầu họ và vòng thời gian thu nhỏ; bấm NÉ khi vòng chạm vạch vàng (0.5s cuối) thì né được, bấm sớm hoặc không bấm thì bị kéo vào hội thoại | `npcs[].ambush` | đã có |
| **Dùng đồ vật** | Lại gần máy tính/điện thoại, bấm: mở một mini-game hoặc hội thoại | `objects[].action: talk` | **mới** |
| **Nhặt đồ** | Lại gần đồ có dấu vàng, bấm: đồ biến mất, vào túi | `objects[].action: pickup` | **mới** |
| **Ra cửa** | Cửa ra chỉ mở khi xong việc chính; chưa xong thì báo còn thiếu gì | `objects[].action: exit` + `requires` | **mới** |
| **Sự kiện bất ngờ** | Đủ điều kiện thì tự bật: cuộc gọi video của mẹ, Bé Dê hỏi lại "Chắc chưa?" | `events[]` | **mới** |
| **Lướt feed** | Hội thoại hiển thị như điện thoại: chọn bài đăng để mua vé (thật hay lừa) | `scenes[].ui: feed` | **mới** |

Mọi hành động sinh cờ riêng của bản đồ (`talked:<bản đồ>:<ai>`, `used:<bản đồ>:<đồ>`, `picked:...`, `dodged:<bản đồ>:<n>`, `event:...`) để nhiệm vụ dựa vào; tổng số câu né được cộng dồn cả hành trình (`dodged:3`, `dodged:5`, `dodged:8`).

**NPC và mục tiêu theo vai:** một bản đồ có thể có NPC chỉ xuất hiện với một số vai (văn phòng có Sếp, lớp học có Cô chủ nhiệm), và mục tiêu nhiệm vụ cũng vậy.

---

## 2. Hành trình 3D

| # | Chặng | Bản đồ | Trạng thái |
|---|---|---|---|
| 1 | **Cuối năm ở phố** (gộp "Săn vé" + "Tất niên" của kịch bản) | Văn phòng (mới đi làm, độc thân 27+) hoặc lớp học (sinh viên), cùng mặt bằng | **làm đợt này** |
| 2 | Ra bến | Phố Tết 28 tháng Chạp: mua quà, băng qua dòng xe chở đào/mai, gọi xe | kế tiếp (đã có cảnh 3D, cần vùng đi lại) |
| 3 | Đường về | Bến xe / trạm dừng chân: Chú Ba Triết Lý livestream, Thái Gara 99 | sau |
| 4 | Bước vào nhà | Sân nhà quê | đã có |
| 5 | Mâm cơm tất niên | Nhà trên: gắp mời, "cả mâm hỏi cùng lúc" | sau (đã có cảnh 3D) |
| 6–8 | Giao thừa, Mùng 1, Quay lại phố | Sân đêm, cổng nhà, twist góc nhìn của mẹ | sau |

Chặng 2–3 chưa có thì thẻ chặng "Bước vào nhà" nói ngắn chuyến đi ("Một chuyến xe dài sau...").

---

## 3. Chặng 1: Cuối năm ở phố

**Bối cảnh:** chiều cuối năm. Mới đi làm / độc thân 27+: tầng văn phòng có cây quất, đèn lồng. Sinh viên: lớp học buổi cuối trước Tết, bàn liên hoan bánh kẹo. Cùng một mặt bằng 12 × 10 m (dàn cảnh hở phía trước để camera không bị tường che), cửa ra ở tường phải.

### Mặt bằng (nhìn từ trên, trục z hướng xuống)

```
 z=-5  ┌───────────── tường sau (bảng trắng / bảng đen) ─────────────┐
       │ [quất]                       [bàn sếp / bàn giáo viên] [quầy │
       │  [bàn 1][bàn 2]                                        pha  │
       │                                    Sếp/Cô               cà  │
       │                                                Tú      phê] │
       │  [bàn 3][bàn CỦA BẠN: máy tính]                             │
       │   Thu/Lớp trưởng                                    [móc áo]│
       │                                                          CỬA│→ ra về
       │ [đào]                 (bạn xuất phát)                       │
 z=+5  └──────────────────────── (hở) ──────────────────────────────┘
      x=-6                                                        x=+6
```

### Nhân vật

| NPC | Vai có mặt | Hành vi | Tương tác |
|---|---|---|---|
| Tú (đồng nghiệp / bạn cùng lớp) | mọi vai | đứng cạnh quầy | "Mua vé Tết chưa?" (kịch bản 1.1) |
| Sếp | đi làm | đi lang thang, **lao tới giao "việc gấp"** ("Làm nốt slide nhé!"), bấm NÉ đúng lúc | Nói chuyện: "Thưởng Tết vừa lòng chưa?" (2A.1). Bị bắt: bị nhờ làm thêm |
| Chị Thu (kế toán) | đi làm | đứng cạnh bàn 3 | "Lì xì con sếp bao nhiêu?" (2A.3) |
| Cô chủ nhiệm | sinh viên | đứng ở bàn giáo viên | "Ra trường em định làm gì?" (2B.1) |
| Lớp trưởng | sinh viên | đi lang thang, **lao tới đòi "góp tiền!"**, bấm NÉ đúng lúc | "Góp tiền mua mâm cúng ông Táo" (2B.2). Bị bắt: bị đòi tiền liên hoan |

### Đồ vật

| Đồ | Hành động | Kết quả |
|---|---|---|
| Máy tính trên bàn của bạn | **Săn vé**: feed 6 bài đăng (1 trang chính thức, 4 lừa đảo theo kịch bản 1.2, 1 "để mai tính") | Vé thật: Ví −10. Lừa: Ví −15..−20, Sức −5..−10, thẻ mẹo T01/T02 có nguồn |
| Sạc điện thoại, hộp bánh biếu mẹ, áo ấm | **Nhặt** (dấu vàng xoay trên đầu) | Nhiệm vụ "Thu dọn đồ" |
| Cửa ra | **Ra về**, chỉ mở khi đã săn vé, thu dọn đồ và nghe máy mẹ | Xong chặng |

### Sự kiện

1. Săn vé xong → **Bé Dê hỏi "Về bằng gì?"**: xe khách (chỉ khi có vé thật) / tự chạy xe máy (Ví +5) / ra bến rồi tính. Bị lừa thì Bé Dê nói thêm "Vé không có, tiền cọc cũng không."
2. Chọn cách về xong → **Mẹ gọi video** (thẻ cuộc gọi đến, nút Nghe), kịch bản 1.3: mẹ cầm máy quá gần.
3. Nếu trả lời **"Năm nay con ở lại làm thêm"** → Bé Dê hỏi **"Chắc chưa?"**. Xác nhận thì game kết thúc ngay với **E4 "Tết xa nhà"** (kết thúc ẩn của kịch bản gốc). Không xác nhận thì chơi tiếp.

### Nhiệm vụ

| Nhiệm vụ | Mục tiêu | Thưởng |
|---|---|---|
| Săn vé về quê | Dùng máy tính | |
| Thu dọn đồ | Nhặt đủ 3 món | Sức +5 |
| Chào mọi người trước Tết | Nói chuyện với Tú, Sếp và chị Thu (đi làm) / Tú, Cô và Lớp trưởng (sinh viên) | Hòa khí +6 |
| Né việc phút chót (tuỳ chọn) | Né 3 lần | Sức +5 |
| **Lên đường về quê** (đích) | Săn vé + thu dọn đồ + ra cửa | |

---

## 4. Kỹ thuật (đợt này)

- Schema: `RoamMap.objects`, `RoamMap.events`, `RoamMap.variantByPersona`, `MapNpc.personas`, `Objective.personas`, `Scene.ui: 'feed'`, `Choice.author`, `GameState.playerName`, `GameState.dodges`. Câu thoại dùng `{ten}` để chèn tên người chơi.
- Validate: đồ vật trỏ vị trí có thật, sự kiện trỏ scene có thật, cờ đúng bản đồ, mỗi vai đều có đủ NPC/scene, `{...}` chỉ được là `{ten}`.
- Vùng đi lại mới `cuoi-nam` (vật cản khớp hình học), test: chỗ xuất phát, NPC, đồ vật đều không nằm trong vật cản và với tới được.
- Mô phỏng nội dung chạy qua **cả hành trình** (chặng 1 rồi sân nhà) với mọi vai, để kiểm tra kết thúc.
