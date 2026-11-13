# ĐINH MÙI: Kế hoạch các giai đoạn tiếp theo

Ngày 12/11/2026. Thay phần 10 của [06-bao-cao-tong-quan.md](06-bao-cao-tong-quan.md), vì bản đó viết trước khi game chuyển 100% sang 3D. Thiết kế giao diện ở [07](07-thiet-ke-ui-ux.md), lối chơi trước khi về quê ở [08](08-thiet-ke-choi-truoc-que.md).

## 1. Hiện trạng (nhánh `refactor/3d-only`)

Đã có:
- Luồng 3D duy nhất (không còn hộp thoại chat cũ), engine thuần, dữ liệu nội dung trong `src/content/v1.json`, có validator và mô phỏng đường đi.
- 2 chặng chơi được: `cuoi-nam` (văn phòng / lớp học) rồi `san-nha`. Có nhiệm vụ, NPC, đồ vật, sự kiện gọi video, bấm NÉ đúng lúc.
- 9 kết thúc, gồm E4 "Tết xa nhà".
- Nhân vật model có xương CC0 (Quaternius) với hoạt cảnh ngồi đặt vé, với tay nhặt đồ, đi ra cửa. Chó Vàng là Pomeranian trắng chân ngắn (đổi màu và dáng từ model Shiba).
- Giao diện "Đêm Tết": bong bóng hai phía, phím A–D chọn đáp án, chỉ số có mức nguy hiểm / trung bình / tự tin.
- 347 test, CI, typecheck và build đều xanh.

Chưa có: âm thanh, chặng 3–8 (ngoài `cuoi-nam` và `san-nha`), lưu tiến trình, thẻ chia sẻ, đo FPS trên điện thoại thật.

## 2. Các giai đoạn

| GĐ | Nội dung | Điều kiện xong |
|---|---|---|
| A. Kiểm tra bằng mắt | Chụp ảnh thật: chó mới, tư thế ngồi, bong bóng hai phía, HUD ở 360×640 | Không có lỗi hiển thị nào mở. **Xong 13/11** (chụp ở 360×640): nhãn khoảng cách mũi tên bị xuống dòng (sửa `white-space: nowrap`), bảng "Việc cần làm" che bong bóng thoại (ẩn khi đang hội thoại), bong bóng một mình tràn mép phải (thêm `soloSide`, có test) |
| B. Chặng "Ra bến" | Phố Tết, bến xe: đi bộ, NPC bán vé / người chen lấn, mục tiêu riêng | Có `mapId` mới, validator + mô phỏng xanh. **Xong 13/11**: bản đồ `ra-ben` (vỉa hè phố Tết, sạp quà, bác xe ôm chèo kéo bấm NÉ, anh shipper, trạm xe buýt); vùng đi lại `PHO_TET` + test hình học; số liệu quà chỉnh để cân bằng kết thúc không lệch; chạy trọn chặng trên Chrome headless. Chưa làm: băng qua dòng xe (xe chỉ để nhìn, vỉa hè tách khỏi lòng đường) |
| C. Chặng "Đường về" | Cảnh trên xe / tàu, sự kiện gọi video của Mẹ, chỉ số Sức hao dần | Nối đúng sang `san-nha` |
| D. Chặng "Mâm cơm" | Hội thoại đông người, câu hỏi họ hàng dồn dập | Đủ 9 kết thúc đều đạt được bằng mô phỏng |
| E. Âm thanh | Nhạc nền theo chặng, tiếng bước chân, tiếng báo NÉ, nút tắt tiếng | Mặc định chỉ phát sau thao tác đầu tiên của người chơi |
| F. Lưu và chia sẻ | Lưu tiến trình cục bộ, thẻ danh hiệu để chia sẻ | Không lưu dữ liệu nhận dạng cá nhân |
| G. Hiệu năng | Đo FPS trên điện thoại tầm thấp, giảm poly / shadow nếu cần | Ổn định ở mức mục tiêu đã chọn |
| H. Ra mắt | Rà nội dung với chủ dự án, kiểm tra bản quyền model | `public/models/CREDITS.md` đủ nguồn, chỉ CC0 |

Thứ tự đề xuất: A trước, sau đó B → C → D theo mạch truyện; E chạy song song từ sau B; F, G, H làm cuối.

## 3. Việc cần chủ dự án quyết

1. Host registry nội bộ vẫn nằm trong lịch sử git (commit `d344bf9`, đã có trên `origin/main`). Có viết lại lịch sử hay không do IS và chủ repo quyết.
2. Kết thúc E1 còn cần kiểm tra khả năng đạt được bằng mô phỏng; nếu khó đạt thì giữ là kết thúc hiếm hay nới điều kiện?
3. Nguồn nhạc và âm thanh: tự làm hay dùng bộ CC0?
4. Mục tiêu thiết bị tối thiểu cho giai đoạn G.

## 4. Quy ước khi làm tiếp

- Nội dung mới vào `v1.json`, chạy validator và mô phỏng trước khi sửa giao diện.
- Giao diện theo token ở tài liệu 07; popup không che quá 42% chiều cao.
- Model mới chỉ lấy CC0, ghi nguồn vào `public/models/CREDITS.md`.
- Trước khi gộp vào `main`, chạy rà soát bảo mật (skill `security-audit`).
