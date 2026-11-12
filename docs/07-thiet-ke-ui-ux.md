# ĐINH MÙI: Thiết kế UI/UX

Ngày 12/11/2026. Áp dụng cho mọi màn hình của game. Code theo tài liệu này: `src/styles.css` (token + thành phần), `src/ui/` (component dùng chung).

**Vấn đề trước đây:** mỗi màn tự đặt kiểu (màn chọn vai là trang web trắng, màn chơi là lớp phủ đen mờ, khung thoại màu kem, nút đỏ viền mỏng...). Không có hệ thống, nên "mạnh chỗ nào thiết kế chỗ đấy". Màn chọn vai/vùng có 7 nút trước khi được chơi.

---

## 1. Ý tưởng chung: "Tết giấy đỏ, đồ chơi gỗ"

- **Cảnh 3D luôn là nền.** Không có trang web trắng nào. Mọi màn (mở đầu, nhập tên, thẻ chặng, kết thúc, tạm dừng) là **thẻ nổi giữa màn hình** trên cảnh 3D đã làm mờ và tối nhẹ.
- **Chất liệu:** giấy kem dày (thẻ, khung thoại), đỏ Tết (hành động chính), vàng lì xì (điểm nhấn, phần thưởng), mực nâu đen (chữ). Viền dày và bóng đổ cứng phía dưới cho cảm giác đồ chơi, hợp với nhân vật low-poly.
- **Ít chữ, nhiều tín hiệu:** biểu tượng + màu cho chỉ số, kiểu đáp có màu riêng, thông báo ngắn.
- **Điện thoại trước:** thiết kế cho màn 390×844, tay cái. Máy tính dùng cùng bố cục, giới hạn bề ngang thẻ.

---

## 2. Token

| Nhóm | Token | Giá trị | Dùng cho |
|---|---|---|---|
| Màu chính | `--red` / `--red-dark` | `#c0262d` / `#8f1b20` | Nút chính, tiêu đề, viền nhấn |
| Điểm nhấn | `--gold` / `--gold-dark` | `#f5b82e` / `#b7791f` | Viền nút chính, thưởng, focus |
| Giấy | `--paper` / `--paper-2` | `#fff8ec` / `#fdecc8` | Nền thẻ, khung thoại / nền phụ |
| Mực | `--ink` / `--ink-soft` | `#2a1a12` / `#6b5446` | Chữ chính / chữ phụ |
| Màn phủ | `--scrim` | `rgb(42 26 18 / 0.45)` + blur 6px | Làm mờ cảnh sau thẻ nổi |
| Tốt / xấu / tin | `--good` / `--bad` / `--info` | `#2f855a` / `#c0262d` / `#2b6cb0` | Toast, chỉ số tăng/giảm |
| Chỉ số | `--harmony` / `--stamina` / `--wallet` | `#e0436b` / `#2f9e5f` / `#e0a21b` | Thanh Hòa khí / Sức / Ví |
| Kiểu đáp | `--kheo` / `--that-tha` / `--lay` / `--phan-don` | xanh ngọc / xanh trời / vàng / đỏ | Nhãn trên lựa chọn |
| Chữ | `--font` | system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif | Không tải font ngoài (nhanh, không gọi mạng) |
| Cỡ chữ | `--fs-xs/s/m/l/xl` | 12 / 14 / 16 / 20 / 28 px | |
| Bo góc | `--r-s/m/l/pill` | 10 / 16 / 22 / 999 px | |
| Viền | `--line` | 2px solid `rgb(42 26 18 / 0.14)` | Thẻ, ô nhập |
| Bóng | `--lift` | `0 4px 0 rgb(42 26 18 / 0.18), 0 10px 24px rgb(0 0 0 / 0.18)` | Thẻ nổi, nút |
| Khoảng cách | `--s-1..6` | 4 / 8 / 12 / 16 / 24 / 32 px | |
| Chuyển động | `--t-fast` / `--t` | 120ms / 220ms ease-out | Tắt khi `prefers-reduced-motion` |
| Lớp | `--z-hud` / `--z-sheet` / `--z-modal` / `--z-toast` | 10 / 20 / 30 / 40 | Thứ tự chồng lớp cố định |

---

## 3. Thành phần

