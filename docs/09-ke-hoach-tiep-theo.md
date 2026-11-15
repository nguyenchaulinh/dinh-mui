# ĐINH MÙI: Kế hoạch các giai đoạn tiếp theo

Ngày 12/11/2026. Thay phần 10 của [06-bao-cao-tong-quan.md](06-bao-cao-tong-quan.md), vì bản đó viết trước khi game chuyển 100% sang 3D. Thiết kế giao diện ở [07](07-thiet-ke-ui-ux.md), lối chơi trước khi về quê ở [08](08-thiet-ke-choi-truoc-que.md).

## 1. Hiện trạng (`main` + nhánh `feature/duong-ve`, 13/11/2026)

Đã có:
- Luồng 3D duy nhất, engine thuần, nội dung trong `src/content/v1.json`, có validator và mô phỏng đường đi.
- **4 chặng chơi được:** `cuoi-nam` (văn phòng / lớp học), `ra-ben` (phố Tết), `tram-dung` (trạm dừng chân trên đường về), `san-nha` (sân nhà). Có nhiệm vụ, NPC, đồ vật, sự kiện gọi video, bấm NÉ đúng lúc.
- 9 kết thúc, gồm E4 "Tết xa nhà". Cân bằng được canh bằng mô phỏng 1500 lượt mỗi vai (`content.test.ts`).
- Nhân vật model có xương CC0 (Quaternius), hoạt cảnh ngồi / với tay / ra cửa, chó Vàng Pomeranian trắng.
- Giao diện "Đêm Tết": bong bóng hai phía, phím A–D, chỉ số có mức, mũi tên chỉ hướng tới việc đang cần làm, góc nhìn rộng hơn cho màn dọc.
- 442 test, CI, typecheck và build đều xanh.

Chưa có: chặng mâm cơm và các chặng từ giao thừa, âm thanh, lưu tiến trình, thẻ chia sẻ, đo FPS trên điện thoại thật, cơ chế băng qua dòng xe.

## 2. Các giai đoạn

| GĐ | Nội dung | Điều kiện xong |
|---|---|---|
| A. Kiểm tra bằng mắt | Chụp ảnh thật: chó mới, tư thế ngồi, bong bóng hai phía, HUD ở 360×640 | Không có lỗi hiển thị nào mở. **Xong 13/11** (chụp ở 360×640): nhãn khoảng cách mũi tên bị xuống dòng (sửa `white-space: nowrap`), bảng "Việc cần làm" che bong bóng thoại (ẩn khi đang hội thoại), bong bóng một mình tràn mép phải (thêm `soloSide`, có test) |
| B. Chặng "Ra bến" | Phố Tết, bến xe: đi bộ, NPC bán vé / người chen lấn, mục tiêu riêng | Có `mapId` mới, validator + mô phỏng xanh. **Xong 13/11**: bản đồ `ra-ben` (vỉa hè phố Tết, sạp quà, bác xe ôm chèo kéo bấm NÉ, anh shipper, trạm xe buýt); vùng đi lại `PHO_TET` + test hình học; số liệu quà chỉnh để cân bằng kết thúc không lệch; chạy trọn chặng trên Chrome headless. Chưa làm: băng qua dòng xe (xe chỉ để nhìn, vỉa hè tách khỏi lòng đường) |
| C. Chặng "Đường về" | Trạm dừng chân giữa quốc lộ (theo [08](08-thiet-ke-choi-truoc-que.md) và [10](10-ban-giao-tien-do.md)): sự kiện trên xe làm hao Sức, Chú Ba Triết Lý chèo kéo "giữ chỗ" (bấm NÉ, bẫy QR gắn thẻ mẹo T06), anh họ bán xe (thẻ T05), mua bánh mì rồi lên xe khách | Nối đúng sang `san-nha`. **Xong 13/11** (nhánh `feature/duong-ve`): bản đồ `tram-dung`, 3 nhân vật, 3 cảnh, thẻ T06, test hình học nối dữ liệu với cảnh 3D, cân bằng kết thúc đo lại (sinh viên E3 ~32%, E8 ~56%; độc thân 27+ E7 ~56%). Cuộc gọi video của Mẹ đã có ở chặng 1 nên không lặp lại. Chưa chạy bằng bot trên trình duyệt |
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
5. `docs/03-cameo.md` đã công khai trên GitHub và ghi họ tên thật gắn với tên nhân vật nhại (xem [10](10-ban-giao-tien-do.md) mục 5): có gỡ và viết lại lịch sử không.

