# ĐINH MÙI: Thiết kế UI/UX (bản 2: "Đêm Tết")

Ngày 12/11/2026. Thay bản 1 ("Tết giấy đỏ") sau phản hồi: nhân vật quá đơn giản, popup quá to, né bong bóng câu hỏi gây phiền. Code theo tài liệu này: `src/styles.css`, `src/game/roam.css`, `src/ui/ui.tsx`.

## 0. Tham khảo: Một Ngày Làm Chó (Golden Sea Studios)

Đã đọc case study, trang game và xem 6 ảnh chụp trong game ([case study](https://goldenseastudios.com/portfolio/mot-ngay-lam-cho), [trang game](https://goldenseastudios.com/en/chosimulator), [GateGame](https://gategame.net/mot-ngay-lam-cho-pha-an-hay-gianh-cot-dien/), [AFKMobi](https://afkmobi.com/mot-ngay-lam-cho-game-mo-phong-cuoc-song-dong-vat-hai-huoc.html)).

| Họ làm | Mình áp dụng |
|---|---|
| Three.js; người và chó là model có xương (tự làm + AI tạo, rig tự động bằng Blender), có texture, tỉ lệ gần người thật | Model CC0 có xương của Quaternius (đổi màu áo/tóc/da theo nhân vật), hoạt ảnh Idle/Walk/Run/Wave/Talk |
| HUD kính tối trong mờ, gọn; 4 thanh trạng thái có nhãn in hoa nhỏ | HUD kính tối, 3 thanh nhỏ có nhãn HÒA KHÍ / SỨC / VÍ |
| "VIỆC HÔM NAY 0/7" mở/thu ngay góc trái | "VIỆC CẦN LÀM" mở sẵn dưới HUD, tối đa 5 dòng |
| Lời thoại là bong bóng nhỏ trên đầu nhân vật | Bong bóng trên đầu NPC và người chơi; dock đáy chỉ còn lựa chọn |
| Nút hành động có nhãn, nút nên bấm sáng vàng | Nút hành động có nhãn theo ngữ cảnh (NÓI CHUYỆN, NHẶT, NÉ!), sáng vàng khi có thứ để bấm |
| Còi báo "⚠ NÓ ĐẾN RỒI! CHUẨN BỊ NÉ!" rồi bấm NÉ đúng lúc; chữ nổi "NÉ ĐƯỢC!" | Thay hẳn cơ chế né bong bóng bằng bấm NÉ đúng lúc (xem 08) |

## 1. Nguyên tắc

- **Cảnh 3D là nhân vật chính.** Giao diện nhỏ, nằm ở mép màn hình, trong mờ. Không phần nào che quá 42% chiều cao màn hình (feed điện thoại tối đa 56%).
- **Kính tối + chữ kem + vàng lì xì.** Mọi lớp dùng chung kiểu kính tối (`--glass`), viền mảnh sáng, chữ kem; vàng cho điểm nhấn/việc chính; đỏ Tết cho nút chính và cảnh báo.
- **Lời nói gắn với người nói.** Ai đang đứng trong cảnh thì lời của họ là bong bóng trên đầu họ. Người không có mặt (Bé Dê dẫn chuyện, Mẹ gọi điện, máy tính) thì lời nằm trong dock. **Hai người cùng nói thì hai bong bóng bung ra hai phía ngược nhau** kiểu truyện tranh (ai bên trái màn hình bung sang trái, đuôi chỉ về người nói), nên câu bạn vừa chọn và lời NPC đáp hiện cùng lúc mà không đè nhau (`src/game/speech.ts`, có test).
- **Một màn, một việc.** Mở game chỉ có ô nhập tên; vai và thành phố bốc ngẫu nhiên.

## 2. Token

| Nhóm | Token | Giá trị |
|---|---|---|
| Kính | `--glass` / `--glass-strong` | `rgb(22 14 10 / .68)` / `.86`, blur 8px, viền `rgb(255 246 229 / .14)` |
| Chữ | `--cream` / `--cream-soft` | `#fff6e5` / 72% |
| Nhấn | `--gold` / `--red` | `#f6c343` / `#d9363e` |
| Tốt / xấu | `--good` / `--bad` | `#3fb36b` / `#e5484d` |
| Chỉ số | `--harmony` / `--stamina` / `--wallet` | `#ff5f86` / `#4cd47b` / `#ffc23d` (biểu tượng) |
| Mức chỉ số | `--lv-danger` / `--lv-medium` / `--lv-confident` | `#ff4d4f` / `#ffb020` / `#3fd17a` (thanh, con số) |
| Kiểu đáp | `--kheo` / `--that-tha` / `--lay` / `--phan-don` | ngọc / xanh trời / vàng / đỏ |
| Cỡ chữ | `--fs-xs/s/m/l/xl` | 11 / 13 / 15 / 18 / 22 px |
| Bo góc | `--r-s/m/l` | 8 / 12 / 16 px |
| Lớp | `--z-hud/dock/qte/modal/toast` | 10 / 20 / 25 / 30 / 40 |

## 3. Bố cục màn chơi (điện thoại dọc)

```
┌──────────────────────────────┐
│┌Lan · Sinh viên · Hà Nội┐ (⏸)│  HUD kính tối + nút tạm dừng viền vàng
││♥━━  ⚡━━  ✉━━           │    │
│└────────────────────────┘    │
│┌VIỆC CẦN LÀM      1/5 ▴┐     │  mở sẵn, tối đa 5 dòng, việc chính màu vàng
││• Săn vé  • Nhặt sạc ...│     │
│└────────────────────────┘    │
│      ⚠ SẾP ĐANG TỚI! CHUẨN BỊ NÉ!   băng rôn đỏ
│         ╭──────────╮          │
│         │ Họp 5 phút │  ← bong bóng trên đầu Sếp (viền đỏ khi lao tới)
│              🧍               │
│            ( NÉ! )            │  vòng thời gian thu nhỏ, chạm vạch vàng thì bấm
│ (joystick)          (NÓI CHUYỆN)│  nút hành động có nhãn theo ngữ cảnh
└──────────────────────────────┘
Nói chuyện: bong bóng của NPC trên đầu họ; dock đáy (≤ 42%) chỉ có 3-4 lựa chọn gọn, 2 cột trên màn rộng.
```

## 4. Thành phần

| Thành phần | Class | Ghi chú |
|---|---|---|
| HUD | `.hud`, `.meters` | Tên (vàng), vai · thành phố, 3 thanh nhỏ có **con số điểm còn lại**. Màu thanh theo mức (`statLevel` trong labels.ts): **nguy hiểm ≤ 25** đỏ, rung giật + quầng đỏ nhấp nháy; **trung bình 26-59** vàng cam; **tự tin ≥ 60** xanh lá. Biểu tượng giữ màu riêng của chỉ số. Tắt rung khi `prefers-reduced-motion` (màu đỏ vẫn còn) |
| Việc cần làm | `.tasks` | Thu/mở; việc của nhiệm vụ đích lên đầu, màu vàng |
| Bong bóng thoại | `.speech` (drei `Html`) | Nền trắng, tên màu áo, tối đa 230px; `.speech-alert` viền đỏ rung khi lao tới hỏi |
| Dock lựa chọn | `.dock`, `.opt` | Tối đa 42% chiều cao; nhãn phím (A, B, C, D) và nhãn kiểu đáp màu ở đầu dòng; phím A–D hoặc 1–4 chọn không cần chuột. Sau khi chọn: câu của bạn (trên đầu bạn) và lời NPC đáp hiện cùng lúc, hai phía ngược nhau; dock chỉ còn nút Tiếp nổi (thêm thẻ mẹo nếu có) |
| Thẻ mẹo | `.tip` | Nền vàng, chữ mực, ghi nguồn |
| Điện thoại | `.phone` | Rộng tối đa 340px, cao tối đa 56%, cuộn bên trong |
| Cuộc gọi đến | `.callcard` | Thẻ nhỏ trên cùng, nút Nghe xanh |
| Bấm NÉ | `.banner-warn`, `.qte` | Băng rôn đỏ + vòng thời gian + nút NÉ! tròn đỏ viền vàng |
| Chữ nổi | `.flash` | "NÉ ĐƯỢC!" vàng / "SỚM QUÁ!", "BỊ BẮT RỒI!" đỏ, viền mực, tự tắt 1.1s |
| Nút tương tác | `.prompt`, `.roam-action` | Pill kính tối viền vàng; nút tròn sáng vàng khi có thứ để bấm |
| Thẻ nổi | `.modal` | Rộng tối đa 320px, kính tối đậm, tiêu đề vàng 20-22px |

## 5. Luồng màn hình

Không đổi so với bản 1: mở game (thẻ nhập tên trên cảnh chặng 1) → thẻ chặng → chơi → thẻ chặng kế → thẻ danh hiệu. Tên người chơi 1-16 ký tự, không lưu.

## 6. Trợ năng

Vùng chạm ≥ 40px (nút NÉ 74px), viền focus vàng, toast/dock `aria-live`, băng rôn NÉ `role="alert"`, thanh chỉ số `role="meter"`, tắt chuyển động khi `prefers-reduced-motion`.