| Thành phần | Mô tả | Ghi chú |
|---|---|---|
| **Nút chính** `.btn` | Nền đỏ, chữ giấy, viền dưới vàng đậm 4px (nút đồ chơi), nhấn thì lún 2px | Cao tối thiểu 48px |
| **Nút phụ** `.btn.btn-ghost` | Nền giấy, viền mực nhạt | "Để sau", "Tiếp tục" |
| **Nút tròn** `.icon-btn` | 44×44, nền giấy, biểu tượng | Tạm dừng, nhiệm vụ |
| **Thẻ nổi** `.modal` | Giữa màn hình, rộng tối đa 360px, nền giấy, bo 22, bóng `--lift`; màn phủ mờ phía sau | Mở đầu, nhập tên, thẻ chặng, kết thúc, tạm dừng |
| **Khung thoại** `.sheet` | Bám đáy, cao tối đa 55%, bo trên 22, nền giấy | Nói chuyện, phản ứng, thẻ mẹo |
| **Bảng tên người nói** `.nameplate` | Pill màu theo áo của nhân vật + vai trò | Nhận ra ai đang nói |
| **Lựa chọn** `.option` | Thẻ giấy, nhãn kiểu đáp có màu ở góc, chữ to 16px | Không hiện hiệu ứng chỉ số (giữ bất ngờ) |
| **Lời của bạn** `.said` | Bong bóng phải, ghi tên người chơi | Hiện câu bạn vừa chọn trước phản ứng của NPC |
| **Thẻ mẹo** `.tip` | Giấy vàng, nhãn "Mẹo thật", nguồn ở cuối | Chỉ thẻ có nguồn |
| **HUD** `.hud` | Góc trên trái: tên + "vai · thành phố", 3 thanh chỉ số có biểu tượng | Thanh tự vẽ (không dùng `<meter>` vì mỗi trình duyệt vẽ một kiểu) |
| **Thanh nhiệm vụ** `.quest-btn` + `.quest-panel` | Góc trên phải "Nhiệm vụ 1/4"; bấm mở thẻ danh sách | Mục tiêu xong gạch ngang |
| **Toast** `.toast` | Giữa trên, pill, tự tắt; màu theo tốt/xấu/tin | "Né được!", "Nhận: Sạc điện thoại" |
| **Nút tương tác** `.prompt` | Pill giữa dưới, "[E] Nói chuyện · Cô Hai"; chạm được | Ẩn khi đang hội thoại |
| **Joystick / nút hành động** | Đế giấy trong mờ, núm đỏ; nút hành động tròn đỏ viền vàng | Chỉ hiện trên màn cảm ứng |
| **Điện thoại** `.phone` | Khung điện thoại trong khung thoại, các bài đăng là thẻ | Mini-game săn vé |
| **Cuộc gọi đến** | Thẻ nổi có ảnh đại diện, "Mẹ đang gọi video...", nút Nghe | Sự kiện theo kịch bản |

**Biểu tượng chỉ số** vẽ bằng SVG nội tuyến: tim (Hòa khí), tia sét (Sức), bao lì xì (Ví). Không dùng emoji (mỗi máy vẽ một kiểu).

---

## 4. Bố cục màn chơi (điện thoại dọc)

```
┌───────────────────────────────┐
│ [Tên · SV · Hà Nội]  [NV 1/4][⏸]│  ← HUD trái, nút phải (z-hud)
│ ♥ ███████░░  ⚡ █████░░  ✉ ███░  │
│         ( Né được! (2) )        │  ← toast giữa trên (z-toast)
│                                 │
│          CẢNH 3D                │
│                                 │
│     [E] Nói chuyện · Cô Hai     │  ← nút tương tác giữa dưới
│ (joystick)            (Tương tác)│
└───────────────────────────────┘
Khi nói chuyện: khung thoại (sheet) bám đáy che tới 55%, camera dựng khung hai người ở nửa trên.
```

---

## 5. Luồng màn hình

1. **Mở game:** cảnh chặng 1 dựng sẵn làm nền (nhân vật đứng yên). Thẻ nổi giữa: tên game, câu dẫn, **bối cảnh bốc ngẫu nhiên** ("Năm nay bạn là **Sinh viên năm cuối**, học ở **Hà Nội**. Tết này phải về quê."), ô **"Bạn tên gì?"**, nút **"Lên đường"**. Một màn, một ô nhập, một nút.
2. **Thẻ chặng:** "Chặng 1 · Cuối năm ở phố", 1–2 câu bối cảnh, danh sách việc cần làm, nút "Vào cảnh".
3. **Chơi:** HUD + điều khiển. Hội thoại ở khung thoại đáy. Sự kiện (cuộc gọi, câu hỏi bất ngờ) bật thẻ nổi.
4. **Xong chặng:** thẻ "Xong chặng!" kèm thay đổi chỉ số, nút "Đi tiếp" sang thẻ chặng kế.
5. **Kết thúc:** thẻ nổi trên cảnh cuối: "Danh hiệu Tết của {tên}", tên danh hiệu, mô tả, 3 chỉ số cuối, nút "Chơi lại" (giữ tên, bốc lại bối cảnh).
6. **Tạm dừng** (nút ⏸): "Tiếp tục" / "Chơi lại từ đầu".

**Bối cảnh ngẫu nhiên:** vai (sinh viên năm cuối / mới đi làm / độc thân 27+) và thành phố (Hà Nội / Đà Nẵng / Sài Gòn) bốc bằng số ngẫu nhiên của trình duyệt. Không có màn chọn.

**Tên nhân vật:** 1–16 ký tự, chỉ chữ cái (kể cả tiếng Việt có dấu), chữ số, khoảng trắng và `-'.`; cắt khoảng trắng thừa; sai thì báo ngay dưới ô nhập, nút "Lên đường" mờ. Dùng ở: HUD, bong bóng "lời của bạn", một số câu thoại có chỗ `{ten}` (ví dụ Bà Tám: "Cả nhà ơi, {ten} về rồi nè!"), thẻ danh hiệu. **Không lưu** tên (đúng nguyên tắc không lưu dữ liệu người chơi); tải lại trang thì nhập lại.

---

## 6. Trợ năng và cảm giác

- Vùng chạm tối thiểu 44×44; chữ thoại 16px; tương phản chữ/nền đạt AA.
- Viền focus vàng 3px cho bàn phím; Enter ở ô tên = "Lên đường"; Esc đóng bảng nhiệm vụ/tạm dừng.
- Toast và khung thoại có `aria-live="polite"`; thanh chỉ số có `role="meter"` và giá trị.
- `prefers-reduced-motion`: tắt hiệu ứng trượt/nảy.
- Mọi sự kiện quan trọng có chữ (không chỉ dựa vào màu hay âm thanh sau này).

---

## 7. Chưa làm ở đợt này

Âm thanh (thiết kế ở báo cáo 06 mục 8), thẻ chia sẻ danh hiệu, lưu tiến độ, chế độ màn ngang tối ưu riêng.