## 3b. Chi tiết hình ảnh (13/11, nhánh `feature/model-cc0`)

Đã làm: 35 model CC0 đồ đạc / cây cối (968 KB), sàn có texture, nhân vật mượt, phụ kiện gắn xương, trang phục theo vai; áp dụng cho lớp học / văn phòng, phố Tết, sân nhà. **Chưa làm:** nhà trên (mâm cơm, chưa có bản đồ), trạm dừng chân (`set-tram-dung.tsx` canh chặt hiệu năng: không `useGLTF`, tối đa 8 thẻ mesh, không shadow map, nên cần thiết kế riêng nếu muốn thêm model), model có texture lớn (cây lớn, hoa nhóm) vì nặng cho điện thoại, bóng đổ thật (chưa đo FPS). Đợt sau (13/11, `feature/canh-quan-chi-tiet`): texture bề mặt vẽ bằng canvas (tường trát có vết ố, cửa cuốn có gân, nhựa đường, gạch lát vỉa hè, `textures.ts` + `TexMat.tsx`), vòm trời chuyển sắc, nhà phố có khung cửa sổ / tường chắn mái / bồn nước / anten, hoa Tết có cành, ruy băng, quả quất (giữ nguyên phần chậu và quả cầu tán mà test sân nhà đọc), xe máy có đèn, chắn bùn, ống xả, chân, tay, kính mũ (giảm số xe 22 -> 14 để không tăng draw call). Đợt nền văn phòng (15/11, `feature/nen-van-phong`): sửa dải nâu ở đáy màn hình (phòng kéo dài thêm 8 m về phía camera, `CUOI_NAM.ext`, tường kéo dài chỉ chặn camera), mặt đất lát gạch thay mảng nâu, tường trái có 3 ô cửa sổ thật nhìn ra phố (vỉa hè, đường có vạch, bụi cây, cột đèn), 4 dãy nhà cao tầng nhiều lớp ở sau và hai bên, chữ treo tường (băng rôn Tết, câu đối, bảng, khẩu hiệu, lịch), bảng ghim, thời khóa biểu / tranh khung, máy lạnh, tủ TV. Cần xem bằng mắt trên máy thật: hướng và cỡ từng món (hướng đo từ hình khối, chưa nhìn), FPS ở phố Tết.

## 4. Tài liệu thiết kế còn thiếu (nên viết trước khi làm)

| Giai đoạn | Thiếu gì | Gợi ý nội dung |
|---|---|---|
| D. Mâm cơm | Chưa có tài liệu thiết kế riêng như 08 | Cơ chế gắp mời, "cả mâm hỏi cùng lúc", bản đồ, nhiệm vụ, kết thúc; cái gì port từ nhánh `wip/chang-3-6-hanh-trinh` ([10](10-ban-giao-tien-do.md) mục 4), cái gì làm mới |
| E. Âm thanh | Mới có đề xuất ở [06](06-bao-cao-tong-quan.md) mục 8.2, lệch với hiện trạng | Danh sách âm (nhạc theo chặng, bước chân, NÉ, chọn đáp án), nguồn CC0 và giấy phép, nút tắt tiếng, quy tắc tự phát chỉ sau thao tác đầu (trình duyệt chặn) |
| F. Lưu và chia sẻ | Chưa có | Lưu gì và ở đâu (chỉ cục bộ, không tên thật), thẻ danh hiệu: kích thước, nội dung, cách chia sẻ |
| G. Hiệu năng | Chưa có mục tiêu số | Thiết bị tối thiểu, FPS mục tiêu, ngân sách draw call / poly mỗi chặng; `npm run perf` đo gì và không đo gì |
| Nội dung | Quy tắc rải rác trong 10 mục 4 | Gom thành checklist: nhân vật nhại (chỉ nhận diện qua trang phục, vai tích cực, có `fallbackId`, không gõ cứng tên trong tiêu đề / nút), thẻ mẹo phải có nguồn, không ghi tên nền tảng thật, đo cân bằng sau mỗi chặng. Đã tóm tắt trong README mục "Thêm nội dung" |

## 5. Quy ước khi làm tiếp

- Nội dung mới vào `v1.json`, chạy validator và mô phỏng trước khi sửa giao diện.
- Giao diện theo token ở tài liệu 07; popup không che quá 42% chiều cao.
- Model mới chỉ lấy CC0, ghi nguồn vào `public/models/CREDITS.md`.
- Trước khi gộp vào `main`, chạy rà soát bảo mật (skill `security-audit`).
